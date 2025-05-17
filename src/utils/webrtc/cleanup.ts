import { state } from "./state";
import { setCurrentRoomId } from "./state";

// Global flag to track if cleanup is in progress
let isCleaningUpGlobal = false;

/**
 * Check if cleanup is in progress
 * @returns boolean indicating if cleanup is in progress
 */
export function isCleanupInProgress(): boolean {
  return isCleaningUpGlobal;
}

/**
 * Clean up WebRTC resources
 * @returns Promise that resolves when cleanup is complete
 */
export async function cleanup(): Promise<void> {
  return new Promise<void>((resolve) => {
    try {
      console.log("[WEBRTC] Starting cleanup process");

      // Set global cleanup flag
      isCleaningUpGlobal = true;

      // Also set a flag in sessionStorage for cross-component awareness
      try {
        sessionStorage.setItem("webrtc_cleaning_up", "true");
      } catch (storageError) {
        console.warn(
          "[WEBRTC] Error setting cleanup flag in storage:",
          storageError,
        );
      }

      // Create a local flag to track if we're already cleaning up
      let isCleaningUp = false;

      // First, safely stop any await queues before doing anything else
      // This helps prevent AwaitQueueStoppedError
      const safelyStopAwaitQueues = () => {
        try {
          // Set a flag in sessionStorage to indicate we're cleaning up
          try {
            sessionStorage.setItem("webrtc_cleaning_up", "true");

            // Clear the flag after a delay
            setTimeout(() => {
              try {
                sessionStorage.removeItem("webrtc_cleaning_up");
                console.log(
                  "[WEBRTC] Cleared cleanup flag from sessionStorage",
                );
              } catch (storageError) {
                console.warn(
                  "[WEBRTC] Error clearing cleanup flag:",
                  storageError,
                );
              }
            }, 5000); // Clear after 5 seconds
          } catch (storageError) {
            console.warn("[WEBRTC] Error setting cleanup flag:", storageError);
          }

          // Helper function to safely stop a queue with better error handling
          const safelyStopQueue = (
            transport: any,
            transportType: string,
          ): Promise<void> => {
            return new Promise((resolve) => {
              if (!transport || !transport._awaitQueue) {
                console.log(
                  `[WEBRTC] No ${transportType} transport or queue to stop`,
                );
                resolve();
                return;
              }

              try {
                console.log(
                  `[WEBRTC] Safely stopping ${transportType} transport await queue`,
                );

                // Check if the queue is already stopped to avoid errors
                if (
                  typeof transport._awaitQueue.isStopped === "function" &&
                  transport._awaitQueue.isStopped()
                ) {
                  console.log(
                    `[WEBRTC] ${transportType} transport await queue is already stopped`,
                  );
                  resolve();
                  return;
                }

                // First, try to drain the queue by processing all pending tasks
                if (
                  transport._awaitQueue.pendingTasks !== undefined &&
                  transport._awaitQueue.pendingTasks > 0
                ) {
                  console.log(
                    `[WEBRTC] ${transportType} transport has ${transport._awaitQueue.pendingTasks} pending tasks, attempting to drain`,
                  );

                  // Wait longer to allow pending tasks to complete (increased from 100ms to 500ms)
                  setTimeout(() => {
                    try {
                      // Check again if there are still pending tasks
                      if (
                        transport._awaitQueue.pendingTasks !== undefined &&
                        transport._awaitQueue.pendingTasks > 0
                      ) {
                        console.log(
                          `[WEBRTC] ${transportType} transport still has ${transport._awaitQueue.pendingTasks} pending tasks after waiting, stopping anyway`,
                        );
                      }

                      // Now stop the queue
                      transport._awaitQueue.stop();
                      console.log(
                        `[WEBRTC] ${transportType} transport await queue stopped after drain attempt`,
                      );
                      resolve();
                    } catch (stopError: any) {
                      // Check if this is an AwaitQueueStoppedError
                      if (
                        stopError.name === "AwaitQueueStoppedError" ||
                        (stopError.message &&
                          stopError.message.includes("queue stopped"))
                      ) {
                        console.log(
                          `[WEBRTC] ${transportType} queue was already stopped, continuing cleanup`,
                        );
                      } else {
                        console.error(
                          `[WEBRTC] Error stopping ${transportType} transport queue after drain:`,
                          stopError,
                        );
                      }
                      resolve(); // Resolve anyway to continue cleanup
                    }
                  }, 500); // Increased timeout to 500ms
                } else {
                  // No pending tasks, stop immediately
                  try {
                    transport._awaitQueue.stop();
                    console.log(
                      `[WEBRTC] ${transportType} transport await queue stopped successfully`,
                    );
                  } catch (stopError: any) {
                    // Check if this is an AwaitQueueStoppedError
                    if (
                      stopError.name === "AwaitQueueStoppedError" ||
                      (stopError.message &&
                        stopError.message.includes("queue stopped"))
                    ) {
                      console.log(
                        `[WEBRTC] ${transportType} queue was already stopped, continuing cleanup`,
                      );
                    } else {
                      console.error(
                        `[WEBRTC] Error stopping ${transportType} transport queue:`,
                        stopError,
                      );
                    }
                  }
                  resolve();
                }
              } catch (queueError: any) {
                console.error(
                  `[WEBRTC] Error handling ${transportType} transport await queue:`,
                  queueError,
                );

                // If we get an AwaitQueueStoppedError, it means the queue is already stopped
                if (
                  queueError.name === "AwaitQueueStoppedError" ||
                  (queueError.message &&
                    queueError.message.includes("queue stopped"))
                ) {
                  console.log(
                    `[WEBRTC] ${transportType} queue already stopped (AwaitQueueStoppedError), continuing cleanup`,
                  );
                }

                resolve(); // Resolve anyway to continue cleanup
              }
            });
          };

          // Use Promise.all to stop both queues in parallel
          Promise.all([
            safelyStopQueue(state.sendTransport as any, "send"),
            safelyStopQueue(state.recvTransport as any, "receive"),
          ]).catch((error) => {
            console.error("[WEBRTC] Error stopping queues:", error);
          });
        } catch (error) {
          console.error("[WEBRTC] Error in safelyStopAwaitQueues:", error);
        }
      };

      // Stop await queues first to prevent AwaitQueueStoppedError
      safelyStopAwaitQueues();

      // Add a longer delay to ensure queues are fully stopped before proceeding
      // Increased from 300ms to 800ms to give more time for queue operations to complete
      setTimeout(() => {
        if (isCleaningUp) {
          console.log(
            "[WEBRTC] Cleanup already in progress, skipping duplicate cleanup",
          );
          resolve();
          return;
        }

        isCleaningUp = true;

        // First, disconnect socket to prevent new events during cleanup
        if (state.socket) {
          try {
            console.log("[WEBRTC] Disconnecting socket");

            // Store the socket ID before disconnecting for debugging
            const socketId = state.socket.id;
            console.log(
              `[WEBRTC] Disconnecting socket with ID: ${socketId || "unknown"}`,
            );

            // Set flags in sessionStorage to indicate we're intentionally disconnecting
            try {
              sessionStorage.setItem("intentional_disconnect", "true");
              // We'll clear this flag after the entire cleanup process is complete
            } catch (storageError) {
              console.warn(
                "[WEBRTC] Error setting intentional disconnect flag:",
                storageError,
              );
            }

            // Use emit instead of disconnect to ensure server is notified
            state.socket.emit("clientDisconnecting", {
              reason: "cleanup",
              timestamp: new Date().toISOString(),
            });

            // Small delay to allow the message to be sent
            setTimeout(() => {
              try {
                if (state.socket) {
                  // Now disconnect the socket
                  state.socket.disconnect();
                  console.log(
                    `[WEBRTC] Socket with ID ${socketId || "unknown"} disconnected`,
                  );

                  // Set socket to null immediately to prevent reconnection attempts
                  state.socket = null;

                  // Add a small delay to ensure the disconnect is processed
                  setTimeout(() => {
                    console.log(
                      "[WEBRTC] Socket disconnect processing complete",
                    );
                  }, 500);
                }
              } catch (disconnectError) {
                console.error(
                  "[WEBRTC] Error during socket disconnect:",
                  disconnectError,
                );
                // Still set socket to null even if there was an error
                state.socket = null;
              }
            }, 300); // Increased to 300ms to ensure message is sent
          } catch (socketError) {
            console.error(
              "[WEBRTC] Error with socket during cleanup:",
              socketError,
            );
            state.socket = null;
          }
        }

        // Stop local stream tracks first to prevent media issues
        if (state.localStream) {
          console.log("[WEBRTC] Stopping local stream tracks");
          state.localStream.getTracks().forEach((track) => {
            try {
              track.stop();
              console.log(`[WEBRTC] Stopped ${track.kind} track: ${track.id}`);
            } catch (trackError) {
              console.error(
                `[WEBRTC] Error stopping ${track.kind} track:`,
                trackError,
              );
            }
          });
          state.localStream = null;
        }

        // Close all producers with error handling for each one
        console.log(`[WEBRTC] Closing ${state.producers.size} producers`);
        state.producers.forEach((producer, kind) => {
          try {
            console.log(`[WEBRTC] Closing ${kind} producer: ${producer.id}`);
            producer.close();
          } catch (producerError) {
            console.error(
              `[WEBRTC] Error closing ${kind} producer:`,
              producerError,
            );
          }
        });
        state.producers.clear();

        // Close all consumers with error handling for each one
        console.log(`[WEBRTC] Closing ${state.consumers.size} consumers`);
        state.consumers.forEach((consumer, id) => {
          try {
            console.log(`[WEBRTC] Closing consumer: ${id}`);
            consumer.close();
          } catch (consumerError) {
            console.error(
              `[WEBRTC] Error closing consumer ${id}:`,
              consumerError,
            );
          }
        });
        state.consumers.clear();

        // Close transports with proper error handling
        // Close send transport
        if (state.sendTransport) {
          console.log("[WEBRTC] Closing send transport");
          try {
            // Check if the transport is already closed to avoid errors
            const transport = state.sendTransport as any;
            if (transport.closed) {
              console.log("[WEBRTC] Send transport is already closed");
            } else {
              // Now close the transport (queues already stopped above)
              state.sendTransport.close();
              console.log("[WEBRTC] Send transport closed successfully");
            }
          } catch (sendError) {
            console.error("[WEBRTC] Error closing send transport:", sendError);
          } finally {
            state.sendTransport = null;
          }
        }

        // Close receive transport
        if (state.recvTransport) {
          console.log("[WEBRTC] Closing receive transport");
          try {
            // Check if the transport is already closed to avoid errors
            const transport = state.recvTransport as any;
            if (transport.closed) {
              console.log("[WEBRTC] Receive transport is already closed");
            } else {
              // Now close the transport (queues already stopped above)
              state.recvTransport.close();
              console.log("[WEBRTC] Receive transport closed successfully");
            }
          } catch (recvError) {
            console.error(
              "[WEBRTC] Error closing receive transport:",
              recvError,
            );
          } finally {
            state.recvTransport = null;
          }
        }

        // Clear remote streams
        console.log(
          `[WEBRTC] Clearing ${state.remoteStreams.size} remote streams`,
        );
        state.remoteStreams.clear();

        // Clear device
        console.log("[WEBRTC] Clearing device");
        state.device = null;

        // Clear keep-alive interval if it exists
        if (state.keepAliveInterval) {
          console.log("[WEBRTC] Clearing keep-alive interval");
          clearInterval(state.keepAliveInterval);
          state.keepAliveInterval = null;
        }

        // Clear current room ID
        setCurrentRoomId(null);

        console.log("[WEBRTC] Cleanup completed successfully");
        isCleaningUp = false;

        // Reset global cleanup flag
        isCleaningUpGlobal = false;

        // Clear all flags in sessionStorage
        try {
          sessionStorage.removeItem("webrtc_cleaning_up");
          sessionStorage.removeItem("intentional_disconnect");
          console.log("[WEBRTC] Cleared all cleanup flags from sessionStorage");
        } catch (storageError) {
          console.warn("[WEBRTC] Error clearing cleanup flags:", storageError);
        }

        // Add a small delay before resolving to ensure all cleanup operations are complete
        setTimeout(() => {
          console.log("[WEBRTC] Cleanup process fully completed");
          resolve();
        }, 500);
      }, 800); // Increased delay to ensure queues are fully stopped
    } catch (error) {
      console.error("[WEBRTC] Unhandled error during cleanup:", error);

      // Reset all state to ensure clean slate
      state.producers.clear();
      state.consumers.clear();
      state.remoteStreams.clear();
      state.sendTransport = null;
      state.recvTransport = null;
      state.localStream = null;
      state.socket = null;
      state.device = null;

      // Clear keep-alive interval if it exists
      if (state.keepAliveInterval) {
        console.log("[WEBRTC] Clearing keep-alive interval after error");
        clearInterval(state.keepAliveInterval);
        state.keepAliveInterval = null;
      }

      // Clear current room ID
      setCurrentRoomId(null);

      // Reset global cleanup flag even on error
      isCleaningUpGlobal = false;

      // Clear all flags in sessionStorage
      try {
        sessionStorage.removeItem("webrtc_cleaning_up");
        sessionStorage.removeItem("intentional_disconnect");
        console.log("[WEBRTC] Cleared all cleanup flags after error");
      } catch (storageError) {
        console.warn("[WEBRTC] Error clearing cleanup flags:", storageError);
      }

      console.log("[WEBRTC] State reset after cleanup error");

      // Add a small delay before resolving to ensure all cleanup operations are complete
      setTimeout(() => {
        console.log("[WEBRTC] Cleanup process completed with errors");
        resolve(); // Resolve anyway to prevent hanging
      }, 500);
    }
  });
}
