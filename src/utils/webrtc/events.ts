import { Socket } from "socket.io-client";
import { useAuthStore } from "@/stores/authStore";
import { state } from "./state";
import { cleanup } from "./cleanup";
import { consume } from "./consumer";

/**
 * Set up socket event listeners
 */
export function setupSocketListeners(socket: Socket): void {
  socket.on("disconnect", (reason) => {
    console.log(`[WEBRTC] Socket disconnected: ${reason}`);

    // Store disconnect reason in sessionStorage for debugging
    try {
      const disconnects = JSON.parse(
        sessionStorage.getItem("socketDisconnects") || "[]",
      );
      disconnects.push({
        reason,
        timestamp: new Date().toISOString(),
        socketId: socket.id || "unknown",
      });
      // Keep only the last 5 disconnects
      if (disconnects.length > 5) {
        disconnects.shift();
      }
      sessionStorage.setItem("socketDisconnects", JSON.stringify(disconnects));
    } catch (storageError) {
      console.warn(
        "[WEBRTC] Error storing socket disconnect in sessionStorage:",
        storageError,
      );
    }

    // Dispatch an event to notify that socket disconnected
    try {
      window.dispatchEvent(
        new CustomEvent("webrtc:socketDisconnected", {
          detail: {
            reason,
            timestamp: new Date().toISOString(),
          },
        }),
      );
      console.log("[WEBRTC] Dispatched webrtc:socketDisconnected event");
    } catch (eventError) {
      console.error(
        "[WEBRTC] Error dispatching webrtc:socketDisconnected event:",
        eventError,
      );
    }

    // Handle different disconnect reasons
    switch (reason) {
      case "io server disconnect":
        // Server explicitly disconnected us, try to reconnect
        console.log("[WEBRTC] Server disconnected us, attempting to reconnect");
        socket.connect();
        break;

      case "io client disconnect":
        // Client explicitly disconnected, don't reconnect automatically
        console.log(
          "[WEBRTC] Client explicitly disconnected, not attempting to reconnect",
        );
        // This is likely from our own cleanup code, so don't reconnect
        break;

      case "transport close":
      case "ping timeout":
      case "transport error":
        // Network-related issues, try to reconnect after a delay
        console.log(`[WEBRTC] Attempting to reconnect socket after ${reason}`);
        setTimeout(() => {
          if (!state.socket || !state.socket.connected) {
            console.log(`[WEBRTC] Reconnecting socket after ${reason}`);
            socket.connect();
          }
        }, 2000);
        break;

      default:
        // For any other reason, try to reconnect after a longer delay
        console.log(
          `[WEBRTC] Unknown disconnect reason: ${reason}, attempting to reconnect after delay`,
        );
        setTimeout(() => {
          if (!state.socket || !state.socket.connected) {
            console.log(
              `[WEBRTC] Reconnecting socket after unknown disconnect reason: ${reason}`,
            );
            socket.connect();
          }
        }, 3000);
        break;
    }
  });

  socket.on("reconnect", (attemptNumber) => {
    console.log(`[WEBRTC] Socket reconnected after ${attemptNumber} attempts`);

    // Dispatch an event to notify that socket reconnected
    try {
      window.dispatchEvent(
        new CustomEvent("webrtc:socketReconnected", {
          detail: {
            socketId: socket.id,
            attemptNumber,
            timestamp: new Date().toISOString(),
          },
        }),
      );
      console.log("[WEBRTC] Dispatched webrtc:socketReconnected event");
    } catch (eventError) {
      console.error(
        "[WEBRTC] Error dispatching webrtc:socketReconnected event:",
        eventError,
      );
    }
  });

  socket.on("error", (error) => {
    console.error("[WEBRTC] Socket error:", error);

    // Dispatch an event to notify of socket error
    try {
      window.dispatchEvent(
        new CustomEvent("webrtc:socketError", {
          detail: {
            error:
              typeof error === "string"
                ? error
                : error.message || "Unknown error",
            timestamp: new Date().toISOString(),
          },
        }),
      );
      console.log("[WEBRTC] Dispatched webrtc:socketError event");
    } catch (eventError) {
      console.error(
        "[WEBRTC] Error dispatching webrtc:socketError event:",
        eventError,
      );
    }
  });

  socket.on("newProducer", async (data) => {
    try {
      const { producerId, producerUserId, kind } = data;
      console.log(
        `[WEBRTC] New producer: ${producerId}, kind: ${kind}, from user: ${producerUserId}`,
      );

      // Don't consume our own producers
      const currentUserId =
        useAuthStore.getState().user?.id ||
        sessionStorage.getItem("currentUserId");
      if (producerUserId === currentUserId) {
        console.log("[WEBRTC] Ignoring own producer");
        return;
      }

      await consume(producerId, kind);

      // Dispatch an event to notify that a new producer was consumed
      try {
        window.dispatchEvent(
          new CustomEvent("webrtc:producerConsumed", {
            detail: {
              producerId,
              kind,
              producerUserId,
              timestamp: new Date().toISOString(),
            },
          }),
        );
        console.log(
          `[WEBRTC] Dispatched webrtc:producerConsumed event for ${kind}`,
        );
      } catch (eventError) {
        console.error(
          "[WEBRTC] Error dispatching webrtc:producerConsumed event:",
          eventError,
        );
      }
    } catch (error) {
      console.error("[WEBRTC] Error handling newProducer event:", error);
    }
  });

  socket.on("call:ended", async (data) => {
    console.log(
      "[WEBRTC] Call ended by server:",
      data?.reason || "No reason provided",
    );
    await cleanup();

    // Notify the UI that the call has ended
    window.dispatchEvent(
      new CustomEvent("webrtc:callEnded", {
        detail: {
          reason: data?.reason || "ended_by_server",
          timestamp: new Date().toISOString(),
        },
      }),
    );

    // Also dispatch a more general call:ended event for broader compatibility
    window.dispatchEvent(
      new CustomEvent("call:ended", {
        detail: {
          reason: data?.reason || "ended_by_server",
          timestamp: new Date().toISOString(),
        },
      }),
    );
  });

  socket.on("call:error", async (data) => {
    console.error("[WEBRTC] Call error from server:", data.error);

    // Notify the UI about the error
    window.dispatchEvent(
      new CustomEvent("webrtc:callError", {
        detail: {
          error: data.error,
          timestamp: new Date().toISOString(),
        },
      }),
    );

    // Also dispatch a more general call:error event for broader compatibility
    window.dispatchEvent(
      new CustomEvent("call:error", {
        detail: {
          error: data.error,
          timestamp: new Date().toISOString(),
        },
      }),
    );
  });

  socket.on("participantLeft", async (data) => {
    console.log("[WEBRTC] Participant left:", data.userId);

    // Notify the UI that a participant has left
    window.dispatchEvent(
      new CustomEvent("webrtc:participantLeft", {
        detail: {
          userId: data.userId,
          roomId: data.roomId,
          timestamp: new Date().toISOString(),
        },
      }),
    );

    // Also dispatch a more general call:participant:left event for broader compatibility
    window.dispatchEvent(
      new CustomEvent("call:participant:left", {
        detail: {
          userId: data.userId,
          roomId: data.roomId,
          timestamp: new Date().toISOString(),
        },
      }),
    );
  });

  socket.on("participantJoined", async (data) => {
    console.log("[WEBRTC] Participant joined:", data.userId);

    // Store information about participant joining in sessionStorage for debugging
    try {
      const participantJoins = JSON.parse(
        sessionStorage.getItem("socketParticipantJoins") || "[]",
      );
      participantJoins.push({
        userId: data.userId,
        roomId: data.roomId,
        timestamp: new Date().toISOString(),
        source: "socket_event",
      });
      // Keep only the last 5 joins to avoid storage issues
      if (participantJoins.length > 5) {
        participantJoins.shift();
      }
      sessionStorage.setItem(
        "socketParticipantJoins",
        JSON.stringify(participantJoins),
      );
      console.log(
        `[WEBRTC] Stored participant join information in sessionStorage for user ${data.userId}`,
      );
    } catch (storageError) {
      console.error(
        "[WEBRTC] Error storing participant join information:",
        storageError,
      );
    }

    // Notify the UI that a participant has joined
    window.dispatchEvent(
      new CustomEvent("webrtc:participantJoined", {
        detail: {
          userId: data.userId,
          roomId: data.roomId,
          timestamp: new Date().toISOString(),
          source: "socket_event",
        },
      }),
    );

    // Also dispatch a more general call:participant:joined event for broader compatibility
    window.dispatchEvent(
      new CustomEvent("call:participant:joined", {
        detail: {
          userId: data.userId,
          roomId: data.roomId,
          timestamp: new Date().toISOString(),
          source: "socket_event",
          fromServer: true, // Add a flag to indicate this event came from the server
        },
      }),
    );

    // Also try to notify via BroadcastChannel to ensure all windows are updated
    try {
      const callChannel = new BroadcastChannel("call_events");
      callChannel.postMessage({
        type: "CALL_PARTICIPANT_JOINED",
        userId: data.userId,
        roomId: data.roomId,
        timestamp: new Date().toISOString(),
        source: "socket_event",
      });
      console.log(
        `[WEBRTC] Sent CALL_PARTICIPANT_JOINED message via BroadcastChannel for user ${data.userId}`,
      );
      callChannel.close();
    } catch (channelError) {
      console.error(
        "[WEBRTC] Error sending message via BroadcastChannel:",
        channelError,
      );
    }
  });

  socket.on("call:accepted", async (data) => {
    console.log("[WEBRTC] Call accepted:", data);

    // Dispatch event to notify that call was accepted
    window.dispatchEvent(
      new CustomEvent("call:accepted", {
        detail: {
          ...data,
          timestamp: new Date().toISOString(),
        },
      }),
    );
  });

  socket.on("call:rejected", async (data) => {
    console.log("[WEBRTC] Call rejected:", data);

    // Dispatch event to notify that call was rejected
    window.dispatchEvent(
      new CustomEvent("call:rejected", {
        detail: {
          ...data,
          timestamp: new Date().toISOString(),
        },
      }),
    );
  });

  socket.on("producerClosed", (data) => {
    const { producerId, kind } = data;
    console.log(
      `[WEBRTC] Producer closed: ${producerId}, kind: ${kind || "unknown"}`,
    );

    // Find the consumer associated with this producer
    state.consumers.forEach((consumer, id) => {
      if (consumer.producerId === producerId) {
        console.log(
          `[WEBRTC] Closing consumer ${id} for producer ${producerId}`,
        );
        consumer.close();
        state.consumers.delete(id);
        state.remoteStreams.delete(id);

        // Notify the UI that a stream has been removed
        window.dispatchEvent(
          new CustomEvent("webrtc:streamRemoved", {
            detail: {
              id,
              kind: kind || consumer.kind || "unknown",
              timestamp: new Date().toISOString(),
            },
          }),
        );
      }
    });
  });

  // Handle room-related events
  socket.on("room:created", (data) => {
    console.log(`[WEBRTC] Room created: ${data.roomId}`);

    // Dispatch event to notify that room was created
    window.dispatchEvent(
      new CustomEvent("webrtc:roomCreated", {
        detail: {
          ...data,
          timestamp: new Date().toISOString(),
        },
      }),
    );
  });

  socket.on("room:closed", (data) => {
    console.log(`[WEBRTC] Room closed: ${data.roomId}`);

    // Dispatch event to notify that room was closed
    window.dispatchEvent(
      new CustomEvent("webrtc:roomClosed", {
        detail: {
          ...data,
          timestamp: new Date().toISOString(),
        },
      }),
    );
  });

  socket.on("room:joined", (data) => {
    console.log(`[WEBRTC] Room joined: ${data.roomId}`);

    // Dispatch event to notify that room was joined
    window.dispatchEvent(
      new CustomEvent("webrtc:roomJoined", {
        detail: {
          ...data,
          timestamp: new Date().toISOString(),
        },
      }),
    );
  });
}

/**
 * Set up event listeners for remote streams
 */
export function setupRemoteStreamListeners(): void {
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

  // Listen for call acceptance failures
  window.addEventListener("call:acceptance:failed", (event: any) => {
    const { callId, roomId, error } = event.detail;
    console.log(
      `[WEBRTC] Call acceptance failed: ${error}, callId: ${callId}, roomId: ${roomId}`,
    );

    // Notify the UI that the call acceptance failed
    window.dispatchEvent(
      new CustomEvent("call:error", {
        detail: {
          error: `Không thể tham gia cuộc gọi: ${error}`,
          callId,
          roomId,
          timestamp: new Date().toISOString(),
          code: "CALL_ACCEPTANCE_FAILED",
        },
      }),
    );
  });

  // Listen for AwaitQueueStoppedError
  window.addEventListener("error", (event: ErrorEvent) => {
    // Check if this is an AwaitQueueStoppedError
    if (
      event.error &&
      (event.error.name === "AwaitQueueStoppedError" ||
        (event.error.message && event.error.message.includes("queue stopped")))
    ) {
      console.warn(
        "[WEBRTC] Caught AwaitQueueStoppedError in global handler, attempting recovery",
      );

      // Get current room ID and call ID from session storage
      const roomId = sessionStorage.getItem("callRoomId");
      const callId = sessionStorage.getItem("currentCallId");

      // Check if we're in the process of initiating a call
      const isInitiatingCall =
        sessionStorage.getItem("initiatingCall") === "true";

      // Check if we've already handled this error recently to prevent multiple recoveries
      const lastErrorTime = parseInt(
        sessionStorage.getItem("lastQueueStoppedErrorTime") || "0",
        10,
      );
      const now = Date.now();
      const errorThrottleTime = 3000; // 3 seconds - reduced from 5s to be more responsive

      if (now - lastErrorTime < errorThrottleTime) {
        console.log(
          "[WEBRTC] Skipping duplicate AwaitQueueStoppedError recovery (throttled)",
        );
        event.preventDefault();
        return;
      }

      // Update the last error time
      sessionStorage.setItem("lastQueueStoppedErrorTime", now.toString());

      // Store error details for debugging
      try {
        const queueErrors = JSON.parse(
          sessionStorage.getItem("queueStoppedErrors") || "[]",
        );
        queueErrors.push({
          timestamp: new Date().toISOString(),
          roomId: roomId || "unknown",
          callId: callId || "unknown",
          location: "global_error_handler",
          message: event.error.message || "No message",
          stack: event.error.stack || "No stack",
          isInitiatingCall: isInitiatingCall,
        });
        // Keep only the last 5 errors
        if (queueErrors.length > 5) {
          queueErrors.shift();
        }
        sessionStorage.setItem(
          "queueStoppedErrors",
          JSON.stringify(queueErrors),
        );
      } catch (storageError) {
        console.error(
          "[WEBRTC] Error storing queue stopped error details:",
          storageError,
        );
      }

      // If this error happens during call initiation, we need special handling
      if (isInitiatingCall) {
        console.log(
          "[WEBRTC] AwaitQueueStoppedError occurred during call initiation, handling specially",
        );

        // Clear the initiating call flag
        sessionStorage.removeItem("initiatingCall");

        // Dispatch an event to notify about the error during call initiation
        window.dispatchEvent(
          new CustomEvent("call:initiation:error", {
            detail: {
              error: "Không thể khởi tạo cuộc gọi: Lỗi kết nối",
              callId,
              roomId,
              timestamp: new Date().toISOString(),
              code: "AWAIT_QUEUE_STOPPED_DURING_INITIATION",
            },
          }),
        );

        // Prevent the error from propagating
        event.preventDefault();
        return;
      }

      // Try to perform an emergency cleanup to reset the state
      try {
        console.log(
          "[WEBRTC] Performing emergency cleanup from global error handler",
        );

        // Import cleanup function dynamically to avoid circular dependencies
        import("./cleanup")
          .then(({ cleanup }) => {
            cleanup()
              .then(() => {
                console.log(
                  "[WEBRTC] Emergency cleanup completed from global error handler",
                );

                // Dispatch an event to notify that recovery was attempted
                window.dispatchEvent(
                  new CustomEvent("webrtc:recoveryAttempted", {
                    detail: {
                      error: "AwaitQueueStoppedError",
                      callId,
                      roomId,
                      timestamp: new Date().toISOString(),
                    },
                  }),
                );

                // If we have a roomId, try to rejoin the call after cleanup
                if (roomId && callId) {
                  console.log(
                    "[WEBRTC] Attempting to rejoin call after cleanup",
                  );

                  // Wait a moment before attempting to rejoin
                  setTimeout(() => {
                    window.dispatchEvent(
                      new CustomEvent("webrtc:attemptRejoin", {
                        detail: {
                          callId,
                          roomId,
                          timestamp: new Date().toISOString(),
                        },
                      }),
                    );
                  }, 1000);
                }
              })
              .catch((cleanupError) => {
                console.error(
                  "[WEBRTC] Error during emergency cleanup from global error handler:",
                  cleanupError,
                );
              });
          })
          .catch((importError) => {
            console.error(
              "[WEBRTC] Error importing cleanup function:",
              importError,
            );
          });
      } catch (cleanupError) {
        console.error(
          "[WEBRTC] Error initiating emergency cleanup:",
          cleanupError,
        );
      }

      // Dispatch an event to notify about the error
      window.dispatchEvent(
        new CustomEvent("call:error", {
          detail: {
            error: "Không thể kết nối cuộc gọi: Lỗi kết nối",
            callId,
            roomId,
            timestamp: new Date().toISOString(),
            code: "AWAIT_QUEUE_STOPPED",
          },
        }),
      );

      // Also try to notify via BroadcastChannel to ensure all windows are updated
      try {
        const callChannel = new BroadcastChannel("call_events");
        callChannel.postMessage({
          type: "CALL_ERROR",
          error: "Không thể kết nối cuộc gọi: Lỗi kết nối",
          code: "AWAIT_QUEUE_STOPPED",
          callId,
          roomId,
          timestamp: new Date().toISOString(),
        });
        console.log("[WEBRTC] Broadcast CALL_ERROR message to all windows");
        callChannel.close();
      } catch (channelError) {
        console.error("[WEBRTC] Error broadcasting call error:", channelError);
      }

      // Prevent the error from propagating
      event.preventDefault();
    }
  });
}
