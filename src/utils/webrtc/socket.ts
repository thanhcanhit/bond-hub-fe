import { io, Socket } from "socket.io-client";
import { useAuthStore } from "@/stores/authStore";
import { state } from "./state";
import { setupSocketListeners } from "./events";

// Keep track of connection attempts to prevent infinite loops
let connectionAttempts = 0;
const MAX_CONNECTION_ATTEMPTS = 3; // Reduced from 5 to prevent excessive reconnection attempts
let lastConnectionAttempt = 0;
const CONNECTION_ATTEMPT_INTERVAL = 10000; // 10 seconds (increased from 5 seconds)
const CONNECTION_ATTEMPT_COOLDOWN = 30000; // 30 seconds cooldown after reaching max attempts

/**
 * Connect to the WebRTC socket server
 */
export async function connectToSocket(): Promise<void> {
  return new Promise(async (resolve, reject) => {
    try {
      // If we already have a socket connection that's connected, reuse it
      if (state.socket && state.socket.connected) {
        console.log(
          "[WEBRTC] Socket already connected with ID:",
          state.socket.id,
        );
        // Reset connection attempts on successful connection
        connectionAttempts = 0;
        lastConnectionAttempt = 0;
        resolve();
        return;
      }

      // Check if we've tried to connect too many times in a short period
      const now = Date.now();
      if (connectionAttempts >= MAX_CONNECTION_ATTEMPTS) {
        // If we're in cooldown period, reject immediately
        if (now - lastConnectionAttempt < CONNECTION_ATTEMPT_COOLDOWN) {
          console.warn(
            `[WEBRTC] Too many connection attempts (${connectionAttempts}), in cooldown period`,
          );
          console.log(
            `[WEBRTC] Please wait ${Math.ceil((CONNECTION_ATTEMPT_COOLDOWN - (now - lastConnectionAttempt)) / 1000)} seconds before retrying`,
          );
          reject(
            new Error("Too many connection attempts, please try again later"),
          );
          return;
        } else {
          // Cooldown period has passed, reset counter
          console.log(
            "[WEBRTC] Cooldown period has passed, resetting connection attempts counter",
          );
          connectionAttempts = 0;
        }
      } else if (
        connectionAttempts > 0 &&
        now - lastConnectionAttempt < CONNECTION_ATTEMPT_INTERVAL
      ) {
        // If we're trying to connect again too quickly, add a small delay
        console.warn(`[WEBRTC] Connection attempts too frequent, adding delay`);
        await new Promise((resolve) =>
          setTimeout(resolve, CONNECTION_ATTEMPT_INTERVAL),
        );
      }

      // Update connection attempt tracking
      connectionAttempts++;
      lastConnectionAttempt = now;

      // Schedule automatic reduction of connection attempts after cooldown
      setTimeout(() => {
        if (connectionAttempts > 0) {
          connectionAttempts = Math.max(0, connectionAttempts - 1);
          console.log(
            `[WEBRTC] Reduced connection attempts counter to ${connectionAttempts}`,
          );
        }
      }, CONNECTION_ATTEMPT_COOLDOWN);

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
            // Use dynamic import to avoid circular dependency
            const { getUserDataById } = await import("@/actions/user.action");

            // Get user info from API
            console.log(`[WEBRTC] Fetching user data for ID: ${storedUserId}`);
            const userData = await getUserDataById(storedUserId);

            if (userData.success && userData.user) {
              // Ensure userInfo is not null
              if (userData.user.userInfo) {
                user = userData.user as any; // Type cast to match UserWithInfo
                console.log(
                  `[WEBRTC] Successfully fetched user data from API for ID: ${storedUserId}`,
                );
              } else {
                // If userInfo is null, create a default userInfo
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
              // If we couldn't get data from API, create a temporary object
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
            // Create a temporary object in case of error
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

      // Ensure Socket URL is not undefined
      const socketUrl = `${process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3000"}/call`;
      console.log(`[WEBRTC] Connecting to call socket at ${socketUrl}`);
      console.log(
        `[WEBRTC] NEXT_PUBLIC_SOCKET_URL: ${process.env.NEXT_PUBLIC_SOCKET_URL || "undefined"}`,
      );
      console.log(
        `[WEBRTC] NEXT_PUBLIC_API_URL: ${process.env.NEXT_PUBLIC_API_URL || "undefined"}`,
      );

      // Check if we've had a recent queue stopped error
      try {
        const queueStopped =
          sessionStorage.getItem("webrtc_queue_stopped") === "true";
        if (queueStopped) {
          console.warn(
            "[WEBRTC] Recent queue stopped error detected, adding extra delay before socket connection",
          );
          // Add a small delay before connecting to allow resources to be released
          await new Promise((resolve) => setTimeout(resolve, 1000));
          console.log(
            "[WEBRTC] Delay completed, proceeding with socket connection",
          );
        }
      } catch (storageError) {
        console.warn("[WEBRTC] Error accessing sessionStorage:", storageError);
      }

      // Add a connection timeout
      const connectionTimeout = setTimeout(() => {
        console.error("[WEBRTC] Socket connection timeout after 15 seconds");
        reject(new Error("Socket connection timeout"));
      }, 15000); // Increased to 15 seconds timeout for better reliability

      // Check if there's an existing socket in sessionStorage
      let existingSocketId;
      try {
        existingSocketId = sessionStorage.getItem("lastSocketId");
        if (existingSocketId) {
          console.log(
            `[WEBRTC] Found existing socket ID in sessionStorage: ${existingSocketId}`,
          );
        }
      } catch (storageError) {
        console.warn(
          "[WEBRTC] Error accessing sessionStorage for socket ID:",
          storageError,
        );
      }

      // Log detailed connection information
      console.log(
        `[WEBRTC] Connecting to socket with the following configuration:`,
      );
      console.log(`[WEBRTC] - URL: ${socketUrl}`);
      console.log(`[WEBRTC] - User ID: ${currentUser.id}`);
      console.log(`[WEBRTC] - Token length: ${accessToken.length} characters`);
      console.log(
        `[WEBRTC] - Token prefix: ${accessToken.substring(0, 10)}...`,
      );

      try {
        // Create socket with robust configuration for persistent connection
        const socket = io(socketUrl, {
          auth: {
            token: accessToken,
            userId: currentUser.id,
          },
          transports: ["websocket", "polling"], // Support both for better reliability
          reconnection: true, // Enable automatic reconnection for persistent connection
          reconnectionAttempts: 5, // Limit reconnection attempts to prevent excessive retries
          reconnectionDelay: 1000, // Start with 1s delay
          reconnectionDelayMax: 5000, // Maximum 5s delay between reconnection attempts
          timeout: 20000, // 20s connection timeout
          forceNew: true, // Force a new connection to avoid reusing problematic connections
          autoConnect: false, // Don't connect automatically, we'll do it manually
          // Add additional options for better reliability
          extraHeaders: {
            "X-Client-Version": "1.0.0",
            "X-Connection-Type": "call",
          },
          // Reduce packet size for better performance
          perMessageDeflate: {
            threshold: 1024,
          },
          // Add ping timeout and interval for keeping connection alive
          pingTimeout: 60000, // 60 seconds
          pingInterval: 25000, // 25 seconds
        });

        // Verify socket was created
        if (!socket) {
          console.error(
            "[WEBRTC] Failed to create socket - socket is null after initialization",
          );
          // Create a fallback socket with more controlled options
          const fallbackSocket = io(socketUrl, {
            auth: { token: accessToken },
            forceNew: true,
            reconnection: true,
            reconnectionAttempts: 3, // Even more limited for fallback
            reconnectionDelay: 2000, // Longer delay for fallback
            timeout: 15000, // Shorter timeout for fallback
          });

          if (!fallbackSocket) {
            throw new Error(
              "Failed to create socket even with fallback options",
            );
          }

          console.log(
            "[WEBRTC] Created fallback socket as primary socket failed",
          );
          state.socket = fallbackSocket;
        } else {
          // Assign socket to state immediately so it's available for verification
          state.socket = socket;
          console.log(
            "[WEBRTC] Socket created successfully and assigned to state",
          );
        }
      } catch (socketCreationError) {
        console.error("[WEBRTC] Error creating socket:", socketCreationError);
        throw new Error(
          "Failed to create socket: " + socketCreationError.message,
        );
      }

      // Set up connection event listener
      if (!state.socket) {
        console.error(
          "[WEBRTC] Cannot set up event listeners: state.socket is null",
        );
        reject(new Error("Socket is null, cannot set up event listeners"));
        return;
      }

      state.socket.on("connect", () => {
        clearTimeout(connectionTimeout);
        console.log(
          "[WEBRTC] Connected to call socket server with ID:",
          state.socket?.id,
        );

        // Store the socket ID in sessionStorage for future reference
        try {
          if (state.socket?.id) {
            sessionStorage.setItem("lastSocketId", state.socket.id);
            console.log(
              `[WEBRTC] Stored socket ID in sessionStorage: ${state.socket.id}`,
            );
          }
        } catch (storageError) {
          console.warn(
            "[WEBRTC] Error storing socket ID in sessionStorage:",
            storageError,
          );
        }

        // Clear any queue stopped error flag since we've successfully connected
        try {
          if (sessionStorage.getItem("webrtc_queue_stopped") === "true") {
            sessionStorage.removeItem("webrtc_queue_stopped");
            console.log(
              "[WEBRTC] Cleared queue stopped flag after successful connection",
            );
          }
        } catch (storageError) {
          console.warn(
            "[WEBRTC] Error accessing sessionStorage:",
            storageError,
          );
        }

        // Set up a heartbeat to keep the connection alive, but less frequently
        const heartbeatInterval = setInterval(() => {
          if (socket && socket.connected) {
            console.log(
              "[WEBRTC] Sending heartbeat ping to keep connection alive",
            );
            socket.emit("heartbeat", { timestamp: Date.now() });
          } else {
            clearInterval(heartbeatInterval);
          }
        }, 30000); // Send heartbeat every 30 seconds (increased from 20 seconds)

        // Store the interval ID to clear it later if needed
        try {
          // @ts-ignore - Adding custom property to socket
          socket.heartbeatInterval = heartbeatInterval;
        } catch (error) {
          console.warn("[WEBRTC] Error storing heartbeat interval:", error);
        }

        // Dispatch an event to notify that socket is connected
        try {
          if (state.socket?.id) {
            window.dispatchEvent(
              new CustomEvent("webrtc:socketConnected", {
                detail: {
                  socketId: state.socket.id,
                  timestamp: new Date().toISOString(),
                },
              }),
            );
            console.log("[WEBRTC] Dispatched webrtc:socketConnected event");

            // Also try to notify via BroadcastChannel
            try {
              const callChannel = new BroadcastChannel("call_events");
              callChannel.postMessage({
                type: "SOCKET_CONNECTED",
                socketId: state.socket.id,
                timestamp: new Date().toISOString(),
              });
              console.log(
                "[WEBRTC] Broadcast SOCKET_CONNECTED message to all windows",
              );
              callChannel.close();
            } catch (channelError) {
              console.error(
                "[WEBRTC] Error broadcasting socket connected:",
                channelError,
              );
            }
          }
        } catch (eventError) {
          console.error(
            "[WEBRTC] Error dispatching socket connected event:",
            eventError,
          );
        }

        resolve();
      });

      // Handle connection errors
      socket.on("connect_error", (error) => {
        clearTimeout(connectionTimeout);
        console.error("[WEBRTC] Socket connection error:", error);
        console.error("[WEBRTC] Socket connection error details:", {
          message: error.message,
          type: error.type,
          description: error.description,
          context: error.context,
          stack: error.stack,
        });

        // Check if the error is related to authentication
        const isAuthError =
          error.message &&
          (error.message.includes("auth") ||
            error.message.includes("token") ||
            error.message.includes("unauthorized") ||
            error.message.includes("authentication"));

        if (isAuthError) {
          console.error(
            "[WEBRTC] Authentication error detected in socket connection",
          );

          // Try to refresh the token
          try {
            console.log("[WEBRTC] Attempting to refresh authentication token");
            // This will be handled by the auth store's refresh mechanism
            window.dispatchEvent(new CustomEvent("auth:tokenRefreshNeeded"));
          } catch (refreshError) {
            console.error(
              "[WEBRTC] Error requesting token refresh:",
              refreshError,
            );
          }
        }

        // Store error details for debugging
        try {
          const socketErrors = JSON.parse(
            sessionStorage.getItem("socketErrors") || "[]",
          );
          socketErrors.push({
            timestamp: new Date().toISOString(),
            error: error.message || "Unknown error",
            isAuthError,
            url: socketUrl,
          });
          // Keep only the last 5 errors to avoid storage issues
          if (socketErrors.length > 5) {
            socketErrors.shift();
          }
          sessionStorage.setItem("socketErrors", JSON.stringify(socketErrors));
          console.log("[WEBRTC] Stored socket error details in sessionStorage");
        } catch (storageError) {
          console.warn(
            "[WEBRTC] Error accessing sessionStorage:",
            storageError,
          );
        }

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

          // Also dispatch a more general call:error event for broader compatibility
          window.dispatchEvent(
            new CustomEvent("call:error", {
              detail: {
                error: `Không thể kết nối máy chủ: ${error.message || "Lỗi kết nối"}`,
                code: "SOCKET_CONNECTION_ERROR",
                timestamp: new Date().toISOString(),
              },
            }),
          );
          console.log("[WEBRTC] Dispatched call:error event for socket error");
        } catch (eventError) {
          console.error(
            "[WEBRTC] Error dispatching socket error events:",
            eventError,
          );
        }

        reject(error);
      });

      // Handle disconnection
      socket.on("disconnect", (reason) => {
        console.error(`[WEBRTC] Socket disconnected. Reason: ${reason}`);

        // Only show error for certain disconnect reasons
        const isTransportClose = reason === "transport close";
        const isServerDisconnect = reason === "io server disconnect";
        const isClientDisconnect = reason === "io client disconnect";

        // If the disconnect is due to transport close, we can expect a reconnect
        // If it's a server or client disconnect, it's more serious
        const isRecoverable =
          isTransportClose && !isServerDisconnect && !isClientDisconnect;

        console.log(
          `[WEBRTC] Disconnect is ${isRecoverable ? "recoverable" : "not recoverable"}`,
        );

        // Dispatch an event to notify that socket disconnected
        try {
          window.dispatchEvent(
            new CustomEvent("webrtc:socketDisconnected", {
              detail: {
                reason,
                isRecoverable,
                timestamp: new Date().toISOString(),
              },
            }),
          );
          console.log("[WEBRTC] Dispatched webrtc:socketDisconnected event");

          // Only dispatch error event for non-recoverable disconnects
          if (!isRecoverable) {
            window.dispatchEvent(
              new CustomEvent("call:error", {
                detail: {
                  error: `Mất kết nối với máy chủ: ${reason}`,
                  code: "SOCKET_DISCONNECTED",
                  timestamp: new Date().toISOString(),
                  recoverable: false,
                },
              }),
            );
            console.log(
              "[WEBRTC] Dispatched call:error event for socket disconnection",
            );
          } else {
            console.log("[WEBRTC] Waiting for automatic reconnection...");
          }
        } catch (eventError) {
          console.error(
            "[WEBRTC] Error dispatching socket disconnection events:",
            eventError,
          );
        }
      });

      // Handle reconnect events
      socket.on("reconnect", (attemptNumber) => {
        console.log(
          `[WEBRTC] Socket reconnected after ${attemptNumber} attempts`,
        );

        // Notify that socket has reconnected
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
            "[WEBRTC] Error dispatching socket reconnected event:",
            eventError,
          );
        }
      });

      socket.on("reconnect_attempt", (attemptNumber) => {
        console.log(`[WEBRTC] Socket reconnection attempt ${attemptNumber}`);
      });

      socket.on("reconnect_error", (error) => {
        console.error("[WEBRTC] Socket reconnection error:", error);
      });

      socket.on("reconnect_failed", () => {
        console.error("[WEBRTC] Socket failed to reconnect after all attempts");

        // Notify that socket failed to reconnect
        try {
          window.dispatchEvent(
            new CustomEvent("webrtc:socketReconnectFailed", {
              detail: {
                timestamp: new Date().toISOString(),
              },
            }),
          );
          console.log("[WEBRTC] Dispatched webrtc:socketReconnectFailed event");

          // Also dispatch a call:error event for the UI to show
          window.dispatchEvent(
            new CustomEvent("call:error", {
              detail: {
                error: "Không thể kết nối lại với máy chủ sau nhiều lần thử",
                code: "SOCKET_RECONNECT_FAILED",
                timestamp: new Date().toISOString(),
                recoverable: false,
              },
            }),
          );
        } catch (eventError) {
          console.error(
            "[WEBRTC] Error dispatching socket reconnect failed event:",
            eventError,
          );
        }
      });

      // Set up other event listeners
      setupSocketListeners(socket);

      // Add a heartbeat event handler to respond to server pings
      socket.on("heartbeat", (data) => {
        console.log("[WEBRTC] Received heartbeat from server:", data);
        // Respond to server heartbeat to confirm connection is active
        socket.emit("heartbeat_response", {
          timestamp: Date.now(),
          receivedAt: data?.timestamp,
        });
      });

      // Manually connect the socket after setting up all event listeners
      if (!state.socket) {
        console.error("[WEBRTC] Cannot connect socket: state.socket is null");
        reject(new Error("Socket is null, cannot connect"));
        return;
      }

      console.log("[WEBRTC] Manually connecting socket...");
      state.socket.connect();
      console.log("[WEBRTC] Socket connect() called");

      // Set up a verification check to ensure socket connects
      const verificationCheck = setTimeout(() => {
        if (!state.socket || !state.socket.connected) {
          console.error(
            "[WEBRTC] Socket failed to connect within verification period",
          );
          reject(
            new Error("Socket failed to connect within verification period"),
          );
        }
      }, 10000); // 10 second verification

      // Clear the verification check when connected
      state.socket.once("connect", () => {
        clearTimeout(verificationCheck);
      });
    } catch (error) {
      console.error("[WEBRTC] Error in connectToSocket:", error);
      reject(error);
    }
  });
}
