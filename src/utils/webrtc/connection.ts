import { Device } from "mediasoup-client";
import { useAuthStore } from "@/stores/authStore";
import { state } from "./state";
import { getCurrentRoomId } from "./state";
import { createSendTransport, createRecvTransport } from "./transport";
import { produce } from "./producer";
import { cleanup } from "./cleanup";
import { consume } from "./consumer";
import { initializeWebRTC } from "./index";

/**
 * Set up WebRTC connection after joining a room
 */
export async function setupRoomConnection(
  roomId: string,
  rtpCapabilities: any,
): Promise<void> {
  // Create a flag to track if we're in the process of cleaning up
  let isCleaningUp = false;

  // Create a wrapper function to safely handle cleanup
  const safeCleanup = async () => {
    if (isCleaningUp) {
      console.log("Cleanup already in progress, skipping duplicate cleanup");
      return;
    }

    isCleaningUp = true;
    try {
      console.log("Performing safe cleanup during error recovery");

      // Close transports safely
      if (state.sendTransport) {
        try {
          console.log("Safely closing send transport");
          state.sendTransport.close();
        } catch (e) {
          console.error("Error closing send transport during cleanup:", e);
        }
        state.sendTransport = null;
      }

      if (state.recvTransport) {
        try {
          console.log("Safely closing receive transport");
          state.recvTransport.close();
        } catch (e) {
          console.error("Error closing receive transport during cleanup:", e);
        }
        state.recvTransport = null;
      }

      // Clear producers and consumers
      state.producers.forEach((producer) => {
        try {
          producer.close();
        } catch (e) {
          console.error("Error closing producer during cleanup:", e);
        }
      });
      state.producers.clear();

      state.consumers.forEach((consumer) => {
        try {
          consumer.close();
        } catch (e) {
          console.error("Error closing consumer during cleanup:", e);
        }
      });
      state.consumers.clear();
    } finally {
      isCleaningUp = false;
    }
  };

  try {
    // 1. Load the device with router RTP capabilities if not already loaded
    try {
      // Store RTP capabilities in session storage for recovery
      try {
        sessionStorage.setItem(
          "rtpCapabilities",
          JSON.stringify(rtpCapabilities),
        );
        console.log("[WEBRTC] Stored RTP capabilities in session storage");
      } catch (storageError) {
        console.warn(
          "[WEBRTC] Failed to store RTP capabilities:",
          storageError,
        );
        // Continue anyway
      }

      // Check if device exists and is valid
      if (!state.device) {
        console.log(
          "[WEBRTC] Device is null in setupRoomConnection, creating new device",
        );
        state.device = new Device();
        console.log("[WEBRTC] New device created in setupRoomConnection");
      } else if (state.device.loaded) {
        // Device is already loaded, check if it's working properly
        console.log(
          "[WEBRTC] Device already loaded, checking if it's working properly",
        );

        // Check if the device has the necessary methods
        if (typeof state.device.canProduce !== "function") {
          console.error(
            "[WEBRTC] Device is loaded but appears to be corrupted (missing methods)",
          );
          console.log("[WEBRTC] Recreating device due to corruption");
          state.device = new Device();
        } else {
          // Test if the device can produce audio (basic functionality check)
          try {
            const canProduceAudio = state.device.canProduce("audio");
            console.log(
              `[WEBRTC] Device can produce audio: ${canProduceAudio}`,
            );
            // Device seems to be working properly, we can skip loading
            console.log(
              "[WEBRTC] Device is loaded and working properly, skipping load step",
            );
            return;
          } catch (testError) {
            console.error(
              "[WEBRTC] Error testing device capabilities:",
              testError,
            );
            console.log("[WEBRTC] Recreating device due to test failure");
            state.device = new Device();
          }
        }
      }

      // At this point, we either have a new device or an existing device that's not loaded
      console.log("[WEBRTC] Loading device with RTP capabilities");

      // Use a try-catch specifically for the "already loaded" error
      try {
        await state.device.load({ routerRtpCapabilities: rtpCapabilities });
        console.log("[WEBRTC] Device loaded successfully");
      } catch (loadError: any) {
        // Handle "already loaded" error gracefully
        if (loadError.message && loadError.message.includes("already loaded")) {
          console.log(
            "[WEBRTC] Device already loaded error caught, device is ready to use",
          );
          // No need to do anything, the device is already loaded and ready to use
        } else {
          // For other errors, we need to handle them
          console.error("[WEBRTC] Error loading device:", loadError);
          throw loadError; // Re-throw to be caught by the outer try-catch
        }
      }
    } catch (error: any) {
      console.error("[WEBRTC] Error in device initialization:", error);

      // Try to recreate the device if it failed
      if (
        !state.device ||
        (error.message && error.message.includes("not loaded"))
      ) {
        try {
          console.log(
            "[WEBRTC] Attempting to recreate device after initialization failure",
          );

          // Ensure any existing device is properly cleaned up
          if (state.device) {
            try {
              // There's no explicit cleanup method for Device, but we can null it out
              console.log(
                "[WEBRTC] Cleaning up existing device before recreation",
              );
              state.device = null;
            } catch (cleanupError) {
              console.error("[WEBRTC] Error cleaning up device:", cleanupError);
              // Continue anyway
            }
          }

          // Create a new device and load it
          state.device = new Device();
          await state.device.load({ routerRtpCapabilities: rtpCapabilities });
          console.log("[WEBRTC] Successfully recreated and loaded device");
        } catch (recreateError: any) {
          // Check if this is an "already loaded" error
          if (
            recreateError.message &&
            recreateError.message.includes("already loaded")
          ) {
            console.log(
              "[WEBRTC] Device already loaded error during recreation, device is ready to use",
            );
            // No need to do anything, the device is already loaded and ready to use
          } else {
            console.error("[WEBRTC] Failed to recreate device:", recreateError);
            await safeCleanup();
            throw recreateError;
          }
        }
      } else {
        await safeCleanup();
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

    try {
      // 2. Create send transport
      console.log("Creating send transport");
      await createSendTransport(roomId);
    } catch (error) {
      console.error("Error creating send transport:", error);
      await safeCleanup();
      throw error;
    }

    try {
      // 3. Create receive transport
      console.log("Creating receive transport");
      await createRecvTransport(roomId);
    } catch (error) {
      console.error("Error creating receive transport:", error);
      await safeCleanup();
      throw error;
    }

    // 4. Produce our media
    if (state.localStream) {
      console.log("Producing local media");

      // Produce audio track if available
      try {
        // Safely check if getAudioTracks exists and get tracks
        if (
          state.localStream.getAudioTracks &&
          typeof state.localStream.getAudioTracks === "function"
        ) {
          const audioTracks = state.localStream.getAudioTracks();
          const audioTrack =
            audioTracks && audioTracks.length > 0 ? audioTracks[0] : null;

          if (audioTrack) {
            console.log("Producing audio track");
            try {
              await produce("audio", audioTrack);
            } catch (error) {
              console.error("Error producing audio:", error);
              // Continue anyway, we can still receive remote media
            }
          } else {
            console.log("No audio track found in local stream");
          }
        } else {
          console.warn("getAudioTracks method not available on local stream");
        }
      } catch (error) {
        console.error("Error accessing audio tracks:", error);
        // Continue anyway, we can still try video and receive remote media
      }

      // Only try to produce video if we're in a video call
      // Check if the stream has video tracks before trying to access them
      try {
        // First check if getVideoTracks method exists
        if (
          state.localStream.getVideoTracks &&
          typeof state.localStream.getVideoTracks === "function"
        ) {
          // Safely get video tracks
          const videoTracks = state.localStream.getVideoTracks();

          // Only proceed if we have video tracks
          if (videoTracks && videoTracks.length > 0) {
            const videoTrack = videoTracks[0];
            console.log("Producing video track");
            try {
              await produce("video", videoTrack);
            } catch (error) {
              console.error("Error producing video:", error);
              // Continue anyway, we can still receive remote media and audio
            }
          } else {
            console.log(
              "No video tracks found in local stream - this is normal for audio-only calls",
            );
          }
        } else {
          console.warn("getVideoTracks method not available on local stream");
        }
      } catch (error) {
        console.error("Error accessing video tracks:", error);
        // Continue anyway, we can still receive remote media
      }
    } else {
      console.warn("No local stream available, skipping media production");
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

          // Handle "Room not found" error better
          if (response.error.includes("not found")) {
            console.warn(
              "Room not found when getting producers, attempting to recover",
            );

            // Don't try to recreate the room, just report the error
            console.error(
              "Room not found error. The call may have ended or was never properly initiated.",
            );

            // Dispatch an event to notify UI about the error
            try {
              window.dispatchEvent(
                new CustomEvent("call:error", {
                  detail: {
                    error:
                      "Phòng gọi không tồn tại. Cuộc gọi có thể đã kết thúc hoặc chưa được khởi tạo đúng cách.",
                    code: "ROOM_NOT_FOUND",
                    roomId,
                    timestamp: new Date().toISOString(),
                  },
                }),
              );
              console.log(
                "[WEBRTC] Dispatched call:error event for room not found",
              );
            } catch (eventError) {
              console.error(
                "[WEBRTC] Error dispatching room not found error event:",
                eventError,
              );
            }
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

          // Store information about finishing joining in sessionStorage for debugging
          try {
            const finishJoins = JSON.parse(
              sessionStorage.getItem("finishJoins") || "[]",
            );
            finishJoins.push({
              roomId,
              timestamp: new Date().toISOString(),
              producersCount: response.producers
                ? response.producers.length
                : 0,
            });
            // Keep only the last 5 joins to avoid storage issues
            if (finishJoins.length > 5) {
              finishJoins.shift();
            }
            sessionStorage.setItem("finishJoins", JSON.stringify(finishJoins));
            console.log(
              `[WEBRTC] Stored finish joining information in sessionStorage for room ${roomId}`,
            );
          } catch (storageError) {
            console.error(
              "[WEBRTC] Error storing finish joining information:",
              storageError,
            );
          }

          // Emit finishJoining event to server
          state.socket!.emit("finishJoining", { roomId });

          // Dispatch an event to notify that we've finished joining
          try {
            window.dispatchEvent(
              new CustomEvent("webrtc:finishJoining", {
                detail: {
                  roomId,
                  timestamp: new Date().toISOString(),
                },
              }),
            );
            console.log(
              `[WEBRTC] Dispatched webrtc:finishJoining event for room ${roomId}`,
            );

            // Also try to notify via BroadcastChannel
            try {
              const callChannel = new BroadcastChannel("call_events");
              callChannel.postMessage({
                type: "FINISH_JOINING",
                roomId: roomId,
                timestamp: new Date().toISOString(),
              });
              console.log(
                `[WEBRTC] Sent FINISH_JOINING message via BroadcastChannel for room ${roomId}`,
              );
              callChannel.close();
            } catch (channelError) {
              console.error(
                "[WEBRTC] Error sending message via BroadcastChannel:",
                channelError,
              );
            }
          } catch (eventError) {
            console.error(
              "[WEBRTC] Error dispatching finish joining events:",
              eventError,
            );
          }

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
  } catch (error: any) {
    console.error("Error setting up room connection:", error);

    // Check if this is an AwaitQueueStoppedError
    if (
      error &&
      (error.name === "AwaitQueueStoppedError" ||
        (error.message && error.message.includes("queue stopped")))
    ) {
      console.warn(
        "[WEBRTC] Caught AwaitQueueStoppedError, attempting recovery",
      );

      // Set a flag in sessionStorage to indicate we've encountered this error
      try {
        // Store error details for debugging
        const queueErrors = JSON.parse(
          sessionStorage.getItem("queueStoppedErrors") || "[]",
        );
        queueErrors.push({
          timestamp: new Date().toISOString(),
          roomId: roomId,
          location: "setupRoomConnection",
        });
        // Keep only the last 5 errors
        if (queueErrors.length > 5) {
          queueErrors.shift();
        }
        sessionStorage.setItem(
          "queueStoppedErrors",
          JSON.stringify(queueErrors),
        );

        // Set a flag to prevent immediate retries
        sessionStorage.setItem("webrtc_queue_stopped", "true");

        // Clear the flag after a delay to allow future attempts
        setTimeout(() => {
          sessionStorage.removeItem("webrtc_queue_stopped");
          console.log("[WEBRTC] Cleared queue stopped flag after timeout");
        }, 10000); // Clear after 10 seconds
      } catch (storageError) {
        console.warn("[WEBRTC] Error accessing sessionStorage:", storageError);
      }

      // Perform safe cleanup
      await safeCleanup();

      // Add a longer delay before attempting recovery
      console.log("[WEBRTC] Waiting 1 second before attempting recovery");
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Try to finish joining anyway to ensure the UI updates correctly
      try {
        console.log(
          "[WEBRTC] Attempting to finish joining despite queue error",
        );
        if (state.socket) {
          // Check if socket is still connected
          if (!state.socket.connected) {
            console.log(
              "[WEBRTC] Socket disconnected, attempting to reconnect",
            );
            try {
              // Try to reconnect the socket
              state.socket.connect();

              // Wait for connection or timeout
              await new Promise((resolve, reject) => {
                const connectTimeout = setTimeout(() => {
                  console.log("[WEBRTC] Socket reconnection timed out");
                  reject(new Error("Socket reconnection timeout"));
                }, 5000);

                const connectHandler = () => {
                  clearTimeout(connectTimeout);
                  console.log("[WEBRTC] Socket reconnected successfully");
                  resolve(true);
                };

                state.socket!.once("connect", connectHandler);

                // Clean up if we timeout
                setTimeout(() => {
                  state.socket!.off("connect", connectHandler);
                }, 5000);
              });
            } catch (reconnectError) {
              console.error(
                "[WEBRTC] Error reconnecting socket:",
                reconnectError,
              );
            }
          }

          // Add a small delay before sending finishJoining to ensure cleanup is complete
          await new Promise((resolve) => setTimeout(resolve, 500));

          state.socket.emit("finishJoining", { roomId });
          console.log("[WEBRTC] Sent finishJoining event after queue error");

          // Get the current user ID
          const userId =
            useAuthStore.getState().user?.id ||
            sessionStorage.getItem("currentUserId") ||
            "unknown";

          // Dispatch events with more complete information
          const timestamp = new Date().toISOString();

          // Dispatch an event to notify that the participant has joined
          // This helps ensure the UI updates correctly
          window.dispatchEvent(
            new CustomEvent("webrtc:participantJoined", {
              detail: {
                userId: userId,
                roomId: roomId,
                timestamp: timestamp,
                recoveredFromError: true,
              },
            }),
          );
          console.log("[WEBRTC] Dispatched webrtc:participantJoined event");

          // Instead of dispatching a standard call:participant:joined event,
          // dispatch a special error recovery event to avoid confusion
          window.dispatchEvent(
            new CustomEvent("webrtc:errorRecovery", {
              detail: {
                userId: userId,
                roomId: roomId,
                timestamp: timestamp,
                recoveredFromError: true,
                errorType: "AwaitQueueStoppedError",
              },
            }),
          );
          console.log("[WEBRTC] Dispatched webrtc:errorRecovery event");

          // Also try to notify via BroadcastChannel
          try {
            const callChannel = new BroadcastChannel("call_events");
            callChannel.postMessage({
              type: "PARTICIPANT_JOINED",
              userId: userId,
              roomId: roomId,
              timestamp: timestamp,
              recoveredFromError: true,
            });
            console.log(
              "[WEBRTC] Sent PARTICIPANT_JOINED message via BroadcastChannel",
            );
            callChannel.close();
          } catch (channelError) {
            console.error(
              "[WEBRTC] Error sending message via BroadcastChannel:",
              channelError,
            );
          }

          // Dispatch a special event to notify that we've recovered from an error
          window.dispatchEvent(
            new CustomEvent("webrtc:recoveredFromError", {
              detail: {
                errorType: "AwaitQueueStoppedError",
                roomId: roomId,
                timestamp: timestamp,
              },
            }),
          );
          console.log("[WEBRTC] Dispatched webrtc:recoveredFromError event");

          // Dispatch a call:connected event to ensure UI updates
          window.dispatchEvent(
            new CustomEvent("call:connected", {
              detail: {
                roomId: roomId,
                timestamp: timestamp,
                recoveredFromError: true,
              },
            }),
          );
          console.log("[WEBRTC] Dispatched call:connected event");

          // Return without throwing to allow the call to proceed
          return;
        } else {
          console.error("[WEBRTC] Socket is null, cannot finish joining");
        }
      } catch (finishError) {
        console.error(
          "[WEBRTC] Error in finishJoining during error recovery:",
          finishError,
        );
      }
    }

    // For other errors, perform cleanup and rethrow
    await safeCleanup();

    // Dispatch an error event to notify UI components
    try {
      window.dispatchEvent(
        new CustomEvent("webrtc:connectionError", {
          detail: {
            error: error.message || "Unknown error",
            roomId: roomId,
            timestamp: new Date().toISOString(),
          },
        }),
      );
    } catch (eventError) {
      console.error(
        "Error dispatching webrtc:connectionError event:",
        eventError,
      );
    }

    throw error;
  }
}
