import { Device } from "mediasoup-client";
import { useAuthStore } from "@/stores/authStore";
import { io, Socket } from "socket.io-client";

// Polyfill for MediaStream constructor in some browsers
declare global {
  interface Window {
    webkitMediaStream?: typeof MediaStream;
  }
}

interface WebRTCState {
  device: Device | null;
  socket: Socket | null;
  localStream: MediaStream | null;
  remoteStreams: Map<string, MediaStream>;
  sendTransport: any;
  recvTransport: any;
  producers: Map<string, any>;
  consumers: Map<string, any>;
}

// Initialize WebRTC state
const state: WebRTCState = {
  device: null,
  socket: null,
  localStream: null,
  remoteStreams: new Map(),
  sendTransport: null,
  recvTransport: null,
  producers: new Map(),
  consumers: new Map(),
};

/**
 * Initialize WebRTC connection
 * @param roomId Room ID to join
 * @param withVideo Whether to include video
 * @returns Promise that resolves when connection is established
 */
export async function initializeWebRTC(
  roomId: string,
  withVideo: boolean,
): Promise<MediaStream> {
  try {
    console.log(
      `Initializing WebRTC for room ${roomId} with video: ${withVideo}`,
    );
    console.log(`Browser: ${navigator.userAgent}`);

    // Clean up any existing connections first
    await cleanup();

    // 1. Initialize device - always create a new Device to ensure proper initialization
    try {
      console.log("Creating new mediasoup Device");

      // Create a new Device with default options
      // Let mediasoup detect the browser automatically
      state.device = new Device();
      console.log("Device created successfully");
    } catch (error: any) {
      console.error("Error creating Device:", error);

      // Check if the error is "already loaded" - this is not a fatal error
      if (error.message && error.message.includes("already loaded")) {
        console.log("Device already loaded, continuing...");
      } else {
        throw new Error("Failed to create mediasoup Device: " + error.message);
      }
    }

    // 2. Connect to socket
    console.log("Connecting to socket server...");
    await connectToSocket();

    // 3. Get user media
    console.log("Getting user media...");
    await getUserMedia(withVideo);

    // 4. Check if there's an active call for this room
    console.log(`Checking active call for room ${roomId}...`);
    try {
      const { getActiveCall } = await import("@/actions/call.action");
      const token = useAuthStore.getState().accessToken;

      if (!token) {
        console.warn("No token available to check active call");
      } else {
        const activeCallResult = await getActiveCall(token);

        if (activeCallResult.success && activeCallResult.activeCall) {
          console.log("Active call found:", activeCallResult.activeCall);
        } else {
          console.log("No active call found, but continuing anyway");
        }
      }
    } catch (error: any) {
      console.warn(
        `Error checking active call: ${error?.message || "Unknown error"}`,
      );
      // Continue anyway
    }

    // 5. Join the room
    console.log(`Joining room ${roomId}...`);
    await joinRoom(roomId);
    console.log(`Successfully joined room ${roomId}`);

    // Set up event listeners for remote streams
    setupRemoteStreamListeners();

    return state.localStream!;
  } catch (error) {
    console.error("Error initializing WebRTC:", error);

    // Try to clean up on error
    try {
      await cleanup();
    } catch (cleanupError) {
      console.error(
        "Error during cleanup after initialization failure:",
        cleanupError,
      );
    }

    throw error;
  }
}

/**
 * Set up event listeners for remote streams
 */
function setupRemoteStreamListeners() {
  window.addEventListener("webrtc:newStream", (event: any) => {
    const { id, stream, kind } = event.detail;
    console.log(`New ${kind} stream received with ID ${id}`);

    // Dispatch event to notify UI components
    window.dispatchEvent(
      new CustomEvent("call:remoteStreamAdded", {
        detail: { id, stream, kind },
      }),
    );
  });

  window.addEventListener("webrtc:streamRemoved", (event: any) => {
    const { id, kind } = event.detail;
    console.log(`Remote ${kind} stream removed with ID ${id}`);

    // Dispatch event to notify UI components
    window.dispatchEvent(
      new CustomEvent("call:remoteStreamRemoved", {
        detail: { id, kind },
      }),
    );
  });
}

// Removed checkCallStatus function as it's no longer needed

/**
 * Connect to the WebRTC socket server
 */
async function connectToSocket(): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      // If we already have a socket connection, disconnect it first
      if (state.socket) {
        try {
          state.socket.disconnect();
        } catch (error) {
          console.error("Error disconnecting existing socket:", error);
        }
        state.socket = null;
      }

      const accessToken = useAuthStore.getState().accessToken;
      const user = useAuthStore.getState().user;

      if (!accessToken || !user) {
        reject(new Error("Not authenticated"));
        return;
      }

      const currentUser = user;

      // Đảm bảo Socket URL không bị undefined
      const socketUrl = `${process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3000"}/call`;
      console.log(`Connecting to call socket at ${socketUrl}`);
      console.log(
        `NEXT_PUBLIC_SOCKET_URL: ${process.env.NEXT_PUBLIC_SOCKET_URL || "undefined"}`,
      );
      console.log(
        `NEXT_PUBLIC_API_URL: ${process.env.NEXT_PUBLIC_API_URL || "undefined"}`,
      );

      // Add a connection timeout
      const connectionTimeout = setTimeout(() => {
        reject(new Error("Socket connection timeout"));
      }, 10000); // 10 seconds timeout

      const socket = io(socketUrl, {
        auth: {
          token: accessToken,
          userId: currentUser.id,
        },
        transports: ["websocket"],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        timeout: 10000,
      });

      socket.on("connect", () => {
        clearTimeout(connectionTimeout);
        console.log("Connected to call socket server with ID:", socket.id);
        state.socket = socket;
        resolve();
      });

      socket.on("connect_error", (error) => {
        clearTimeout(connectionTimeout);
        console.error("Socket connection error:", error);
        reject(error);
      });

      socket.on("disconnect", (reason) => {
        console.log(`Socket disconnected: ${reason}`);

        // If the server disconnected us, try to reconnect
        if (reason === "io server disconnect") {
          socket.connect();
        }
      });

      socket.on("error", (error) => {
        console.error("Socket error:", error);
      });

      socket.on("newProducer", async (data) => {
        try {
          const { producerId, producerUserId, kind } = data;

          // Don't consume our own producers
          if (producerUserId === currentUser.id) {
            return;
          }

          await consume(producerId, kind);
        } catch (error) {
          console.error("Error handling newProducer event:", error);
        }
      });

      // Set up other event listeners
      setupSocketListeners(socket);
    } catch (error) {
      console.error("Error in connectToSocket:", error);
      reject(error);
    }
  });
}

/**
 * Set up socket event listeners
 */
function setupSocketListeners(socket: Socket): void {
  socket.on("call:ended", async () => {
    console.log("Call ended by server");
    await cleanup();

    // Notify the UI that the call has ended
    window.dispatchEvent(
      new CustomEvent("webrtc:callEnded", {
        detail: { reason: "ended_by_server" },
      }),
    );
  });

  socket.on("call:error", async (data) => {
    console.error("Call error from server:", data.error);

    // Notify the UI about the error
    window.dispatchEvent(
      new CustomEvent("webrtc:callError", {
        detail: { error: data.error },
      }),
    );
  });

  socket.on("participantLeft", async (data) => {
    console.log("Participant left:", data.userId);

    // Notify the UI that a participant has left
    window.dispatchEvent(
      new CustomEvent("webrtc:participantLeft", {
        detail: { userId: data.userId },
      }),
    );
  });

  socket.on("participantJoined", async (data) => {
    console.log("Participant joined:", data.userId);

    // Notify the UI that a participant has joined
    window.dispatchEvent(
      new CustomEvent("webrtc:participantJoined", {
        detail: { userId: data.userId },
      }),
    );
  });

  socket.on("producerClosed", (data) => {
    const { producerId } = data;

    // Find the consumer associated with this producer
    state.consumers.forEach((consumer, id) => {
      if (consumer.producerId === producerId) {
        consumer.close();
        state.consumers.delete(id);
        state.remoteStreams.delete(id);

        // Notify the UI that a stream has been removed
        window.dispatchEvent(
          new CustomEvent("webrtc:streamRemoved", {
            detail: { id },
          }),
        );
      }
    });
  });
}

/**
 * Get user media (camera and microphone)
 */
async function getUserMedia(withVideo: boolean): Promise<void> {
  try {
    state.localStream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: withVideo,
    });
  } catch (error) {
    console.error("Error getting user media:", error);

    // Try audio only if video fails
    if (withVideo) {
      try {
        state.localStream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: false,
        });
      } catch (audioError) {
        console.error("Error getting audio-only media:", audioError);
        throw audioError;
      }
    } else {
      throw error;
    }
  }
}

/**
 * Join a WebRTC room
 */
async function joinRoom(roomId: string): Promise<void> {
  if (!state.socket || !state.device) {
    throw new Error("Socket or device not initialized");
  }

  // Try multiple times to join the room
  let attempts = 0;
  const maxAttempts = 3;

  while (attempts < maxAttempts) {
    attempts++;
    console.log(`Attempt ${attempts}/${maxAttempts} to join room ${roomId}`);

    try {
      await joinRoomAttempt(roomId);
      console.log(`Successfully joined room ${roomId} on attempt ${attempts}`);
      return;
    } catch (error: any) {
      console.error(`Error joining room on attempt ${attempts}:`, error);

      if (attempts >= maxAttempts) {
        throw error;
      }

      // Handle specific errors
      if (error.message) {
        // Room not found error
        if (error.message.includes("not found")) {
          console.log(
            "Room not found, this may indicate the call has ended or was never properly initiated",
          );

          // Try to check if there's an active call
          try {
            const { getActiveCall } = await import("@/actions/call.action");
            const token = useAuthStore.getState().accessToken;

            if (!token) {
              console.warn("No token available to check active call");
            } else {
              const activeCallResult = await getActiveCall(token);

              if (activeCallResult.success && activeCallResult.activeCall) {
                console.log(
                  "Active call found despite room not found error, will retry",
                );
              } else {
                console.log("No active call found, but will retry anyway");
              }
            }
          } catch (checkError) {
            console.error("Error checking active call:", checkError);
          }
        }

        // Already loaded error - this is not a fatal error
        if (error.message.includes("already loaded")) {
          console.log("Device already loaded, will retry with existing device");
        }
      }

      // Wait before retrying
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  throw new Error(
    `Failed to join room ${roomId} after ${maxAttempts} attempts`,
  );
}

/**
 * Single attempt to join a room
 */
async function joinRoomAttempt(roomId: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // Add a timeout to handle cases where the server doesn't respond
    const timeout = setTimeout(() => {
      reject(new Error("Timeout joining room"));
    }, 15000); // 15 seconds timeout

    // Check if socket is initialized
    if (!state.socket) {
      clearTimeout(timeout);
      console.error("Socket is not initialized");
      // We can't initialize socket here, need to go through the proper flow
      reject(
        new Error("Socket is not initialized, please reinitialize WebRTC"),
      );
      return;
    }

    // 1. Join the room
    state.socket.emit("joinRoom", { roomId }, async (response: any) => {
      clearTimeout(timeout);

      if (!response) {
        console.error("No response received from joinRoom");
        reject(new Error("No response received from joinRoom"));
        return;
      }

      if (response.error) {
        console.error(`Error joining room: ${response.error}`);
        reject(new Error(response.error));
        return;
      }

      try {
        // Check if rtpCapabilities is valid
        if (!response.rtpCapabilities) {
          console.error("No RTP capabilities received from server");
          reject(new Error("No RTP capabilities received from server"));
          return;
        }

        await setupRoomConnection(roomId, response.rtpCapabilities);
        resolve();
      } catch (error) {
        console.error("Error in joinRoom:", error);
        reject(error);
      }
    });
  });
}

/**
 * Set up WebRTC connection after joining a room
 */
async function setupRoomConnection(
  roomId: string,
  rtpCapabilities: any,
): Promise<void> {
  try {
    // 1. Load the device with router RTP capabilities if not already loaded
    try {
      if (!state.device!.loaded) {
        console.log("Loading device with RTP capabilities");
        await state.device!.load({ routerRtpCapabilities: rtpCapabilities });
        console.log("Device loaded successfully");
      } else {
        console.log("Device already loaded, skipping load step");
      }
    } catch (error: any) {
      // If we get "already loaded" error, just continue
      if (
        error &&
        typeof error === "object" &&
        "message" in error &&
        typeof error.message === "string" &&
        error.message.includes("already loaded")
      ) {
        console.warn("Device already loaded error caught, continuing...");
      } else {
        console.error("Error loading device:", error);
        throw error;
      }
    }

    // Close any existing transports before creating new ones
    if (state.sendTransport) {
      try {
        console.log("Closing existing send transport");
        state.sendTransport.close();
        state.sendTransport = null;
      } catch (error) {
        console.error("Error closing existing send transport:", error);
        // Continue anyway
      }
    }

    if (state.recvTransport) {
      try {
        console.log("Closing existing receive transport");
        state.recvTransport.close();
        state.recvTransport = null;
      } catch (error) {
        console.error("Error closing existing receive transport:", error);
        // Continue anyway
      }
    }

    // 2. Create send transport
    console.log("Creating send transport");
    await createSendTransport(roomId);

    // 3. Create receive transport
    console.log("Creating receive transport");
    await createRecvTransport(roomId);

    // 4. Produce our media
    if (state.localStream) {
      console.log("Producing local media");

      const audioTrack = state.localStream.getAudioTracks()[0];
      if (audioTrack) {
        console.log("Producing audio track");
        try {
          await produce("audio", audioTrack);
        } catch (error) {
          console.error("Error producing audio:", error);
          // Continue anyway, we can still receive remote media
        }
      }

      const videoTrack = state.localStream.getVideoTracks()[0];
      if (videoTrack) {
        console.log("Producing video track");
        try {
          await produce("video", videoTrack);
        } catch (error) {
          console.error("Error producing video:", error);
          // Continue anyway, we can still receive remote media and audio
        }
      }
    }

    // 5. Get existing producers in the room
    console.log("Getting existing producers in the room");
    return new Promise<void>((resolve) => {
      // Add a timeout for getProducers
      const timeout = setTimeout(() => {
        console.warn(
          "getProducers timed out, continuing without remote producers",
        );

        // Even if getting producers times out, we still want to finish joining
        try {
          console.log("Finishing joining after timeout");
          state.socket!.emit("finishJoining", { roomId });
        } catch (error) {
          console.error("Error in finishJoining after timeout:", error);
        }

        resolve();
      }, 5000);

      state.socket!.emit("getProducers", { roomId }, async (response: any) => {
        clearTimeout(timeout);

        if (response.error) {
          console.error("Error getting producers:", response.error);

          // Xử lý lỗi "Room not found" tốt hơn
          if (response.error.includes("not found")) {
            console.warn(
              "Room not found when getting producers, attempting to recover",
            );

            // Thử tạo lại phòng sau 1 giây
            setTimeout(() => {
              try {
                console.log(
                  'Attempting to rejoin room after "not found" error',
                );
                // Gọi hàm cleanup và khởi tạo lại kết nối
                cleanup().then(() => {
                  console.log("Cleanup completed, reinitializing WebRTC");
                  // Thông báo cho người dùng biết đang thử kết nối lại
                  if (
                    window.confirm(
                      "Kết nối phòng gọi bị mất. Bạn có muốn thử kết nối lại không?",
                    )
                  ) {
                    initializeWebRTC(
                      roomId,
                      state.localStream?.getVideoTracks()?.length > 0 || false,
                    )
                      .then(() =>
                        console.log("Successfully reinitialized WebRTC"),
                      )
                      .catch((error) =>
                        console.error("Failed to reinitialize WebRTC:", error),
                      );
                  }
                });
              } catch (error) {
                console.error(
                  "Error attempting to recover from room not found:",
                  error,
                );
              }
            }, 1000);
          }

          // Don't reject here, just log the error and continue
          // Finish joining even if we couldn't get producers
          try {
            console.log("Finishing joining after getProducers error");
            state.socket!.emit("finishJoining", { roomId });
          } catch (error) {
            console.error(
              "Error in finishJoining after getProducers error:",
              error,
            );
          }

          resolve();
          return;
        }

        try {
          // 6. Consume each producer
          if (response.producers && Array.isArray(response.producers)) {
            console.log(
              `Found ${response.producers.length} producers to consume`,
            );
            const consumePromises: Promise<void>[] = [];

            for (const { producerId, kind } of response.producers) {
              try {
                console.log(
                  `Setting up consumer for producer ${producerId} of kind ${kind}`,
                );
                // Don't await here, collect promises to consume in parallel
                consumePromises.push(consume(producerId, kind));
              } catch (error) {
                console.error(
                  `Error setting up consumer for producer ${producerId}:`,
                  error,
                );
                // Continue with other producers
              }
            }

            // Wait for all consumers to be set up, but don't fail if some fail
            if (consumePromises.length > 0) {
              try {
                console.log(
                  `Waiting for ${consumePromises.length} consumers to be set up`,
                );
                await Promise.allSettled(consumePromises);
                console.log("All consumers set up (or failed)");
              } catch (error) {
                console.error("Error waiting for consumers:", error);
              }
            }
          } else {
            console.log("No producers found to consume");
          }

          // 7. Finish joining
          console.log("Finishing joining after successful setup");
          state.socket!.emit("finishJoining", { roomId });

          resolve();
        } catch (error) {
          console.error("Error consuming producers:", error);

          // Try to finish joining even if consuming producers failed
          try {
            console.log("Finishing joining after consumer error");
            state.socket!.emit("finishJoining", { roomId });
          } catch (finishError) {
            console.error(
              "Error in finishJoining after consumer error:",
              finishError,
            );
          }

          // Don't reject here, just resolve to continue
          resolve();
        }
      });
    });
  } catch (error) {
    console.error("Error setting up room connection:", error);
    throw error;
  }
}

/**
 * Create WebRTC send transport
 */
async function createSendTransport(roomId: string): Promise<void> {
  if (!state.socket || !state.device) {
    throw new Error("Socket or device not initialized");
  }

  // We've already closed the transport in setupRoomConnection, but double-check
  if (state.sendTransport) {
    console.log(
      "Send transport already exists, closing it before creating a new one",
    );
    try {
      state.sendTransport.close();
    } catch (error) {
      // Just log the error and continue
      console.error("Error closing existing send transport:", error);
    }
    state.sendTransport = null;
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
              }, 5000);

              state.socket!.emit(
                "connectWebRtcTransport",
                {
                  roomId,
                  direction: "send",
                  dtlsParameters,
                },
                (response: any) => {
                  clearTimeout(connectTimeout);

                  if (response.error) {
                    console.error(
                      "Error connecting send transport:",
                      response.error,
                    );
                  }
                  callback();
                },
              );
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

          // Handle transport failure
          state.sendTransport.on("connectionstatechange", (state: string) => {
            console.log(`Send transport connection state changed to ${state}`);
            if (state === "failed" || state === "closed") {
              console.error(`Send transport connection ${state}`);
            }
          });

          resolve();
        } catch (error) {
          console.error("Error creating send transport:", error);
          reject(error);
        }
      },
    );
  });
}

/**
 * Create WebRTC receive transport
 */
async function createRecvTransport(roomId: string): Promise<void> {
  if (!state.socket || !state.device) {
    throw new Error("Socket or device not initialized");
  }

  // We've already closed the transport in setupRoomConnection, but double-check
  if (state.recvTransport) {
    console.log(
      "Receive transport already exists, closing it before creating a new one",
    );
    try {
      state.recvTransport.close();
    } catch (error) {
      // Just log the error and continue
      console.error("Error closing existing receive transport:", error);
    }
    state.recvTransport = null;
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
              }, 5000);

              state.socket!.emit(
                "connectWebRtcTransport",
                {
                  roomId,
                  direction: "recv",
                  dtlsParameters,
                },
                (response: any) => {
                  clearTimeout(connectTimeout);

                  if (response.error) {
                    console.error(
                      "Error connecting receive transport:",
                      response.error,
                    );
                  }
                  callback();
                },
              );
            },
          );

          // Handle transport failure
          state.recvTransport.on("connectionstatechange", (state: string) => {
            console.log(
              `Receive transport connection state changed to ${state}`,
            );
            if (state === "failed" || state === "closed") {
              console.error(`Receive transport connection ${state}`);
            }
          });

          resolve();
        } catch (error) {
          console.error("Error creating receive transport:", error);
          reject(error);
        }
      },
    );
  });
}

/**
 * Produce media (send our audio/video)
 */
async function produce(
  kind: "audio" | "video",
  track: MediaStreamTrack,
): Promise<void> {
  if (!state.sendTransport) {
    throw new Error("Send transport not created");
  }

  // Kiểm tra kỹ lưỡng track trước khi sử dụng
  if (!track || track.readyState === "ended") {
    console.error(
      `Cannot produce ${kind} with ${!track ? "null" : "ended"} track`,
    );

    // Thay vì throw error, thử lấy track mới
    try {
      console.log(`Attempting to get new ${kind} track...`);
      const constraints =
        kind === "audio"
          ? { audio: true, video: false }
          : { audio: false, video: true };

      const newStream = await navigator.mediaDevices.getUserMedia(constraints);
      const newTrack =
        kind === "audio"
          ? newStream.getAudioTracks()[0]
          : newStream.getVideoTracks()[0];

      if (!newTrack) {
        throw new Error(`Could not get new ${kind} track`);
      }

      // Cập nhật track trong localStream
      if (state.localStream) {
        const oldTracks =
          kind === "audio"
            ? state.localStream.getAudioTracks()
            : state.localStream.getVideoTracks();

        // Xóa track cũ
        oldTracks.forEach((t) => state.localStream?.removeTrack(t));

        // Thêm track mới
        state.localStream.addTrack(newTrack);
      }

      // Sử dụng track mới
      track = newTrack;
      console.log(
        `Successfully acquired new ${kind} track with ID ${track.id}`,
      );
    } catch (error) {
      console.error(`Failed to get new ${kind} track:`, error);
      throw new Error(`Cannot produce ${kind}: failed to get media track`);
    }
  }

  try {
    console.log(
      `Producing ${kind} track with ID ${track.id}, readyState: ${track.readyState}`,
    );

    const producer = await state.sendTransport.produce({
      track,
      encodings:
        kind === "video"
          ? [
              { maxBitrate: 100000 },
              { maxBitrate: 300000 },
              { maxBitrate: 900000 },
            ]
          : undefined,
      codecOptions:
        kind === "video" ? { videoGoogleStartBitrate: 1000 } : undefined,
      appData: { kind },
    });

    state.producers.set(kind, producer);

    producer.on("transportclose", () => {
      console.log(`Producer transport closed for ${kind}`);
      producer.close();
      state.producers.delete(kind);
    });

    producer.on("trackended", () => {
      console.log(`Track ended for ${kind}`);
      producer.close();
      state.producers.delete(kind);
    });

    console.log(`Successfully produced ${kind} with ID ${producer.id}`);
  } catch (error) {
    console.error(`Error producing ${kind}:`, error);

    // If the track ended during the produce call, log it clearly
    if (error instanceof DOMException && error.name === "InvalidStateError") {
      console.error(`Track ended while trying to produce ${kind}`);
    }

    throw error;
  }
}

/**
 * Consume media (receive remote audio/video)
 */
async function consume(producerId: string, kind: string): Promise<void> {
  if (!state.socket || !state.recvTransport || !state.device) {
    throw new Error("Receive transport not created");
  }

  // Check if we already have a consumer for this producer
  for (const [_, consumer] of state.consumers.entries()) {
    if (consumer.producerId === producerId) {
      console.log(`Already consuming producer ${producerId}`);
      return;
    }
  }

  try {
    // Check if we can consume this producer using type assertion
    const deviceAny = state.device as any;
    if (typeof deviceAny.canConsume === "function") {
      if (
        !deviceAny.canConsume({
          producerId,
          rtpCapabilities: state.device.rtpCapabilities,
        })
      ) {
        console.error(`Cannot consume producer ${producerId}`);
        return;
      }
    }
  } catch (error) {
    console.error("Error checking if can consume:", error);
    // Continue anyway, let's try to consume
  }

  return new Promise((resolve, reject) => {
    // Add a timeout for consume
    const timeout = setTimeout(() => {
      reject(new Error(`Timeout consuming producer ${producerId}`));
    }, 10000);

    state.socket!.emit(
      "consume",
      {
        producerId,
        rtpCapabilities: state.device!.rtpCapabilities,
      },
      async (response: any) => {
        clearTimeout(timeout);

        if (response.error) {
          console.error(
            `Error consuming producer ${producerId}:`,
            response.error,
          );
          reject(new Error(response.error));
          return;
        }

        try {
          if (!response.id || !response.rtpParameters) {
            reject(
              new Error("Invalid consumer parameters received from server"),
            );
            return;
          }

          console.log(
            `Consuming producer ${producerId} with ID ${response.id}`,
          );

          const consumer = await state.recvTransport.consume({
            id: response.id,
            producerId,
            kind,
            rtpParameters: response.rtpParameters,
          });

          state.consumers.set(response.id, consumer);

          consumer.on("transportclose", () => {
            console.log(`Consumer transport closed for ${kind}`);
            consumer.close();
            state.consumers.delete(response.id);
          });

          consumer.on("trackended", () => {
            console.log(`Consumer track ended for ${kind}`);
            consumer.close();
            state.consumers.delete(response.id);
            state.remoteStreams.delete(response.id);

            // Notify UI that stream was removed
            window.dispatchEvent(
              new CustomEvent("webrtc:streamRemoved", {
                detail: {
                  id: response.id,
                  kind,
                },
              }),
            );
          });

          // Resume the consumer
          const resumeTimeout = setTimeout(() => {
            console.warn(`Timeout resuming consumer ${response.id}`);
          }, 5000);

          state.socket!.emit(
            "resumeConsumer",
            { consumerId: response.id },
            (resumeResponse: any) => {
              clearTimeout(resumeTimeout);
              if (resumeResponse && resumeResponse.error) {
                console.error(
                  `Error resuming consumer ${response.id}:`,
                  resumeResponse.error,
                );
              }
            },
          );

          // Add the track to a remote stream
          let stream: MediaStream;
          try {
            stream = new MediaStream([consumer.track]);
          } catch (error) {
            console.error("Error creating MediaStream:", error);
            // Fallback for older browsers
            try {
              const WebkitMediaStream = (window as any).webkitMediaStream;
              if (WebkitMediaStream) {
                stream = new WebkitMediaStream();
                stream.addTrack(consumer.track);
              } else {
                // Last resort - create empty stream
                stream = new MediaStream();
              }
            } catch (fallbackError) {
              console.error("Error creating webkitMediaStream:", fallbackError);
              // Last resort - create empty stream
              stream = new MediaStream();
            }
          }
          state.remoteStreams.set(response.id, stream);

          // Dispatch event for new stream
          window.dispatchEvent(
            new CustomEvent("webrtc:newStream", {
              detail: {
                id: response.id,
                stream,
                kind,
                producerId,
              },
            }),
          );

          resolve();
        } catch (error) {
          console.error(`Error consuming producer ${producerId}:`, error);
          reject(error);
        }
      },
    );
  });
}

/**
 * Toggle microphone mute state
 * @returns New mute state (true = muted, false = unmuted)
 */
export async function toggleMute(): Promise<boolean> {
  if (!state.localStream) return false;

  const audioTrack = state.localStream.getAudioTracks()[0];
  if (!audioTrack) return false;

  const isMuted = !audioTrack.enabled;
  audioTrack.enabled = isMuted;

  // Also mute/unmute the producer if it exists
  const audioProducer = state.producers.get("audio");
  if (audioProducer) {
    if (isMuted) {
      await audioProducer.pause();
    } else {
      await audioProducer.resume();
    }
  }

  return isMuted;
}

/**
 * Toggle camera on/off
 * @returns New camera state (true = off, false = on)
 */
export async function toggleCamera(): Promise<boolean> {
  if (!state.localStream) return false;

  const videoTrack = state.localStream.getVideoTracks()[0];
  if (!videoTrack) return false;

  const isOff = !videoTrack.enabled;
  videoTrack.enabled = isOff;

  // Also pause/resume the producer if it exists
  const videoProducer = state.producers.get("video");
  if (videoProducer) {
    if (isOff) {
      await videoProducer.pause();
    } else {
      await videoProducer.resume();
    }
  }

  return isOff;
}

/**
 * End the call and clean up resources
 * @returns Promise that resolves when call is ended and cleanup is complete
 */
export async function endCall(): Promise<void> {
  try {
    if (state.socket) {
      state.socket.emit("leaveRoom");
    }

    await cleanup();
  } catch (error) {
    console.error("Error ending call:", error);
  }
}

/**
 * Clean up WebRTC resources
 * @returns Promise that resolves when cleanup is complete
 */
async function cleanup(): Promise<void> {
  return new Promise<void>((resolve) => {
    try {
      // Close all producers
      state.producers.forEach((producer) => {
        try {
          producer.close();
        } catch (error) {
          console.error("Error closing producer:", error);
        }
      });
      state.producers.clear();

      // Close all consumers
      state.consumers.forEach((consumer) => {
        try {
          consumer.close();
        } catch (error) {
          console.error("Error closing consumer:", error);
        }
      });
      state.consumers.clear();

      // Close transports
      if (state.sendTransport) {
        try {
          state.sendTransport.close();
        } catch (error) {
          console.error("Error closing send transport:", error);
        }
        state.sendTransport = null;
      }

      if (state.recvTransport) {
        try {
          state.recvTransport.close();
        } catch (error) {
          console.error("Error closing receive transport:", error);
        }
        state.recvTransport = null;
      }

      // Stop local stream tracks
      if (state.localStream) {
        state.localStream.getTracks().forEach((track) => {
          try {
            track.stop();
          } catch (error) {
            console.error("Error stopping track:", error);
          }
        });
        state.localStream = null;
      }

      // Clear remote streams
      state.remoteStreams.clear();

      // Disconnect socket
      if (state.socket) {
        try {
          state.socket.disconnect();
        } catch (error) {
          console.error("Error disconnecting socket:", error);
        }
        state.socket = null;
      }

      // Clear device
      state.device = null;

      resolve();
    } catch (error) {
      console.error("Error during cleanup:", error);
      resolve(); // Resolve anyway to prevent hanging
    }
  });
}

/**
 * Get all remote streams
 * @returns Map of remote streams
 */
export function getRemoteStreams(): Map<string, MediaStream> {
  return state.remoteStreams;
}
