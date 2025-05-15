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

// Keep track of the current room ID for recovery purposes
let currentRoomId: string | null = null;

/**
 * Get all remote streams
 * @returns Map of remote streams
 */
export function getRemoteStreams(): Map<string, MediaStream> {
  return state.remoteStreams;
}

/**
 * Initialize WebRTC connection
 * @param roomId Room ID to join
 * @param withVideo Whether to include video
 * @returns Promise that resolves when connection is established
 */
export async function initializeWebRTC(
  roomId: string,
  withVideo: boolean,
  forceConnect: boolean = false,
): Promise<MediaStream> {
  // Store the current room ID for recovery purposes
  currentRoomId = roomId;

  // Track initialization attempts to prevent infinite loops
  const initAttemptKey = `webrtc_init_${roomId}`;
  let initAttempts = 0;

  try {
    // Check if we've already tried to initialize too many times
    try {
      const storedAttempts = sessionStorage.getItem(initAttemptKey);
      if (storedAttempts) {
        initAttempts = parseInt(storedAttempts, 10);
        if (initAttempts > 5) {
          console.error(
            `[WEBRTC] Too many initialization attempts (${initAttempts}) for room ${roomId}`,
          );

          // Reset the counter after a while to allow future attempts
          setTimeout(() => {
            sessionStorage.removeItem(initAttemptKey);
          }, 60000); // Reset after 1 minute

          throw new Error(
            "Too many WebRTC initialization attempts. Please try again later.",
          );
        }
      }

      // Increment and store the attempt counter
      initAttempts++;
      sessionStorage.setItem(initAttemptKey, initAttempts.toString());
    } catch (storageError) {
      console.warn("[WEBRTC] Error accessing sessionStorage:", storageError);
      // Continue anyway
    }

    console.log(
      `[WEBRTC] Initializing WebRTC for room ${roomId} with video: ${withVideo}, forceConnect: ${forceConnect} (attempt ${initAttempts})`,
    );
    console.log(`[WEBRTC] Browser: ${navigator.userAgent}`);

    // Clean up any existing connections first
    console.log("[WEBRTC] Cleaning up existing connections");
    await cleanup();

    // 1. Initialize device - always create a new Device to ensure proper initialization
    try {
      console.log("[WEBRTC] Creating new mediasoup Device");

      // Create a new Device with default options
      // Let mediasoup detect the browser automatically
      state.device = new Device();
      console.log("[WEBRTC] Device created successfully");
    } catch (error: any) {
      console.error("[WEBRTC] Error creating Device:", error);

      // Check if the error is "already loaded" - this is not a fatal error
      if (error.message && error.message.includes("already loaded")) {
        console.log("[WEBRTC] Device already loaded, continuing...");
      } else {
        throw new Error("Failed to create mediasoup Device: " + error.message);
      }
    }

    // 2. Connect to socket
    console.log("[WEBRTC] Connecting to socket server...");
    await connectToSocket();
    console.log("[WEBRTC] Socket connected successfully");

    // 3. Get user media
    console.log("[WEBRTC] Getting user media...");
    await getUserMedia(withVideo);
    console.log("[WEBRTC] User media obtained successfully");

    // 4. Check if there's an active call for this room
    console.log(`[WEBRTC] Checking active call for room ${roomId}...`);
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
            "[WEBRTC] Active call found:",
            activeCallResult.activeCall,
          );

          // Store the call ID for future reference
          if (activeCallResult.activeCall.id) {
            console.log(
              `[WEBRTC] Storing call ID in session storage: ${activeCallResult.activeCall.id}`,
            );
            sessionStorage.setItem(
              "currentCallId",
              activeCallResult.activeCall.id,
            );
          }
        } else {
          console.log("[WEBRTC] No active call found, but continuing anyway");
        }
      }
    } catch (error: any) {
      console.warn(
        `[WEBRTC] Error checking active call: ${error?.message || "Unknown error"}`,
      );
      // Continue anyway
    }

    // 5. Join the room
    console.log(`[WEBRTC] Joining room ${roomId}...`);
    await joinRoom(roomId);
    console.log(`[WEBRTC] Successfully joined room ${roomId}`);

    // Set up event listeners for remote streams
    setupRemoteStreamListeners();

    // Dispatch an event to notify that WebRTC has been initialized
    try {
      window.dispatchEvent(
        new CustomEvent("webrtc:initialized", {
          detail: {
            roomId,
            withVideo,
            forceConnect,
            timestamp: new Date().toISOString(),
          },
        }),
      );
      console.log("[WEBRTC] Dispatched webrtc:initialized event");
    } catch (eventError) {
      console.error(
        "[WEBRTC] Error dispatching webrtc:initialized event:",
        eventError,
      );
    }

    // Reset the initialization attempt counter on success
    try {
      sessionStorage.removeItem(initAttemptKey);
    } catch (storageError) {
      console.warn("[WEBRTC] Error accessing sessionStorage:", storageError);
    }

    return state.localStream!;
  } catch (error: any) {
    console.error("[WEBRTC] Error initializing WebRTC:", error);

    // Try to clean up on error
    try {
      await cleanup();
    } catch (cleanupError) {
      console.error(
        "[WEBRTC] Error during cleanup after initialization failure:",
        cleanupError,
      );
    }

    // Dispatch an error event to notify UI components
    try {
      window.dispatchEvent(
        new CustomEvent("webrtc:initializationError", {
          detail: {
            error: error.message || "Unknown error",
            roomId,
            timestamp: new Date().toISOString(),
            attempt: initAttempts,
          },
        }),
      );
      console.log("[WEBRTC] Dispatched webrtc:initializationError event");
    } catch (eventError) {
      console.error(
        "[WEBRTC] Error dispatching webrtc:initializationError event:",
        eventError,
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
  return new Promise(async (resolve, reject) => {
    try {
      // If we already have a socket connection that's connected, reuse it
      if (state.socket && state.socket.connected) {
        console.log(
          "[WEBRTC] Socket already connected with ID:",
          state.socket.id,
        );
        resolve();
        return;
      }

      // If we have a socket but it's not connected, clean it up first
      if (state.socket) {
        console.log("[WEBRTC] Socket exists but not connected, cleaning up");
        try {
          state.socket.removeAllListeners();
          state.socket.disconnect();
        } catch (error) {
          console.error("[WEBRTC] Error disconnecting existing socket:", error);
        }
        state.socket = null;
      }

      // Try to get token and user from auth store first
      let accessToken = useAuthStore.getState().accessToken;
      let user = useAuthStore.getState().user;

      // If no token in auth store, try to get from session storage
      if (!accessToken) {
        const storedToken = sessionStorage.getItem("callAccessToken");
        if (storedToken) {
          console.log(
            "[WEBRTC] Using token from sessionStorage for socket connection",
          );
          accessToken = storedToken;
        }
      }

      // If no user in auth store, try to get user data from API using stored ID
      if (!user) {
        const storedUserId = sessionStorage.getItem("currentUserId");
        if (storedUserId && accessToken) {
          console.log(
            `[WEBRTC] Using user ID from sessionStorage for socket connection: ${storedUserId}`,
          );

          try {
            // Sử dụng dynamic import để tránh circular dependency
            const { getUserDataById } = await import("@/actions/user.action");

            // Lấy thông tin user từ API
            console.log(`[WEBRTC] Fetching user data for ID: ${storedUserId}`);
            const userData = await getUserDataById(storedUserId);

            if (userData.success && userData.user) {
              // Đảm bảo userInfo không null
              if (userData.user.userInfo) {
                user = userData.user as any; // Ép kiểu để phù hợp với UserWithInfo
                console.log(
                  `[WEBRTC] Successfully fetched user data from API for ID: ${storedUserId}`,
                );
              } else {
                // Nếu userInfo null, tạo một userInfo mặc định
                const userWithInfo = {
                  ...userData.user,
                  userInfo: {
                    id: storedUserId,
                    fullName:
                      sessionStorage.getItem("currentUserName") || "Người dùng",
                    profilePictureUrl: null,
                    statusMessage: "",
                    blockStrangers: false,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                  },
                };
                user = userWithInfo as any;
                console.log(
                  `[WEBRTC] Added default userInfo to user data for ID: ${storedUserId}`,
                );
              }
            } else {
              // Nếu không lấy được dữ liệu từ API, tạo đối tượng tạm thời
              console.warn(
                `[WEBRTC] Could not fetch user data from API, creating minimal user object`,
              );
              user = {
                id: storedUserId,
                email: sessionStorage.getItem("currentUserEmail") || null,
                phoneNumber: null,
                passwordHash: "",
                createdAt: new Date(),
                updatedAt: new Date(),
                userInfo: {
                  id: storedUserId,
                  fullName:
                    sessionStorage.getItem("currentUserName") || "Người dùng",
                  profilePictureUrl: null,
                  statusMessage: "",
                  blockStrangers: false,
                  createdAt: new Date(),
                  updatedAt: new Date(),
                },
              } as any;
            }
          } catch (error) {
            console.error(`[WEBRTC] Error fetching user data from API:`, error);
            // Tạo đối tượng tạm thời trong trường hợp lỗi
            user = {
              id: storedUserId,
              email: sessionStorage.getItem("currentUserEmail") || null,
              phoneNumber: null,
              passwordHash: "",
              createdAt: new Date(),
              updatedAt: new Date(),
              userInfo: {
                id: storedUserId,
                fullName:
                  sessionStorage.getItem("currentUserName") || "Người dùng",
                profilePictureUrl: null,
                statusMessage: "",
                blockStrangers: false,
                createdAt: new Date(),
                updatedAt: new Date(),
              },
            } as any;
          }
        }
      }

      if (!accessToken || !user || !user.id) {
        console.error("[WEBRTC] Not authenticated - missing token or user ID");
        reject(new Error("Not authenticated - missing token or user ID"));
        return;
      }

      const currentUser = user;

      // Đảm bảo Socket URL không bị undefined
      const socketUrl = `${process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3000"}/call`;
      console.log(`[WEBRTC] Connecting to call socket at ${socketUrl}`);
      console.log(
        `[WEBRTC] NEXT_PUBLIC_SOCKET_URL: ${process.env.NEXT_PUBLIC_SOCKET_URL || "undefined"}`,
      );
      console.log(
        `[WEBRTC] NEXT_PUBLIC_API_URL: ${process.env.NEXT_PUBLIC_API_URL || "undefined"}`,
      );

      // Add a connection timeout
      const connectionTimeout = setTimeout(() => {
        console.error("[WEBRTC] Socket connection timeout after 10 seconds");
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
        reconnectionDelayMax: 5000,
        timeout: 10000,
      });

      socket.on("connect", () => {
        clearTimeout(connectionTimeout);
        console.log(
          "[WEBRTC] Connected to call socket server with ID:",
          socket.id,
        );
        state.socket = socket;

        // Dispatch an event to notify that socket is connected
        try {
          window.dispatchEvent(
            new CustomEvent("webrtc:socketConnected", {
              detail: {
                socketId: socket.id,
                timestamp: new Date().toISOString(),
              },
            }),
          );
          console.log("[WEBRTC] Dispatched webrtc:socketConnected event");
        } catch (eventError) {
          console.error(
            "[WEBRTC] Error dispatching webrtc:socketConnected event:",
            eventError,
          );
        }

        resolve();
      });

      socket.on("connect_error", (error) => {
        clearTimeout(connectionTimeout);
        console.error("[WEBRTC] Socket connection error:", error);

        // Dispatch an event to notify that socket connection failed
        try {
          window.dispatchEvent(
            new CustomEvent("webrtc:socketError", {
              detail: {
                error: error.message || "Connection error",
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

        reject(error);
      });

      socket.on("disconnect", (reason) => {
        console.log(`[WEBRTC] Socket disconnected: ${reason}`);

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

        // If the server disconnected us, try to reconnect
        if (reason === "io server disconnect") {
          console.log(
            "[WEBRTC] Server disconnected us, attempting to reconnect",
          );
          socket.connect();
        }

        // If disconnected due to transport close, try to reconnect
        if (reason === "transport close" || reason === "ping timeout") {
          console.log(
            "[WEBRTC] Attempting to reconnect socket after transport close",
          );
          setTimeout(() => {
            if (!state.socket || !state.socket.connected) {
              socket.connect();
            }
          }, 2000);
        }
      });

      socket.on("reconnect", (attemptNumber) => {
        console.log(
          `[WEBRTC] Socket reconnected after ${attemptNumber} attempts`,
        );

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
          if (producerUserId === currentUser.id) {
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

      // Set up other event listeners
      setupSocketListeners(socket);
    } catch (error) {
      console.error("[WEBRTC] Error in connectToSocket:", error);
      reject(error);
    }
  });
}

/**
 * Set up socket event listeners
 */
function setupSocketListeners(socket: Socket): void {
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

    // Notify the UI that a participant has joined
    window.dispatchEvent(
      new CustomEvent("webrtc:participantJoined", {
        detail: {
          userId: data.userId,
          roomId: data.roomId,
          timestamp: new Date().toISOString(),
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
        },
      }),
    );
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
    console.error(
      "[WEBRTC] Socket or device not initialized, attempting to reconnect",
    );

    // Try to reconnect socket if it's not initialized
    if (!state.socket) {
      try {
        console.log(
          "[WEBRTC] Attempting to reconnect socket before joining room",
        );
        await connectToSocket();
        console.log("[WEBRTC] Socket reconnected successfully");
      } catch (socketError) {
        console.error("[WEBRTC] Failed to reconnect socket:", socketError);
        throw new Error("Socket is not initialized and reconnection failed");
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
        throw new Error("Device is not initialized and recreation failed");
      }
    }

    // If we still don't have socket or device, throw error
    if (!state.socket || !state.device) {
      throw new Error(
        "Socket or device not initialized after reconnection attempt",
      );
    }
  }

  // Store the current room ID for recovery purposes
  currentRoomId = roomId;
  console.log(`[WEBRTC] Set currentRoomId to ${roomId} for recovery purposes`);

  // Also store in sessionStorage for cross-tab/window recovery
  try {
    sessionStorage.setItem("callRoomId", roomId);
    console.log(
      `[WEBRTC] Stored callRoomId=${roomId} in sessionStorage for recovery`,
    );
  } catch (storageError) {
    console.error(
      "[WEBRTC] Error storing roomId in sessionStorage:",
      storageError,
    );
  }

  // Try multiple times to join the room
  let attempts = 0;
  const maxAttempts = 5; // Increased from 3 to 5 for better reliability

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
        window.dispatchEvent(
          new CustomEvent("webrtc:roomJoined", {
            detail: {
              roomId,
              timestamp: new Date().toISOString(),
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
            },
          }),
        );
        console.log(
          `[WEBRTC] Dispatched call:room:joined event for room ${roomId}`,
        );
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
        window.dispatchEvent(
          new CustomEvent("call:participant:joined", {
            detail: {
              userId,
              roomId,
              timestamp: new Date().toISOString(),
            },
          }),
        );
        console.log(
          `[WEBRTC] Dispatched call:participant:joined event for user ${userId} in room ${roomId}`,
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

        throw error;
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
                  currentRoomId = roomId;

                  // Update in sessionStorage
                  try {
                    sessionStorage.setItem("callRoomId", roomId);
                    console.log(
                      `[WEBRTC] Updated callRoomId in sessionStorage to ${roomId}`,
                    );
                  } catch (storageError) {
                    console.error(
                      "[WEBRTC] Error updating roomId in sessionStorage:",
                      storageError,
                    );
                  }
                }
              } else {
                console.log(
                  "[WEBRTC] No active call found, but will retry anyway",
                );
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

  // Before giving up completely, try one more time to dispatch a participant joined event
  // This helps ensure the UI updates correctly even if the WebRTC connection fails
  try {
    const userId =
      useAuthStore.getState().user?.id ||
      sessionStorage.getItem("currentUserId") ||
      "unknown";
    window.dispatchEvent(
      new CustomEvent("call:participant:joined", {
        detail: {
          userId,
          roomId,
          timestamp: new Date().toISOString(),
        },
      }),
    );
    console.log(
      `[WEBRTC] Dispatched final call:participant:joined event for user ${userId} in room ${roomId}`,
    );
  } catch (eventError) {
    console.error(
      "[WEBRTC] Error dispatching final participant joined event:",
      eventError,
    );
  }

  throw new Error(
    `[WEBRTC] Failed to join room ${roomId} after ${maxAttempts} attempts`,
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

      // Try to reconnect the socket before giving up
      try {
        console.log("Attempting to reconnect socket before joining room");
        connectToSocket()
          .then(() => {
            console.log("Socket reconnected successfully, retrying room join");

            if (!state.socket) {
              reject(
                new Error("Socket still not initialized after reconnection"),
              );
              return;
            }

            // Retry joining the room with the new socket
            joinRoomWithSocket(state.socket, roomId, timeout, resolve, reject);
          })
          .catch((socketError) => {
            console.error("Failed to reconnect socket:", socketError);
            reject(
              new Error("Socket is not initialized and reconnection failed"),
            );
          });
      } catch (reconnectError) {
        console.error("Error attempting to reconnect socket:", reconnectError);
        reject(
          new Error("Socket is not initialized, please reinitialize WebRTC"),
        );
      }
      return;
    }

    // If socket is already initialized, proceed with joining the room
    joinRoomWithSocket(state.socket, roomId, timeout, resolve, reject);
  });
}

/**
 * Helper function to join a room with a given socket
 */
function joinRoomWithSocket(
  socket: Socket,
  roomId: string,
  timeout: NodeJS.Timeout,
  resolve: (value: void | PromiseLike<void>) => void,
  reject: (reason?: any) => void,
): void {
  // 1. Join the room
  socket.emit("joinRoom", { roomId }, async (response: any) => {
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

      // Store the room ID in sessionStorage again to ensure it's available
      try {
        sessionStorage.setItem("callRoomId", roomId);
        console.log(
          `Stored callRoomId=${roomId} in sessionStorage after successful join`,
        );
      } catch (storageError) {
        console.error("Error storing roomId in sessionStorage:", storageError);
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
  });
}

/**
 * Set up WebRTC connection after joining a room
 */
async function setupRoomConnection(
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
                      (state.localStream &&
                        state.localStream.getVideoTracks().length > 0) ||
                        false,
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
  } catch (error: any) {
    console.error("Error setting up room connection:", error);

    // Check if this is an AwaitQueueStoppedError
    if (
      error &&
      (error.name === "AwaitQueueStoppedError" ||
        (error.message && error.message.includes("queue stopped")))
    ) {
      console.warn("Caught AwaitQueueStoppedError, attempting recovery");

      // Perform safe cleanup
      await safeCleanup();

      // Try to finish joining anyway to ensure the UI updates correctly
      try {
        console.log("Attempting to finish joining despite queue error");
        if (state.socket) {
          // Add a small delay before sending finishJoining to ensure cleanup is complete
          await new Promise((resolve) => setTimeout(resolve, 500));

          state.socket.emit("finishJoining", { roomId });
          console.log("Sent finishJoining event after queue error");

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

          // Also dispatch the standard call event for compatibility
          window.dispatchEvent(
            new CustomEvent("call:participant:joined", {
              detail: {
                userId: userId,
                roomId: roomId,
                timestamp: timestamp,
                recoveredFromError: true,
              },
            }),
          );

          console.log("Dispatched participant joined events after recovery");

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

          // Return without throwing to allow the call to proceed
          return;
        }
      } catch (finishError) {
        console.error(
          "Error in finishJoining during error recovery:",
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
              }, 10000); // Tăng timeout lên 10 giây

              // Thêm cơ chế thử lại
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

                      // Thử lại nếu chưa đạt số lần thử tối đa
                      if (retryCount < maxRetries) {
                        retryCount++;
                        console.log(
                          `[WEBRTC] Retrying send transport connection (${retryCount}/${maxRetries})`,
                        );
                        setTimeout(attemptConnect, 1000); // Thử lại sau 1 giây
                      } else {
                        console.error(
                          "[WEBRTC] Max retries reached for send transport connection",
                        );
                        clearTimeout(connectTimeout);
                        callback(); // Gọi callback để tránh bị treo
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

                      console.log(
                        "[WEBRTC] Send transport recovery attempt completed",
                      );
                    }
                  } catch (recoveryError) {
                    console.error(
                      "[WEBRTC] Failed to recover from transport failure:",
                      recoveryError,
                    );
                  }
                }, 2000); // Wait 2 seconds before attempting recovery
              } else if (connectionState === "closed") {
                console.log("[WEBRTC] Send transport closed");
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
              }, 10000); // Tăng timeout lên 10 giây

              // Thêm cơ chế thử lại
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

                      // Thử lại nếu chưa đạt số lần thử tối đa
                      if (retryCount < maxRetries) {
                        retryCount++;
                        console.log(
                          `[WEBRTC] Retrying receive transport connection (${retryCount}/${maxRetries})`,
                        );
                        setTimeout(attemptConnect, 1000); // Thử lại sau 1 giây
                      } else {
                        console.error(
                          "[WEBRTC] Max retries reached for receive transport connection",
                        );
                        clearTimeout(connectTimeout);
                        callback(); // Gọi callback để tránh bị treo
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

                      // Notify UI that we're attempting to recover
                      window.dispatchEvent(
                        new CustomEvent("webrtc:transportRecovery", {
                          detail: {
                            type: "receive",
                            status: "attempting",
                          },
                        }),
                      );

                      console.log(
                        "[WEBRTC] Receive transport recovery attempt completed",
                      );

                      // Notify UI that recovery is complete
                      window.dispatchEvent(
                        new CustomEvent("webrtc:transportRecovery", {
                          detail: {
                            type: "receive",
                            status: "completed",
                          },
                        }),
                      );
                    }
                  } catch (recoveryError) {
                    console.error(
                      "[WEBRTC] Failed to recover from transport failure:",
                      recoveryError,
                    );

                    // Notify UI that recovery failed
                    window.dispatchEvent(
                      new CustomEvent("webrtc:transportRecovery", {
                        detail: {
                          type: "receive",
                          status: "failed",
                        },
                      }),
                    );
                  }
                }, 2000); // Wait 2 seconds before attempting recovery
              } else if (connectionState === "closed") {
                console.log("[WEBRTC] Receive transport closed");
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
}

/**
 * Produce media (send our audio/video)
 */
async function produce(
  kind: "audio" | "video",
  track: MediaStreamTrack,
): Promise<void> {
  // Check if send transport exists, if not try to recreate it
  if (!state.sendTransport) {
    console.warn(
      "[WEBRTC] Send transport not created, attempting to recreate it",
    );

    try {
      // Get the current room ID
      const roomId = getCurrentRoomId();

      if (!roomId) {
        console.error(
          "[WEBRTC] Cannot recreate send transport: No room ID available",
        );
        throw new Error("Send transport not created and no room ID available");
      }

      // Try to create the send transport
      console.log(
        "[WEBRTC] Attempting to create send transport for room",
        roomId,
      );
      await createSendTransport(roomId);

      if (!state.sendTransport) {
        console.error("[WEBRTC] Failed to recreate send transport");
        throw new Error("Failed to recreate send transport");
      }

      console.log("[WEBRTC] Successfully recreated send transport");
    } catch (error) {
      console.error("[WEBRTC] Error recreating send transport:", error);
      throw new Error("Send transport not created and recreation failed");
    }
  }

  // Carefully check track before using it
  if (!track || track.readyState === "ended") {
    console.warn(
      `[WEBRTC] Cannot produce ${kind} with ${!track ? "null" : "ended"} track, attempting to get a new one`,
    );

    // Instead of throwing an error, try to get a new track
    try {
      console.log(`[WEBRTC] Attempting to get new ${kind} track...`);

      // Release any existing tracks first to avoid permission issues
      if (state.localStream) {
        const oldTracks = state.localStream.getTracks();
        oldTracks.forEach((t) => {
          try {
            t.stop();
            console.log(`[WEBRTC] Stopped old track: ${t.kind} (${t.id})`);
          } catch (stopError) {
            console.error(`[WEBRTC] Error stopping old track:`, stopError);
          }
        });
      }

      // Request new permissions with appropriate constraints
      const constraints =
        kind === "audio"
          ? {
              audio: { echoCancellation: true, noiseSuppression: true },
              video: false,
            }
          : { audio: false, video: { width: 640, height: 480 } };

      console.log(
        `[WEBRTC] Requesting new media with constraints:`,
        constraints,
      );
      const newStream = await navigator.mediaDevices.getUserMedia(constraints);

      const newTrack =
        kind === "audio"
          ? newStream.getAudioTracks()[0]
          : newStream.getVideoTracks()[0];

      if (!newTrack) {
        console.error(`[WEBRTC] No ${kind} track in new stream`);

        // For audio, continue without it rather than failing the call
        if (kind === "audio") {
          console.log("[WEBRTC] Continuing without audio production");
          return;
        }

        throw new Error(`Could not get new ${kind} track`);
      }

      console.log(
        `[WEBRTC] Got new ${kind} track: ${newTrack.id}, readyState: ${newTrack.readyState}`,
      );

      // Update the track in localStream
      if (state.localStream) {
        // Remove old tracks of this kind
        const oldTracks =
          kind === "audio"
            ? state.localStream.getAudioTracks()
            : state.localStream.getVideoTracks();

        oldTracks.forEach((t) => {
          try {
            state.localStream?.removeTrack(t);
            console.log(`[WEBRTC] Removed old ${t.kind} track: ${t.id}`);
          } catch (removeError) {
            console.error(`[WEBRTC] Error removing track:`, removeError);
          }
        });

        // Add the new track
        try {
          state.localStream.addTrack(newTrack);
          console.log(`[WEBRTC] Added new ${kind} track to localStream`);
        } catch (addError) {
          console.error(
            `[WEBRTC] Error adding track to localStream:`,
            addError,
          );

          // Create a new MediaStream if adding to existing one fails
          state.localStream = new MediaStream([newTrack]);
          console.log(`[WEBRTC] Created new localStream with ${kind} track`);
        }
      } else {
        // Create a new localStream if none exists
        state.localStream = new MediaStream([newTrack]);
        console.log(`[WEBRTC] Created new localStream with ${kind} track`);
      }

      // Use the new track
      track = newTrack;
      console.log(
        `[WEBRTC] Successfully acquired new ${kind} track with ID ${track.id}`,
      );
    } catch (error) {
      console.error(`[WEBRTC] Failed to get new ${kind} track:`, error);

      // For audio, continue without it rather than failing the call
      if (kind === "audio") {
        console.log("[WEBRTC] Continuing without audio production");
        return;
      }

      throw new Error(`Cannot produce ${kind}: failed to get media track`);
    }
  }

  // Double-check send transport again
  if (!state.sendTransport) {
    console.error(
      "[WEBRTC] Send transport still not available after recreation attempt",
    );

    // For audio, just return silently instead of throwing
    if (kind === "audio") {
      console.log(
        "[WEBRTC] Continuing without audio production due to missing transport",
      );

      // Attempt to recreate the transport one more time with a delay
      setTimeout(async () => {
        try {
          const roomId = getCurrentRoomId();
          if (roomId) {
            console.log(
              "[WEBRTC] Delayed attempt to recreate send transport for audio",
            );
            await createSendTransport(roomId);

            // If successful, try producing audio again
            if (state.sendTransport && track && track.readyState === "live") {
              console.log(
                "[WEBRTC] Retrying audio production after transport recreation",
              );
              produce(kind, track).catch((e) => {
                console.error("[WEBRTC] Error in delayed audio production:", e);
              });
            }
          }
        } catch (e) {
          console.error("[WEBRTC] Error in delayed transport recreation:", e);
        }
      }, 2000);

      return;
    }

    throw new Error("Send transport not available");
  }

  try {
    console.log(
      `[WEBRTC] Producing ${kind} track with ID ${track.id}, readyState: ${track.readyState}`,
    );

    // Add a timeout to prevent hanging if produce never resolves
    const producePromise = state.sendTransport.produce({
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

    // Create a timeout promise
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Timeout producing ${kind}`));
      }, 10000); // 10 second timeout
    });

    // Race the produce promise against the timeout
    const producer = (await Promise.race([
      producePromise,
      timeoutPromise,
    ])) as any;

    state.producers.set(kind, producer);

    producer.on("transportclose", () => {
      console.log(`[WEBRTC] Producer transport closed for ${kind}`);
      producer.close();
      state.producers.delete(kind);
    });

    producer.on("trackended", () => {
      console.log(`[WEBRTC] Track ended for ${kind}`);
      producer.close();
      state.producers.delete(kind);
    });

    console.log(
      `[WEBRTC] Successfully produced ${kind} with ID ${producer.id}`,
    );

    // Notify UI that media is now being produced
    try {
      window.dispatchEvent(
        new CustomEvent("webrtc:mediaProduced", {
          detail: {
            kind,
            producerId: producer.id,
            timestamp: new Date().toISOString(),
          },
        }),
      );
      console.log(`[WEBRTC] Dispatched webrtc:mediaProduced event for ${kind}`);
    } catch (eventError) {
      console.error(
        `[WEBRTC] Error dispatching webrtc:mediaProduced event:`,
        eventError,
      );
    }
  } catch (error) {
    console.error(`[WEBRTC] Error producing ${kind}:`, error);

    // If the track ended during the produce call, log it clearly
    if (error instanceof DOMException && error.name === "InvalidStateError") {
      console.error(`[WEBRTC] Track ended while trying to produce ${kind}`);
    }

    // For audio, just log the error instead of throwing
    // This allows the call to continue without audio rather than failing completely
    if (kind === "audio") {
      console.log(
        `[WEBRTC] Continuing without ${kind} production due to error`,
      );

      // Try again after a short delay
      setTimeout(() => {
        if (track && track.readyState === "live") {
          console.log(`[WEBRTC] Retrying ${kind} production after error`);
          produce(kind, track).catch((e) => {
            console.error(`[WEBRTC] Error in delayed ${kind} production:`, e);
          });
        }
      }, 3000);

      return;
    }

    throw error;
  }
}

/**
 * Get the current room ID from memory, URL or sessionStorage
 */
export function getCurrentRoomId(): string | null {
  // First check if we have a currentRoomId in memory
  if (currentRoomId) {
    return currentRoomId;
  }

  try {
    // Try to get room ID from URL first
    const pathParts = window.location.pathname.split("/");
    const lastPart = pathParts[pathParts.length - 1];

    // Check if the last part looks like a valid ID (non-empty string)
    if (
      lastPart &&
      lastPart.length > 0 &&
      lastPart !== "call" &&
      lastPart !== "video-call"
    ) {
      console.log(`[WEBRTC] Found room ID in URL: ${lastPart}`);
      return lastPart;
    }

    // If not found in URL, try to get from sessionStorage
    const currentCallId = sessionStorage.getItem("currentCallId");
    if (currentCallId) {
      console.log(`[WEBRTC] Found room ID in sessionStorage: ${currentCallId}`);
      return currentCallId;
    }

    console.error("[WEBRTC] Could not determine current room ID");
    return null;
  } catch (error) {
    console.error("[WEBRTC] Error getting current room ID:", error);
    return null;
  }
}

/**
 * Consume media (receive remote audio/video)
 */
async function consume(producerId: string, kind: string): Promise<void> {
  // Check if receive transport exists, if not try to recreate it
  if (!state.socket || !state.recvTransport || !state.device) {
    console.warn(
      "[WEBRTC] Receive transport not created, attempting to recreate it",
    );

    try {
      // Get the current room ID
      const roomId = getCurrentRoomId();

      if (!roomId) {
        console.error(
          "[WEBRTC] Cannot recreate receive transport: No room ID available",
        );
        throw new Error(
          "Receive transport not created and no room ID available",
        );
      }

      // Try to reconnect socket if needed
      if (!state.socket) {
        console.log("[WEBRTC] Socket not connected, attempting to reconnect");
        try {
          await connectToSocket();
        } catch (socketError) {
          console.error("[WEBRTC] Failed to reconnect socket:", socketError);
        }
      }

      // Try to recreate device if needed
      if (!state.device) {
        console.log(
          "[WEBRTC] Device not created, attempting to create new device",
        );
        try {
          state.device = new Device();
          console.log("[WEBRTC] New device created successfully");
        } catch (deviceError) {
          console.error("[WEBRTC] Failed to create new device:", deviceError);
        }
      }

      // Try to create the receive transport
      if (state.socket && state.device) {
        console.log(
          "[WEBRTC] Attempting to create receive transport for room",
          roomId,
        );
        try {
          await createRecvTransport(roomId);
        } catch (transportError) {
          console.error(
            "[WEBRTC] Failed to create receive transport:",
            transportError,
          );
        }
      }

      // Check if recreation was successful
      if (!state.socket || !state.recvTransport || !state.device) {
        console.error(
          "[WEBRTC] Failed to recreate necessary components for consuming",
        );
        throw new Error(
          "Failed to recreate necessary components for consuming",
        );
      }

      console.log("[WEBRTC] Successfully recreated components for consuming");
    } catch (error) {
      console.error(
        "[WEBRTC] Error recreating components for consuming:",
        error,
      );
      throw new Error("Receive transport not created and recreation failed");
    }
  }

  // Check if we already have a consumer for this producer
  for (const [_, consumer] of state.consumers.entries()) {
    if (consumer.producerId === producerId) {
      console.log(`[WEBRTC] Already consuming producer ${producerId}`);
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
        console.error(`[WEBRTC] Cannot consume producer ${producerId}`);
        return;
      }
    }
  } catch (error) {
    console.error("[WEBRTC] Error checking if can consume:", error);
    // Continue anyway, let's try to consume
  }

  return new Promise((resolve) => {
    // Add a timeout for consume
    const timeout = setTimeout(() => {
      console.error(`[WEBRTC] Timeout consuming producer ${producerId}`);
      // Resolve instead of reject to prevent call from failing
      resolve();
    }, 10000);

    // Double-check socket again
    if (!state.socket) {
      clearTimeout(timeout);
      console.error("[WEBRTC] Socket still not available for consuming");
      resolve(); // Resolve instead of reject to prevent call from failing
      return;
    }

    state.socket.emit(
      "consume",
      {
        producerId,
        rtpCapabilities: state.device!.rtpCapabilities,
      },
      async (response: any) => {
        clearTimeout(timeout);

        if (!response) {
          console.error(
            `[WEBRTC] No response received for consume request for producer ${producerId}`,
          );
          resolve(); // Resolve instead of reject to prevent call from failing
          return;
        }

        if (response.error) {
          console.error(
            `[WEBRTC] Error consuming producer ${producerId}:`,
            response.error,
          );
          // Resolve instead of reject to prevent call from failing
          resolve();
          return;
        }

        try {
          if (!response.id || !response.rtpParameters) {
            console.error(
              "[WEBRTC] Invalid consumer parameters received from server",
            );
            resolve(); // Resolve instead of reject to prevent call from failing
            return;
          }

          // Double-check recvTransport again
          if (!state.recvTransport) {
            console.error("[WEBRTC] Receive transport no longer available");
            resolve(); // Resolve instead of reject to prevent call from failing
            return;
          }

          console.log(
            `[WEBRTC] Consuming producer ${producerId} with ID ${response.id}`,
          );

          // Add a timeout for the consume operation
          const consumePromise = state.recvTransport.consume({
            id: response.id,
            producerId,
            kind,
            rtpParameters: response.rtpParameters,
          });

          // Create a timeout promise
          const consumeTimeout = new Promise<any>((_, rejectConsume) => {
            setTimeout(() => {
              rejectConsume(
                new Error(`Timeout in transport.consume for ${producerId}`),
              );
            }, 5000); // 5 second timeout
          });

          // Race the consume promise against the timeout
          const consumer = await Promise.race([
            consumePromise,
            consumeTimeout,
          ]).catch((error) => {
            console.error(
              `[WEBRTC] Error in transport.consume for ${producerId}:`,
              error,
            );
            throw error;
          });

          state.consumers.set(response.id, consumer);

          consumer.on("transportclose", () => {
            console.log(`[WEBRTC] Consumer transport closed for ${kind}`);
            consumer.close();
            state.consumers.delete(response.id);
          });

          consumer.on("trackended", () => {
            console.log(`[WEBRTC] Consumer track ended for ${kind}`);
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
            console.warn(`[WEBRTC] Timeout resuming consumer ${response.id}`);
          }, 5000);

          // Double-check socket again
          if (!state.socket) {
            clearTimeout(resumeTimeout);
            console.error("[WEBRTC] Socket not available for resumeConsumer");
            // Continue anyway, we've already created the consumer
          } else {
            state.socket.emit(
              "resumeConsumer",
              { consumerId: response.id },
              (resumeResponse: any) => {
                clearTimeout(resumeTimeout);
                if (resumeResponse && resumeResponse.error) {
                  console.error(
                    `[WEBRTC] Error resuming consumer ${response.id}:`,
                    resumeResponse.error,
                  );
                } else {
                  console.log(
                    `[WEBRTC] Successfully resumed consumer ${response.id}`,
                  );
                }
              },
            );
          }

          // Add the track to a remote stream
          let stream: MediaStream;
          try {
            // Check if the track is valid
            if (!consumer.track || consumer.track.readyState === "ended") {
              console.error(
                `[WEBRTC] Consumer track is ${!consumer.track ? "null" : "ended"}`,
              );
              // Create an empty stream as fallback
              stream = new MediaStream();
            } else {
              stream = new MediaStream([consumer.track]);
              console.log(
                `[WEBRTC] Created MediaStream with track ID ${consumer.track.id}`,
              );
            }
          } catch (error) {
            console.error("[WEBRTC] Error creating MediaStream:", error);
            // Fallback for older browsers
            try {
              const WebkitMediaStream = (window as any).webkitMediaStream;
              if (WebkitMediaStream) {
                stream = new WebkitMediaStream();
                if (consumer.track) {
                  stream.addTrack(consumer.track);
                  console.log("[WEBRTC] Created webkitMediaStream with track");
                } else {
                  console.log(
                    "[WEBRTC] Created empty webkitMediaStream (no track)",
                  );
                }
              } else {
                // Last resort - create empty stream
                stream = new MediaStream();
                console.log("[WEBRTC] Created empty MediaStream (fallback)");
              }
            } catch (fallbackError) {
              console.error(
                "[WEBRTC] Error creating webkitMediaStream:",
                fallbackError,
              );
              // Last resort - create empty stream
              stream = new MediaStream();
              console.log("[WEBRTC] Created empty MediaStream (last resort)");
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

          console.log(
            `[WEBRTC] Successfully set up consumer for producer ${producerId}`,
          );
          resolve();
        } catch (error) {
          console.error(
            `[WEBRTC] Error consuming producer ${producerId}:`,
            error,
          );
          // Resolve instead of reject to prevent call from failing
          resolve();
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
    console.log("[WEBRTC] Ending call");

    // Get the current room ID
    const roomId = getCurrentRoomId();
    console.log(`[WEBRTC] Current room ID: ${roomId || "unknown"}`);

    // Notify the server that we're leaving the room
    if (state.socket) {
      console.log("[WEBRTC] Emitting leaveRoom event to server");
      state.socket.emit("leaveRoom", { roomId });
    }

    // Try to get the call ID from sessionStorage
    const callId = sessionStorage.getItem("currentCallId");
    if (callId) {
      console.log(`[WEBRTC] Found call ID in sessionStorage: ${callId}`);

      // Dispatch a call:ended event to ensure all components are notified
      try {
        console.log(
          `[WEBRTC] Dispatching call:ended event for call ID: ${callId}`,
        );
        window.dispatchEvent(
          new CustomEvent("call:ended", {
            detail: {
              callId,
              roomId: roomId || undefined,
              endedBy: "local_user",
            },
          }),
        );
      } catch (eventError) {
        console.error(
          "[WEBRTC] Error dispatching call:ended event:",
          eventError,
        );
      }
    }

    // Clean up all WebRTC resources
    console.log("[WEBRTC] Cleaning up WebRTC resources");
    await cleanup();

    console.log("[WEBRTC] Call ended successfully");
  } catch (error) {
    console.error("[WEBRTC] Error ending call:", error);

    // Try to clean up anyway
    try {
      await cleanup();
    } catch (cleanupError) {
      console.error(
        "[WEBRTC] Error during cleanup after end call failure:",
        cleanupError,
      );
    }
  }
}

/**
 * Clean up WebRTC resources
 * @returns Promise that resolves when cleanup is complete
 */
async function cleanup(): Promise<void> {
  return new Promise<void>((resolve) => {
    try {
      console.log("[WEBRTC] Starting cleanup process");

      // Create a flag to track if we're already cleaning up
      let isCleaningUp = false;

      // First, safely stop any await queues before doing anything else
      // This helps prevent AwaitQueueStoppedError
      const safelyStopAwaitQueues = () => {
        try {
          // Check and stop send transport queue
          if (state.sendTransport) {
            const transport = state.sendTransport as any;
            if (transport._awaitQueue) {
              try {
                console.log(
                  "[WEBRTC] Safely stopping send transport await queue",
                );
                transport._awaitQueue.stop();
                console.log(
                  "[WEBRTC] Send transport await queue stopped successfully",
                );
              } catch (queueError) {
                console.error(
                  "[WEBRTC] Error stopping send transport await queue:",
                  queueError,
                );
              }
            }
          }

          // Check and stop receive transport queue
          if (state.recvTransport) {
            const transport = state.recvTransport as any;
            if (transport._awaitQueue) {
              try {
                console.log(
                  "[WEBRTC] Safely stopping receive transport await queue",
                );
                transport._awaitQueue.stop();
                console.log(
                  "[WEBRTC] Receive transport await queue stopped successfully",
                );
              } catch (queueError) {
                console.error(
                  "[WEBRTC] Error stopping receive transport await queue:",
                  queueError,
                );
              }
            }
          }
        } catch (error) {
          console.error("[WEBRTC] Error in safelyStopAwaitQueues:", error);
        }
      };

      // Stop await queues first to prevent AwaitQueueStoppedError
      safelyStopAwaitQueues();

      // Add a small delay to ensure queues are fully stopped before proceeding
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
            // Use emit instead of disconnect to ensure server is notified
            state.socket.emit("clientDisconnecting");

            // Small delay to allow the message to be sent
            setTimeout(() => {
              try {
                if (state.socket) {
                  state.socket.disconnect();
                  console.log("[WEBRTC] Socket disconnected");
                }
              } catch (disconnectError) {
                console.error(
                  "[WEBRTC] Error during socket disconnect:",
                  disconnectError,
                );
              } finally {
                state.socket = null;
              }
            }, 100);
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
            // Now close the transport (queues already stopped above)
            state.sendTransport.close();
            console.log("[WEBRTC] Send transport closed successfully");
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
            // Now close the transport (queues already stopped above)
            state.recvTransport.close();
            console.log("[WEBRTC] Receive transport closed successfully");
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

        // Clear current room ID
        if (currentRoomId) {
          console.log(`[WEBRTC] Clearing current room ID: ${currentRoomId}`);
          currentRoomId = null;
        }

        console.log("[WEBRTC] Cleanup completed successfully");
        isCleaningUp = false;
        resolve();
      }, 100); // Small delay to ensure queues are fully stopped
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

      // Clear current room ID
      if (currentRoomId) {
        console.log(
          `[WEBRTC] Clearing current room ID: ${currentRoomId} after cleanup error`,
        );
        currentRoomId = null;
      }

      console.log("[WEBRTC] State reset after cleanup error");
      resolve(); // Resolve anyway to prevent hanging
    }
  });
}
