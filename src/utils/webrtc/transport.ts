import { Device } from "mediasoup-client";
import { state } from "./state";
import { getCurrentRoomId } from "./state";

// Track transport creation to prevent race conditions
let isSendTransportCreating = false;
let isRecvTransportCreating = false;

// Helper function to safely close a transport
const safelyCloseTransport = (transport: any, transportType: string): void => {
  if (!transport) return;

  try {
    // First check if the transport has an await queue and safely stop it
    if (transport._awaitQueue) {
      try {
        // Check if the queue is already stopped
        if (
          typeof transport._awaitQueue.isStopped === "function" &&
          !transport._awaitQueue.isStopped()
        ) {
          console.log(
            `[WEBRTC] Safely stopping ${transportType} transport await queue before closing`,
          );
          transport._awaitQueue.stop();
        }
      } catch (queueError) {
        console.warn(
          `[WEBRTC] Error stopping ${transportType} transport queue:`,
          queueError,
        );
        // Continue with closing the transport
      }
    }

    // Small delay to ensure queue operations are complete
    setTimeout(() => {
      try {
        // Now close the transport
        if (!transport.closed) {
          console.log(`[WEBRTC] Closing ${transportType} transport`);
          transport.close();
        } else {
          console.log(`[WEBRTC] ${transportType} transport already closed`);
        }
      } catch (closeError) {
        console.error(
          `[WEBRTC] Error closing ${transportType} transport:`,
          closeError,
        );
      }
    }, 100);
  } catch (error) {
    console.error(
      `[WEBRTC] Unhandled error in safelyCloseTransport for ${transportType}:`,
      error,
    );
  }
};

/**
 * Create WebRTC send transport
 */
export async function createSendTransport(roomId: string): Promise<void> {
  // Check if we're already creating a send transport to prevent race conditions
  if (isSendTransportCreating) {
    console.log(
      "[WEBRTC] Send transport creation already in progress, waiting...",
    );
    // Wait for the existing creation to finish
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // If the transport was successfully created while we were waiting, return
    if (state.sendTransport) {
      console.log(
        "[WEBRTC] Send transport was created while waiting, using existing transport",
      );
      return;
    }
  }

  // Set flag to indicate we're creating a transport
  isSendTransportCreating = true;

  try {
    // Check if socket and device are initialized, with retry logic
    if (!state.socket || !state.device) {
      console.log(
        "[WEBRTC] Socket or device not initialized, attempting to recover",
      );

      // Try to recover the socket connection if needed
      if (!state.socket) {
        console.log("[WEBRTC] Socket is missing, attempting to reconnect");
        try {
          // Import socket modules
          const callSocketModule = await import("@/lib/callSocket");
          const socketModule = await import("@/lib/socket");
          const { useAuthStore } = await import("@/stores/authStore");

          const token = useAuthStore.getState().accessToken;
          if (!token) {
            console.warn("[WEBRTC] No token available for socket recovery");
            throw new Error(
              "Socket not initialized and no token available for recovery",
            );
          }

          // Set up main socket first
          console.log("[WEBRTC] Setting up main socket for recovery");
          socketModule.setupSocket(token);

          // Then ensure call socket is initialized
          console.log("[WEBRTC] Ensuring call socket for recovery");
          const callSocket = await callSocketModule.ensureCallSocket(true);

          if (callSocket) {
            console.log("[WEBRTC] Successfully recovered call socket");
            state.socket = callSocket;

            // Wait a moment for the socket to stabilize
            await new Promise((resolve) => setTimeout(resolve, 1000));
          } else {
            throw new Error("Failed to recover socket connection");
          }
        } catch (socketError) {
          console.error("[WEBRTC] Socket recovery failed:", socketError);
          throw new Error("Socket not initialized and recovery failed");
        }
      }

      // Try to recover the device if needed
      if (!state.device) {
        console.log("[WEBRTC] Device is missing, attempting to recreate");
        try {
          const { Device } = await import("mediasoup-client");
          state.device = new Device();
          console.log("[WEBRTC] Successfully created new device");

          // Check if we have stored RTP capabilities
          const storedCapabilities = sessionStorage.getItem("rtpCapabilities");
          if (storedCapabilities) {
            try {
              const capabilities = JSON.parse(storedCapabilities);
              console.log(
                "[WEBRTC] Loading device with stored RTP capabilities",
              );
              await state.device.load({ routerRtpCapabilities: capabilities });
              console.log(
                "[WEBRTC] Successfully loaded device with stored capabilities",
              );
            } catch (loadError) {
              console.error(
                "[WEBRTC] Error loading device with stored capabilities:",
                loadError,
              );
              throw new Error(
                "Device recovery failed: could not load with stored capabilities",
              );
            }
          } else {
            throw new Error(
              "Device recovery failed: no stored RTP capabilities",
            );
          }
        } catch (deviceError) {
          console.error("[WEBRTC] Device recovery failed:", deviceError);
          throw new Error("Device not initialized and recovery failed");
        }
      }

      // Final check after recovery attempts
      if (!state.socket || !state.device) {
        throw new Error(
          "Socket or device not initialized after recovery attempts",
        );
      }
    }

    // Safely close existing transport if it exists
    if (state.sendTransport) {
      console.log(
        "[WEBRTC] Send transport already exists, safely closing it before creating a new one",
      );
      safelyCloseTransport(state.sendTransport, "send");
      state.sendTransport = null;

      // Small delay to ensure the transport is fully closed
      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    return new Promise((resolve, reject) => {
      // Add a timeout for createWebRtcTransport
      const timeout = setTimeout(() => {
        reject(new Error("Timeout creating send transport"));
      }, 10000);

      state.socket!.emit(
        "createWebRtcTransport",
        { roomId, direction: "send" },
        async (response: any) => {
          clearTimeout(timeout);

          if (response.error) {
            reject(new Error(response.error));
            return;
          }

          try {
            if (!response.params) {
              reject(new Error("No transport parameters received from server"));
              return;
            }

            state.sendTransport = state.device!.createSendTransport(
              response.params,
            );

            // Handle transport events
            state.sendTransport.on(
              "connect",
              ({ dtlsParameters }: any, callback: Function) => {
                console.log("Send transport connect event triggered");

                // Add a timeout for connectWebRtcTransport
                const connectTimeout = setTimeout(() => {
                  console.error("Timeout connecting send transport");
                  callback(); // Call the callback anyway to avoid hanging
                }, 10000);

                // Add retry mechanism
                let retryCount = 0;
                const maxRetries = 3;

                const attemptConnect = () => {
                  console.log(
                    `[WEBRTC] Attempting to connect send transport (attempt ${retryCount + 1}/${maxRetries + 1})`,
                  );

                  state.socket!.emit(
                    "connectWebRtcTransport",
                    {
                      roomId,
                      direction: "send",
                      dtlsParameters,
                    },
                    (response: any) => {
                      if (response.error) {
                        console.error(
                          "Error connecting send transport:",
                          response.error,
                        );

                        // Retry if we haven't reached max retries
                        if (retryCount < maxRetries) {
                          retryCount++;
                          console.log(
                            `[WEBRTC] Retrying send transport connection (${retryCount}/${maxRetries})`,
                          );
                          setTimeout(attemptConnect, 1000); // Retry after 1 second
                        } else {
                          console.error(
                            "[WEBRTC] Max retries reached for send transport connection",
                          );
                          clearTimeout(connectTimeout);
                          callback(); // Call callback to avoid hanging
                        }
                      } else {
                        console.log(
                          "[WEBRTC] Send transport connected successfully",
                        );
                        clearTimeout(connectTimeout);
                        callback();
                      }
                    },
                  );
                };

                attemptConnect();
              },
            );

            state.sendTransport.on(
              "produce",
              ({ kind, rtpParameters, appData }: any, callback: Function) => {
                console.log(`Producing ${kind}`);

                // Add a timeout for produce
                const produceTimeout = setTimeout(() => {
                  console.error("Timeout producing media");
                  callback({ id: `timeout-${Date.now()}` }); // Generate a fake ID to avoid hanging
                }, 5000);

                state.socket!.emit(
                  "produce",
                  {
                    roomId,
                    kind,
                    rtpParameters,
                    appData,
                  },
                  (response: any) => {
                    clearTimeout(produceTimeout);

                    if (response.error) {
                      console.error("Error producing:", response.error);
                      callback({ id: `error-${Date.now()}` }); // Generate a fake ID to avoid hanging
                      return;
                    }
                    callback({ id: response.id });
                  },
                );
              },
            );

            // Handle transport connection state changes
            state.sendTransport.on(
              "connectionstatechange",
              (connectionState: string) => {
                console.log(
                  `[WEBRTC] Send transport connection state changed to ${connectionState}`,
                );

                if (connectionState === "connected") {
                  console.log("[WEBRTC] Send transport successfully connected");
                } else if (connectionState === "failed") {
                  console.error("[WEBRTC] Send transport connection failed");

                  // Try to recover by recreating the transport after a short delay
                  setTimeout(async () => {
                    try {
                      console.log(
                        "[WEBRTC] Attempting to recover from failed send transport",
                      );

                      // Close the failed transport
                      if (state.sendTransport) {
                        try {
                          state.sendTransport.close();
                        } catch (closeError) {
                          console.error(
                            "[WEBRTC] Error closing failed send transport:",
                            closeError,
                          );
                        }
                        state.sendTransport = null;
                      }

                      // Get the current room ID
                      const roomId = getCurrentRoomId();
                      if (roomId) {
                        // Try to create a new transport
                        console.log(
                          "[WEBRTC] Recreating send transport for recovery",
                        );
                        await createSendTransport(roomId);

                        // If we have local tracks, try to produce them again
                        if (state.localStream) {
                          const audioTrack =
                            state.localStream.getAudioTracks()[0];
                          if (audioTrack) {
                            console.log(
                              "[WEBRTC] Reproducing audio track after recovery",
                            );
                            try {
                              await produce("audio", audioTrack);
                            } catch (audioError) {
                              console.error(
                                "[WEBRTC] Failed to reproduce audio after recovery:",
                                audioError,
                              );
                            }
                          }

                          const videoTrack =
                            state.localStream.getVideoTracks()[0];
                          if (videoTrack) {
                            console.log(
                              "[WEBRTC] Reproducing video track after recovery",
                            );
                            try {
                              await produce("video", videoTrack);
                            } catch (videoError) {
                              console.error(
                                "[WEBRTC] Failed to reproduce video after recovery:",
                                videoError,
                              );
                            }
                          }
                        }
                      }
                    } catch (recoveryError) {
                      console.error(
                        "[WEBRTC] Failed to recover from transport failure:",
                        recoveryError,
                      );
                    }
                  }, 2000);
                }
              },
            );

            resolve();
          } catch (error) {
            console.error("Error creating send transport:", error);
            reject(error);
          }
        },
      );
    });
  } catch (error) {
    console.error("[WEBRTC] Error in createSendTransport:", error);
    throw error;
  } finally {
    // Reset the flag regardless of success or failure
    isSendTransportCreating = false;
  }
}

/**
 * Create WebRTC receive transport
 */
export async function createRecvTransport(roomId: string): Promise<void> {
  // Check if we're already creating a receive transport to prevent race conditions
  if (isRecvTransportCreating) {
    console.log(
      "[WEBRTC] Receive transport creation already in progress, waiting...",
    );
    // Wait for the existing creation to finish
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // If the transport was successfully created while we were waiting, return
    if (state.recvTransport) {
      console.log(
        "[WEBRTC] Receive transport was created while waiting, using existing transport",
      );
      return;
    }
  }

  // Set flag to indicate we're creating a transport
  isRecvTransportCreating = true;

  try {
    // Check if socket and device are initialized, with retry logic
    if (!state.socket || !state.device) {
      console.log(
        "[WEBRTC] Socket or device not initialized, attempting to recover",
      );

      // Try to recover the socket connection if needed
      if (!state.socket) {
        console.log("[WEBRTC] Socket is missing, attempting to reconnect");
        try {
          // Import socket modules
          const callSocketModule = await import("@/lib/callSocket");
          const socketModule = await import("@/lib/socket");
          const { useAuthStore } = await import("@/stores/authStore");

          const token = useAuthStore.getState().accessToken;
          if (!token) {
            console.warn("[WEBRTC] No token available for socket recovery");
            throw new Error(
              "Socket not initialized and no token available for recovery",
            );
          }

          // Set up main socket first
          console.log("[WEBRTC] Setting up main socket for recovery");
          socketModule.setupSocket(token);

          // Then ensure call socket is initialized
          console.log("[WEBRTC] Ensuring call socket for recovery");
          const callSocket = await callSocketModule.ensureCallSocket(true);

          if (callSocket) {
            console.log("[WEBRTC] Successfully recovered call socket");
            state.socket = callSocket;

            // Wait a moment for the socket to stabilize
            await new Promise((resolve) => setTimeout(resolve, 1000));
          } else {
            throw new Error("Failed to recover socket connection");
          }
        } catch (socketError) {
          console.error("[WEBRTC] Socket recovery failed:", socketError);
          throw new Error("Socket not initialized and recovery failed");
        }
      }

      // Try to recover the device if needed
      if (!state.device) {
        console.log("[WEBRTC] Device is missing, attempting to recreate");
        try {
          const { Device } = await import("mediasoup-client");
          state.device = new Device();
          console.log("[WEBRTC] Successfully created new device");

          // Check if we have stored RTP capabilities
          const storedCapabilities = sessionStorage.getItem("rtpCapabilities");
          if (storedCapabilities) {
            try {
              const capabilities = JSON.parse(storedCapabilities);
              console.log(
                "[WEBRTC] Loading device with stored RTP capabilities",
              );
              await state.device.load({ routerRtpCapabilities: capabilities });
              console.log(
                "[WEBRTC] Successfully loaded device with stored capabilities",
              );
            } catch (loadError) {
              console.error(
                "[WEBRTC] Error loading device with stored capabilities:",
                loadError,
              );
              throw new Error(
                "Device recovery failed: could not load with stored capabilities",
              );
            }
          } else {
            throw new Error(
              "Device recovery failed: no stored RTP capabilities",
            );
          }
        } catch (deviceError) {
          console.error("[WEBRTC] Device recovery failed:", deviceError);
          throw new Error("Device not initialized and recovery failed");
        }
      }

      // Final check after recovery attempts
      if (!state.socket || !state.device) {
        throw new Error(
          "Socket or device not initialized after recovery attempts",
        );
      }
    }

    // Safely close existing transport if it exists
    if (state.recvTransport) {
      console.log(
        "[WEBRTC] Receive transport already exists, safely closing it before creating a new one",
      );
      safelyCloseTransport(state.recvTransport, "receive");
      state.recvTransport = null;

      // Small delay to ensure the transport is fully closed
      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    return new Promise((resolve, reject) => {
      // Add a timeout for createWebRtcTransport
      const timeout = setTimeout(() => {
        reject(new Error("Timeout creating receive transport"));
      }, 10000);

      state.socket!.emit(
        "createWebRtcTransport",
        { roomId, direction: "recv" },
        async (response: any) => {
          clearTimeout(timeout);

          if (response.error) {
            reject(new Error(response.error));
            return;
          }

          try {
            if (!response.params) {
              reject(new Error("No transport parameters received from server"));
              return;
            }

            state.recvTransport = state.device!.createRecvTransport(
              response.params,
            );

            // Handle transport events
            state.recvTransport.on(
              "connect",
              ({ dtlsParameters }: any, callback: Function) => {
                console.log("Receive transport connect event triggered");

                // Add a timeout for connectWebRtcTransport
                const connectTimeout = setTimeout(() => {
                  console.error("Timeout connecting receive transport");
                  callback(); // Call the callback anyway to avoid hanging
                }, 10000);

                // Add retry mechanism
                let retryCount = 0;
                const maxRetries = 3;

                const attemptConnect = () => {
                  console.log(
                    `[WEBRTC] Attempting to connect receive transport (attempt ${retryCount + 1}/${maxRetries + 1})`,
                  );

                  state.socket!.emit(
                    "connectWebRtcTransport",
                    {
                      roomId,
                      direction: "recv",
                      dtlsParameters,
                    },
                    (response: any) => {
                      if (response.error) {
                        console.error(
                          "Error connecting receive transport:",
                          response.error,
                        );

                        // Retry if we haven't reached max retries
                        if (retryCount < maxRetries) {
                          retryCount++;
                          console.log(
                            `[WEBRTC] Retrying receive transport connection (${retryCount}/${maxRetries})`,
                          );
                          setTimeout(attemptConnect, 1000); // Retry after 1 second
                        } else {
                          console.error(
                            "[WEBRTC] Max retries reached for receive transport connection",
                          );
                          clearTimeout(connectTimeout);
                          callback(); // Call callback to avoid hanging
                        }
                      } else {
                        console.log(
                          "[WEBRTC] Receive transport connected successfully",
                        );
                        clearTimeout(connectTimeout);
                        callback();
                      }
                    },
                  );
                };

                attemptConnect();
              },
            );

            // Handle transport connection state changes
            state.recvTransport.on(
              "connectionstatechange",
              (connectionState: string) => {
                console.log(
                  `[WEBRTC] Receive transport connection state changed to ${connectionState}`,
                );

                if (connectionState === "connected") {
                  console.log(
                    "[WEBRTC] Receive transport successfully connected",
                  );
                } else if (connectionState === "failed") {
                  console.error("[WEBRTC] Receive transport connection failed");

                  // Try to recover by recreating the transport after a short delay
                  setTimeout(async () => {
                    try {
                      console.log(
                        "[WEBRTC] Attempting to recover from failed receive transport",
                      );

                      // Close the failed transport
                      if (state.recvTransport) {
                        try {
                          state.recvTransport.close();
                        } catch (closeError) {
                          console.error(
                            "[WEBRTC] Error closing failed receive transport:",
                            closeError,
                          );
                        }
                        state.recvTransport = null;
                      }

                      // Get the current room ID
                      const roomId = getCurrentRoomId();
                      if (roomId) {
                        // Try to create a new transport
                        console.log(
                          "[WEBRTC] Recreating receive transport for recovery",
                        );
                        await createRecvTransport(roomId);
                      }
                    } catch (recoveryError) {
                      console.error(
                        "[WEBRTC] Failed to recover from transport failure:",
                        recoveryError,
                      );
                    }
                  }, 2000);
                }
              },
            );

            resolve();
          } catch (error) {
            console.error("Error creating receive transport:", error);
            reject(error);
          }
        },
      );
    });
  } catch (error) {
    console.error("[WEBRTC] Error in createRecvTransport:", error);
    throw error;
  } finally {
    // Reset the flag regardless of success or failure
    isRecvTransportCreating = false;
  }
}
