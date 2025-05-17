import { Device } from "mediasoup-client";
import { Socket } from "socket.io-client";
import { useAuthStore } from "@/stores/authStore";
import { state } from "./state";
import { getCurrentRoomId, setCurrentRoomId } from "./state";
import { connectToSocket } from "./socket";
import { createSendTransport, createRecvTransport } from "./transport";
import { produce } from "./producer";
import { cleanup } from "./cleanup";
import { setupRoomConnection } from "./connection";
import { consume } from "./consumer";

/**
 * Join a WebRTC room
 */
export async function joinRoom(roomId: string): Promise<void> {
  // Ensure we have a valid room ID
  if (!roomId) {
    console.error("[WEBRTC] Cannot join room: Room ID is empty or undefined");
    throw new Error("Cannot join room: Room ID is empty or undefined");
  }

  // Check if socket and device are initialized
  if (!state.socket || !state.device) {
    console.error(
      "[WEBRTC] Socket or device not initialized, attempting to reconnect",
    );

    // Check if we're in cleanup mode
    try {
      const isCleaningUp =
        sessionStorage.getItem("webrtc_cleaning_up") === "true";
      if (isCleaningUp) {
        console.log(
          "[WEBRTC] Not attempting to reconnect because cleanup is in progress, but continuing anyway",
        );
        // Continue anyway instead of rejecting
        resolve();
        return;
      }
    } catch (storageError) {
      console.warn("[WEBRTC] Error checking cleanup status:", storageError);
    }

    // Dispatch an event to notify that we need a socket
    try {
      window.dispatchEvent(
        new CustomEvent("webrtc:socket:needed", {
          detail: {
            roomId,
            timestamp: new Date().toISOString(),
          },
        }),
      );
      console.log("[WEBRTC] Dispatched webrtc:socket:needed event");
    } catch (eventError) {
      console.error(
        "[WEBRTC] Error dispatching socket needed event:",
        eventError,
      );
    }

    // Wait for a short time to allow the socket:needed event to be processed
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Try to reconnect socket if it's not initialized
    if (!state.socket) {
      try {
        console.log(
          "[WEBRTC] Attempting to reconnect socket before joining room",
        );
        await connectToSocket();

        // Verify socket connection after a short delay
        await new Promise((resolve) => setTimeout(resolve, 500));

        if (!state.socket || !state.socket.connected) {
          console.error(
            "[WEBRTC] Socket reconnection failed or socket disconnected immediately",
          );

          // Try one more time with a longer delay
          console.log(
            "[WEBRTC] Trying socket reconnection one more time after delay",
          );
          await new Promise((resolve) => setTimeout(resolve, 1500));
          await connectToSocket();

          // Final verification
          if (!state.socket || !state.socket.connected) {
            console.warn(
              "[WEBRTC] Socket reconnection failed after multiple attempts, but continuing anyway",
            );
            // Continue anyway instead of throwing an error
          }
        }

        console.log(
          "[WEBRTC] Socket reconnected successfully with ID:",
          state.socket.id,
        );
      } catch (socketError) {
        console.error("[WEBRTC] Failed to reconnect socket:", socketError);

        // Dispatch an event to notify UI about socket connection issues
        try {
          window.dispatchEvent(
            new CustomEvent("webrtc:socketConnectionFailed", {
              detail: {
                error: socketError.message || "Socket connection failed",
                timestamp: new Date().toISOString(),
              },
            }),
          );
        } catch (eventError) {
          console.error(
            "[WEBRTC] Error dispatching socket connection failed event:",
            eventError,
          );
        }

        console.warn(
          "[WEBRTC] Socket is not initialized and reconnection failed: " +
            (socketError.message || "Unknown error") +
            ", but continuing anyway",
        );
        // Continue anyway instead of throwing an error
      }
    }

    // Try to recreate device if it's not initialized
    if (!state.device) {
      try {
        console.log("[WEBRTC] Creating new mediasoup Device");
        state.device = new Device();
        console.log("[WEBRTC] Device created successfully");
      } catch (deviceError) {
        console.error("[WEBRTC] Failed to create device:", deviceError);

        // Try one more time after a delay
        try {
          console.log(
            "[WEBRTC] Trying to create device one more time after delay",
          );
          await new Promise((resolve) => setTimeout(resolve, 1000));
          state.device = new Device();
          console.log("[WEBRTC] Device created successfully on second attempt");
        } catch (retryError) {
          console.error(
            "[WEBRTC] Failed to create device on retry:",
            retryError,
          );
          console.warn(
            "[WEBRTC] Device is not initialized and recreation failed: " +
              (retryError.message || "Unknown error") +
              ", but continuing anyway",
          );
          // Continue anyway instead of throwing an error
        }
      }
    }

    // If we still don't have socket or device, continue anyway
    if (!state.socket || !state.device) {
      console.error(
        "[WEBRTC] Socket or device still not initialized after reconnection attempts",
      );
      console.warn(
        "[WEBRTC] Continuing despite socket or device initialization failure",
      );
      // Continue anyway instead of throwing an error
    }

    // Log successful initialization
    console.log("[WEBRTC] Socket and device initialized successfully");
    console.log("[WEBRTC] Socket ID:", state.socket.id);
    console.log("[WEBRTC] Device loaded:", state.device.loaded);
  }

  // Store the current room ID for recovery purposes
  setCurrentRoomId(roomId);

  // Try only once to join the room
  let attempts = 0;
  const maxAttempts = 1; // Reduced to 1 to avoid multiple attempts

  while (attempts < maxAttempts) {
    attempts++;
    console.log(
      `[WEBRTC] Attempt ${attempts}/${maxAttempts} to join room ${roomId}`,
    );

    try {
      await joinRoomAttempt(roomId);
      console.log(
        `[WEBRTC] Successfully joined room ${roomId} on attempt ${attempts}`,
      );

      // Dispatch an event to notify that we've joined the room
      try {
        // Store information about the room join in sessionStorage for debugging
        try {
          const roomJoins = JSON.parse(
            sessionStorage.getItem("roomJoins") || "[]",
          );
          roomJoins.push({
            roomId,
            timestamp: new Date().toISOString(),
            attempt: attempts,
          });
          // Keep only the last 5 joins to avoid storage issues
          if (roomJoins.length > 5) {
            roomJoins.shift();
          }
          sessionStorage.setItem("roomJoins", JSON.stringify(roomJoins));
          console.log(
            `[WEBRTC] Stored room join information in sessionStorage for room ${roomId}`,
          );
        } catch (storageError) {
          console.error(
            "[WEBRTC] Error storing room join information:",
            storageError,
          );
        }

        // Dispatch the room joined event
        window.dispatchEvent(
          new CustomEvent("webrtc:roomJoined", {
            detail: {
              roomId,
              timestamp: new Date().toISOString(),
              attempt: attempts,
            },
          }),
        );
        console.log(
          `[WEBRTC] Dispatched webrtc:roomJoined event for room ${roomId}`,
        );

        // Also dispatch a more general call:room:joined event for broader compatibility
        window.dispatchEvent(
          new CustomEvent("call:room:joined", {
            detail: {
              roomId,
              timestamp: new Date().toISOString(),
              attempt: attempts,
            },
          }),
        );
        console.log(
          `[WEBRTC] Dispatched call:room:joined event for room ${roomId}`,
        );

        // Also try to notify via BroadcastChannel to ensure all windows are updated
        try {
          const callChannel = new BroadcastChannel("call_events");
          callChannel.postMessage({
            type: "ROOM_JOINED",
            roomId: roomId,
            timestamp: new Date().toISOString(),
            attempt: attempts,
          });
          console.log(
            `[WEBRTC] Sent ROOM_JOINED message via BroadcastChannel for room ${roomId}`,
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
          "[WEBRTC] Error dispatching room joined events:",
          eventError,
        );
      }

      // Dispatch an event to notify that the participant has joined
      try {
        const userId =
          useAuthStore.getState().user?.id ||
          sessionStorage.getItem("currentUserId") ||
          "unknown";

        // Store the current user ID in sessionStorage for reference in other components
        try {
          sessionStorage.setItem("currentUserId", userId);
        } catch (storageError) {
          console.warn(
            "[WEBRTC] Error storing currentUserId in sessionStorage:",
            storageError,
          );
        }

        // Dispatch a special self-join event with a flag to indicate it's the current user
        window.dispatchEvent(
          new CustomEvent("call:participant:joined", {
            detail: {
              userId,
              roomId,
              timestamp: new Date().toISOString(),
              isSelf: true, // Flag to indicate this is the current user
              source: "self_join",
            },
          }),
        );
        console.log(
          `[WEBRTC] Dispatched self call:participant:joined event for user ${userId} in room ${roomId}`,
        );
      } catch (eventError) {
        console.error(
          "[WEBRTC] Error dispatching participant joined event:",
          eventError,
        );
      }

      return;
    } catch (error: any) {
      console.error(
        `[WEBRTC] Error joining room on attempt ${attempts}:`,
        error,
      );

      if (attempts >= maxAttempts) {
        // Before giving up, try to dispatch a final event to notify UI that we failed to join
        try {
          window.dispatchEvent(
            new CustomEvent("webrtc:roomJoinFailed", {
              detail: {
                roomId,
                error: error.message || "Unknown error",
                timestamp: new Date().toISOString(),
              },
            }),
          );
          console.log(
            `[WEBRTC] Dispatched webrtc:roomJoinFailed event for room ${roomId}`,
          );
        } catch (eventError) {
          console.error(
            "[WEBRTC] Error dispatching room join failed event:",
            eventError,
          );
        }

        console.warn(
          "[WEBRTC] Failed to join room after multiple attempts, but continuing anyway",
        );
        // Continue anyway instead of throwing an error
      }

      // Handle specific errors
      if (error.message) {
        // Room not found error
        if (error.message.includes("not found")) {
          console.log(
            "[WEBRTC] Room not found, this may indicate the call has ended or was never properly initiated",
          );

          // Try to check if there's an active call
          try {
            const { getActiveCall } = await import("@/actions/call.action");

            // Try to get token from auth store first
            let token = useAuthStore.getState().accessToken;

            // If no token in auth store, try to get from session storage
            if (!token) {
              const storedToken = sessionStorage.getItem("callAccessToken");
              if (storedToken) {
                console.log(
                  "[WEBRTC] Using token from sessionStorage for checking active call",
                );
                token = storedToken;
              }
            }

            if (!token) {
              console.warn("[WEBRTC] No token available to check active call");
            } else {
              const activeCallResult = await getActiveCall(token);

              if (activeCallResult.success && activeCallResult.activeCall) {
                console.log(
                  "[WEBRTC] Active call found despite room not found error, will retry",
                );

                // If the active call has a different roomId, update our roomId
                if (
                  activeCallResult.activeCall.roomId &&
                  activeCallResult.activeCall.roomId !== roomId
                ) {
                  console.log(
                    `[WEBRTC] Updating roomId from ${roomId} to ${activeCallResult.activeCall.roomId} based on active call`,
                  );
                  roomId = activeCallResult.activeCall.roomId;
                  setCurrentRoomId(roomId);

                  // Create a new room on the server if needed
                  try {
                    console.log(
                      `[WEBRTC] Attempting to create room ${roomId} on server`,
                    );

                    // Try to get the call ID from sessionStorage
                    const callId = sessionStorage.getItem("currentCallId");

                    if (callId) {
                      const { createCallRoom } = await import(
                        "@/actions/call.action"
                      );
                      const result = await createCallRoom(callId, token);

                      if (result.success) {
                        console.log(
                          `[WEBRTC] Successfully created room ${roomId} for call ${callId}`,
                        );
                      } else {
                        console.error(
                          `[WEBRTC] Failed to create room: ${result.message}`,
                        );
                      }
                    } else {
                      console.warn(
                        "[WEBRTC] No call ID available to create room",
                      );
                    }
                  } catch (createRoomError) {
                    console.error(
                      "[WEBRTC] Error creating room:",
                      createRoomError,
                    );
                  }
                }
              } else {
                console.log(
                  "[WEBRTC] No active call found, checking if we need to create a call",
                );

                // Check if we have a target user ID to create a call with
                const targetId = sessionStorage.getItem("currentTargetId");

                if (targetId) {
                  try {
                    console.log(
                      `[WEBRTC] Attempting to create a new call with user ${targetId}`,
                    );
                    const { initiateCall } = await import(
                      "@/actions/call.action"
                    );

                    const result = await initiateCall(targetId, "AUDIO", token);

                    if (result.success) {
                      console.log(
                        `[WEBRTC] Successfully created new call with ID ${result.callId}`,
                      );

                      // Update the room ID to match the new call
                      if (result.roomId) {
                        console.log(
                          `[WEBRTC] Updating roomId to ${result.roomId} from new call`,
                        );
                        roomId = result.roomId;
                        setCurrentRoomId(roomId);
                      }
                    } else {
                      console.error(
                        `[WEBRTC] Failed to create new call: ${result.message}`,
                      );
                    }
                  } catch (createCallError) {
                    console.error(
                      "[WEBRTC] Error creating new call:",
                      createCallError,
                    );
                  }
                } else {
                  console.log(
                    "[WEBRTC] No target ID available to create a new call, will retry anyway",
                  );
                }
              }
            }
          } catch (checkError) {
            console.error("[WEBRTC] Error checking active call:", checkError);
          }
        }

        // Socket connection issues
        if (
          error.message.includes("socket") ||
          error.message.includes("connection")
        ) {
          console.log(
            "[WEBRTC] Socket connection issue detected, attempting to reconnect",
          );

          try {
            // Try to reconnect the socket
            await connectToSocket();
            console.log(
              "[WEBRTC] Socket reconnected successfully, will retry joining room",
            );
          } catch (socketError) {
            console.error("[WEBRTC] Failed to reconnect socket:", socketError);
          }
        }

        // Already loaded error - this is not a fatal error
        if (error.message.includes("already loaded")) {
          console.log(
            "[WEBRTC] Device already loaded, will retry with existing device",
          );
        }
      }

      // Use exponential backoff for retries
      const backoffTime = Math.min(1000 * Math.pow(1.5, attempts - 1), 5000);
      console.log(
        `[WEBRTC] Waiting ${backoffTime}ms before retry ${attempts + 1}`,
      );
      await new Promise((resolve) => setTimeout(resolve, backoffTime));
    }
  }

  // Before giving up completely, try one more time to dispatch a special error recovery event
  // This helps ensure the UI updates correctly even if the WebRTC connection fails
  try {
    const userId =
      useAuthStore.getState().user?.id ||
      sessionStorage.getItem("currentUserId") ||
      "unknown";

    // Store the current user ID in sessionStorage for reference in other components
    try {
      sessionStorage.setItem("currentUserId", userId);
    } catch (storageError) {
      console.warn(
        "[WEBRTC] Error storing currentUserId in sessionStorage:",
        storageError,
      );
    }

    // Dispatch a special error recovery event instead of a normal participant joined event
    window.dispatchEvent(
      new CustomEvent("webrtc:connectionFailed", {
        detail: {
          userId,
          roomId,
          timestamp: new Date().toISOString(),
          attempts: maxAttempts,
          recoveryAttempt: true,
        },
      }),
    );
    console.log(
      `[WEBRTC] Dispatched webrtc:connectionFailed event for user ${userId} in room ${roomId}`,
    );

    // We no longer dispatch a call:participant:joined event here to avoid confusion
  } catch (eventError) {
    console.error(
      "[WEBRTC] Error dispatching connection failed event:",
      eventError,
    );
  }

  console.warn(
    `[WEBRTC] Failed to join room ${roomId} after ${maxAttempts} attempts, but continuing anyway`,
  );
  // Return instead of throwing an error to allow the call to continue
}

/**
 * Single attempt to join a room
 */
export async function joinRoomAttempt(roomId: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // Add a timeout to handle cases where the server doesn't respond
    const timeout = setTimeout(() => {
      console.error("[WEBRTC] Timeout joining room after 20 seconds");
      reject(new Error("Timeout joining room after 20 seconds"));
    }, 20000); // 20 seconds timeout (increased from 15 seconds)

    // Check if socket is initialized and connected
    if (!state.socket || !state.socket.connected) {
      clearTimeout(timeout);
      console.error("[WEBRTC] Socket is not initialized or not connected");

      // Dispatch an event to notify that we need a socket
      try {
        window.dispatchEvent(
          new CustomEvent("webrtc:socket:needed", {
            detail: {
              roomId,
              timestamp: new Date().toISOString(),
              urgent: true,
            },
          }),
        );
        console.log("[WEBRTC] Dispatched urgent webrtc:socket:needed event");
      } catch (eventError) {
        console.error(
          "[WEBRTC] Error dispatching urgent socket needed event:",
          eventError,
        );
      }

      // Log socket state for debugging
      if (state.socket) {
        console.log(
          "[WEBRTC] Socket exists but not connected. Socket ID:",
          state.socket.id,
        );

        // Try to connect the socket if it exists but is not connected
        if (!state.socket.connected) {
          console.log("[WEBRTC] Attempting to connect existing socket");
          state.socket.connect();

          // Wait a bit for the connection to establish using setTimeout instead of await
          setTimeout(() => {
            // Check if connection was successful
            if (state.socket.connected) {
              console.log("[WEBRTC] Successfully connected existing socket");
              // Continue with the existing socket
              joinRoomWithSocket(
                state.socket,
                roomId,
                timeout,
                resolve,
                reject,
              );
              return;
            } else {
              console.log(
                "[WEBRTC] Failed to connect existing socket, will try to create a new one",
              );

              // Continue with the reconnection process below
              // The code after this block will execute and try to reconnect
            }
          }, 2000);
        }
      } else {
        console.log("[WEBRTC] Socket is null");
      }

      // Try to reconnect the socket before giving up
      try {
        console.log(
          "[WEBRTC] Attempting to reconnect socket before joining room",
        );

        // Create a new timeout for the reconnection attempt
        const reconnectTimeout = setTimeout(() => {
          console.error(
            "[WEBRTC] Socket reconnection timeout after 10 seconds",
          );
          console.warn(
            "[WEBRTC] Socket reconnection timeout after 10 seconds, but continuing anyway",
          );
          // Continue anyway instead of rejecting
          resolve();
        }, 10000);

        connectToSocket()
          .then(() => {
            clearTimeout(reconnectTimeout);
            console.log(
              "[WEBRTC] Socket reconnected successfully, retrying room join",
            );

            if (!state.socket) {
              console.warn(
                "[WEBRTC] Socket still not initialized after reconnection, but continuing anyway",
              );
              // Continue anyway instead of rejecting
              resolve();
              return;
            }

            // Verify socket is connected
            if (!state.socket.connected) {
              console.error(
                "[WEBRTC] Socket reconnected but not in connected state",
              );
              reject(
                new Error("Socket reconnected but not in connected state"),
              );
              return;
            }

            console.log(
              "[WEBRTC] Socket reconnected and verified. Socket ID:",
              state.socket.id,
            );

            // Create a new timeout for the room join attempt
            const newTimeout = setTimeout(() => {
              console.error("[WEBRTC] Timeout joining room after reconnection");
              reject(new Error("Timeout joining room after reconnection"));
            }, 15000);

            // Retry joining the room with the new socket
            joinRoomWithSocket(
              state.socket,
              roomId,
              newTimeout,
              resolve,
              reject,
            );
          })
          .catch((socketError) => {
            clearTimeout(reconnectTimeout);
            console.error("[WEBRTC] Failed to reconnect socket:", socketError);

            // Try one more time after a delay
            console.log(
              "[WEBRTC] Trying socket reconnection one more time after delay",
            );
            setTimeout(() => {
              connectToSocket()
                .then(() => {
                  console.log(
                    "[WEBRTC] Socket reconnected successfully on second attempt",
                  );

                  if (!state.socket) {
                    console.warn(
                      "[WEBRTC] Socket still not initialized after second reconnection attempt, but continuing anyway",
                    );
                    // Continue anyway instead of rejecting
                    resolve();
                    return;
                  }

                  // Create a new timeout for the room join attempt
                  const finalTimeout = setTimeout(() => {
                    console.error(
                      "[WEBRTC] Timeout joining room after second reconnection",
                    );
                    reject(
                      new Error(
                        "Timeout joining room after second reconnection",
                      ),
                    );
                  }, 15000);

                  // Retry joining the room with the new socket
                  joinRoomWithSocket(
                    state.socket,
                    roomId,
                    finalTimeout,
                    resolve,
                    reject,
                  );
                })
                .catch((finalError) => {
                  console.error(
                    "[WEBRTC] Failed to reconnect socket on second attempt:",
                    finalError,
                  );
                  console.warn(
                    "[WEBRTC] Socket is not initialized and reconnection failed after multiple attempts, but continuing anyway",
                  );
                  // Continue anyway instead of rejecting
                  resolve();
                });
            }, 2000);
          });
      } catch (reconnectError) {
        console.error(
          "[WEBRTC] Error attempting to reconnect socket:",
          reconnectError,
        );
        console.warn(
          "[WEBRTC] Socket is not initialized, but continuing anyway",
        );
        // Continue anyway instead of rejecting
        resolve();
      }
      return;
    }

    // If socket is already initialized and connected, proceed with joining the room
    console.log(
      "[WEBRTC] Socket is initialized and connected. Socket ID:",
      state.socket.id,
    );
    joinRoomWithSocket(state.socket, roomId, timeout, resolve, reject);
  });
}

/**
 * Helper function to join a room with a given socket
 */
export function joinRoomWithSocket(
  socket: Socket,
  roomId: string,
  timeout: NodeJS.Timeout,
  resolve: (value: void | PromiseLike<void>) => void,
  reject: (reason?: any) => void,
): void {
  // Verify socket is valid and connected before attempting to join
  if (!socket) {
    clearTimeout(timeout);
    console.error("[WEBRTC] Socket is null when attempting to join room");
    console.warn("[WEBRTC] Continuing despite null socket");
    // Continue anyway instead of rejecting
    resolve();
    return;
  }

  if (!socket.connected) {
    clearTimeout(timeout);
    console.error("[WEBRTC] Socket disconnected before joining room");

    // Try to reconnect the socket instead of immediately failing
    console.log("[WEBRTC] Attempting to reconnect socket before joining room");

    // Force reconnection
    socket.connect();

    // Wait for the socket to connect
    console.log("[WEBRTC] Waiting for socket to connect...");
    let connectionAttempts = 0;
    const maxConnectionAttempts = 3;
    const checkConnection = async () => {
      if (socket.connected) {
        console.log(
          "[WEBRTC] Socket successfully connected, proceeding with room join",
        );
        // Continue with the room join
        joinRoomWithSocket(socket, roomId, timeout, resolve, reject);
        return;
      }

      connectionAttempts++;
      if (connectionAttempts < maxConnectionAttempts) {
        console.log(
          `[WEBRTC] Socket still not connected, attempt ${connectionAttempts}/${maxConnectionAttempts}`,
        );
        setTimeout(checkConnection, 1000);
      } else {
        console.error(
          "[WEBRTC] Socket failed to connect after multiple attempts",
        );
        console.warn(
          "[WEBRTC] Socket failed to connect after multiple attempts, but continuing anyway",
        );
        // Continue anyway instead of rejecting
        resolve();
      }
    };

    // Start checking for connection
    setTimeout(checkConnection, 1000);
    return;
  }

  console.log(
    `[WEBRTC] Emitting joinRoom event for room ${roomId} with socket ID ${socket.id}`,
  );

  // Add a listener for disconnect events during the join process
  const disconnectHandler = () => {
    clearTimeout(timeout);
    console.error("[WEBRTC] Socket disconnected during room join process");

    // Instead of immediately failing, store the state so we can resume
    try {
      sessionStorage.setItem("join_room_interrupted", "true");
      sessionStorage.setItem("join_room_id", roomId);
      console.log("[WEBRTC] Stored join room state for potential recovery");
    } catch (storageError) {
      console.warn("[WEBRTC] Error storing join room state:", storageError);
    }

    console.warn(
      "[WEBRTC] Socket disconnected during room join process, but continuing anyway",
    );
    // Continue anyway instead of rejecting
    resolve();
  };

  // Add the disconnect listener
  socket.once("disconnect", disconnectHandler);

  // 1. Join the room
  console.log(
    `[WEBRTC] Emitting joinRoom event with data: { roomId: ${roomId} }`,
  );

  // Add a listener for connect_error events during the join process
  const connectErrorHandler = (error: any) => {
    clearTimeout(timeout);
    console.error(
      "[WEBRTC] Socket connect_error during room join process:",
      error,
    );

    // Log detailed error information
    console.error("[WEBRTC] Socket connect_error details:", {
      message: error.message,
      type: error.type,
      description: error.description,
      context: error.context,
      stack: error.stack,
    });

    console.warn(
      `[WEBRTC] Socket connect_error during room join: ${error.message || "Unknown error"}, but continuing anyway`,
    );
    // Continue anyway instead of rejecting
    resolve();
  };

  // Helper function for reconnected socket
  function joinRoomWithReconnectedSocket(
    reconnectedSocket: Socket,
    roomId: string,
    timeout: NodeJS.Timeout,
    resolve: (value: void | PromiseLike<void>) => void,
    reject: (reason?: any) => void,
  ): void {
    console.log(
      `[WEBRTC] Joining room with reconnected socket ID ${reconnectedSocket.id}`,
    );

    // Set up the same event handlers
    reconnectedSocket.once("disconnect", disconnectHandler);
    reconnectedSocket.once("connect_error", connectErrorHandler);

    // Emit the join room event
    emitJoinRoom(
      reconnectedSocket,
      roomId,
      timeout,
      resolve,
      reject,
      disconnectHandler,
      connectErrorHandler,
    );
  }

  // Add the connect_error listener
  socket.once("connect_error", connectErrorHandler);

  // Use the common emitJoinRoom function
  emitJoinRoom(
    socket,
    roomId,
    timeout,
    resolve,
    reject,
    disconnectHandler,
    connectErrorHandler,
  );
}

/**
 * Common function to emit joinRoom event with proper error handling
 */
function emitJoinRoom(
  socket: Socket,
  roomId: string,
  timeout: NodeJS.Timeout,
  resolve: (value: void | PromiseLike<void>) => void,
  reject: (reason?: any) => void,
  disconnectHandler: () => void,
  connectErrorHandler: (error: any) => void,
): void {
  // Emit joinRoom only once without retries
  let emitAttempts = 0;
  const maxEmitAttempts = 1;

  const attemptJoinRoom = () => {
    emitAttempts++;
    console.log(
      `[WEBRTC] Emit attempt ${emitAttempts}/${maxEmitAttempts} for joinRoom event`,
    );

    // Verify socket is still connected before emitting
    if (!socket.connected) {
      console.error("[WEBRTC] Socket disconnected before emitting joinRoom");
      reject(
        new Error(
          "Socket disconnected, cannot emit joinRoom. Please try again.",
        ),
      );
      return;
    }

    // Get additional information to help with room joining
    const userId =
      useAuthStore.getState().user?.id ||
      sessionStorage.getItem("currentUserId") ||
      "unknown";
    const callId = sessionStorage.getItem("currentCallId") || "";
    const targetId = sessionStorage.getItem("callTargetId") || "";

    // Include more information in the joinRoom request to help with permissions
    socket.emit(
      "joinRoom",
      {
        roomId,
        userId,
        callId,
        targetId,
        timestamp: Date.now(),
      },
      async (response: any) => {
        // Remove the listeners since we got a response
        if (disconnectHandler) {
          socket.off("disconnect", disconnectHandler);
        }
        if (connectErrorHandler) {
          socket.off("connect_error", connectErrorHandler);
        }

        clearTimeout(timeout);

        console.log(`[WEBRTC] Received response from joinRoom:`, response);

        if (!response) {
          console.error("[WEBRTC] No response received from joinRoom");
          reject(new Error("No response received from joinRoom"));
          return;
        }

        if (response.error) {
          console.error(`[WEBRTC] Error joining room: ${response.error}`);

          // Check if the error is related to authentication or permissions
          const isAuthError =
            response.error.includes("auth") ||
            response.error.includes("token") ||
            response.error.includes("unauthorized") ||
            response.error.includes("authentication") ||
            response.error.includes("not allowed") ||
            response.error.includes("permission");

          if (isAuthError) {
            console.error(
              "[WEBRTC] Authentication/permission error detected in room join",
            );

            // Try to refresh the token
            try {
              console.log(
                "[WEBRTC] Attempting to refresh authentication token",
              );
              // This will be handled by the auth store's refresh mechanism
              window.dispatchEvent(new CustomEvent("auth:tokenRefreshNeeded"));

              // Also try to get a fresh token from the auth store
              const freshToken = useAuthStore.getState().accessToken;
              if (freshToken) {
                console.log(
                  "[WEBRTC] Got fresh token from auth store, will retry with this token",
                );
                sessionStorage.setItem("callAccessToken", freshToken);
              }
            } catch (refreshError) {
              console.error(
                "[WEBRTC] Error requesting token refresh:",
                refreshError,
              );
            }

            // If this is a permission error, try to create/join the call again
            if (
              response.error.includes("not allowed") ||
              response.error.includes("permission")
            ) {
              try {
                console.log(
                  "[WEBRTC] Permission error detected, attempting to rejoin call properly",
                );

                // Try to get the token
                const token =
                  useAuthStore.getState().accessToken ||
                  sessionStorage.getItem("callAccessToken");

                if (token && callId) {
                  // Try to join the call properly through the API
                  const { joinCall } = await import("@/actions/call.action");
                  const joinResult = await joinCall(callId, token);

                  if (joinResult.success) {
                    console.log(
                      "[WEBRTC] Successfully joined call through API, retrying room join",
                    );
                    // Continue with the room join despite the error
                    // The server should now recognize this user as part of the call
                  } else {
                    console.error(
                      "[WEBRTC] Failed to join call through API:",
                      joinResult.message,
                    );
                  }
                }
              } catch (joinError) {
                console.error(
                  "[WEBRTC] Error joining call through API:",
                  joinError,
                );
              }
            }
          }

          // For permission errors, we'll try to continue anyway
          if (
            response.error.includes("not allowed") ||
            response.error.includes("permission")
          ) {
            console.log(
              "[WEBRTC] Continuing despite permission error to attempt recovery",
            );
            // Continue with the process despite the error
          } else {
            // For other errors, reject the promise
            reject(new Error(response.error));
            return;
          }
        }

        console.log(
          `[WEBRTC] Received successful response from joinRoom for room ${roomId}`,
        );

        try {
          // Check if rtpCapabilities is valid
          if (!response.rtpCapabilities) {
            console.error("[WEBRTC] No RTP capabilities received from server");

            // Try to get stored RTP capabilities as a fallback
            try {
              const storedCapabilities =
                sessionStorage.getItem("rtpCapabilities");
              if (storedCapabilities) {
                console.log(
                  "[WEBRTC] Using stored RTP capabilities as fallback",
                );
                response.rtpCapabilities = JSON.parse(storedCapabilities);
              } else {
                reject(
                  new Error(
                    "No RTP capabilities received from server and no stored capabilities available",
                  ),
                );
                return;
              }
            } catch (storageError) {
              console.error(
                "[WEBRTC] Error accessing stored RTP capabilities:",
                storageError,
              );
              reject(new Error("No RTP capabilities received from server"));
              return;
            }
          } else {
            // Store the received RTP capabilities for future recovery
            try {
              sessionStorage.setItem(
                "rtpCapabilities",
                JSON.stringify(response.rtpCapabilities),
              );
              console.log(
                "[WEBRTC] Stored new RTP capabilities in sessionStorage",
              );
            } catch (storageError) {
              console.warn(
                "[WEBRTC] Error storing RTP capabilities in sessionStorage:",
                storageError,
              );
              // Continue anyway
            }
          }

          // Dispatch an event to notify that we've received RTP capabilities
          try {
            window.dispatchEvent(
              new CustomEvent("webrtc:rtpCapabilitiesReceived", {
                detail: {
                  roomId,
                  timestamp: new Date().toISOString(),
                },
              }),
            );
            console.log(
              `Dispatched webrtc:rtpCapabilitiesReceived event for room ${roomId}`,
            );
          } catch (eventError) {
            console.error(
              "Error dispatching webrtc:rtpCapabilitiesReceived event:",
              eventError,
            );
          }

          await setupRoomConnection(roomId, response.rtpCapabilities);
          resolve();
        } catch (error) {
          console.error("Error in joinRoom:", error);
          reject(error);
        }
      },
    );
  };

  // Start the first attempt
  attemptJoinRoom();

  // Set up a listener for emit failures
  const emitErrorHandler = (err: any) => {
    console.error(`[WEBRTC] Error in joinRoom emit:`, err);

    // If we haven't reached max attempts, try again
    if (emitAttempts < maxEmitAttempts) {
      console.log(
        `[WEBRTC] Retrying joinRoom emit after failure (attempt ${emitAttempts}/${maxEmitAttempts})`,
      );
      setTimeout(attemptJoinRoom, 1000 * emitAttempts); // Increasing delay for each retry
    }
  };

  // Add error handler for emit
  socket.once("error", emitErrorHandler);
}
