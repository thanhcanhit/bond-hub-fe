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
  return new Promise((resolve, reject) => {
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

      // If we have a socket that's connecting, wait for it to connect
      if (state.socket && state.socket.connecting) {
        console.log(
          "[WEBRTC] Socket is already connecting, waiting for connection...",
        );

        // Set up a one-time connect event listener
        state.socket.once("connect", () => {
          console.log("[WEBRTC] Socket connected successfully while waiting");
          connectionAttempts = 0;
          lastConnectionAttempt = 0;
          resolve();
        });

        // Set up a one-time connect_error event listener
        state.socket.once("connect_error", (error) => {
          console.error("[WEBRTC] Socket connect error while waiting:", error);
          reject(new Error("Socket connection error: " + error.message));
        });

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
        // Use setTimeout instead of await to avoid top-level await issues
        setTimeout(() => {
          console.log("[WEBRTC] Delay completed, proceeding with connection");
          proceedWithSocketConnection();
        }, CONNECTION_ATTEMPT_INTERVAL);

        // Return early - the setTimeout callback will continue execution
        return;
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

      // Check if we've had a recent queue stopped error
      try {
        const queueStopped =
          sessionStorage.getItem("webrtc_queue_stopped") === "true";
        if (queueStopped) {
          console.warn(
            "[WEBRTC] Recent queue stopped error detected, adding extra delay before socket connection",
          );

          // Use a setTimeout instead of await to add a delay
          setTimeout(() => {
            console.log(
              "[WEBRTC] Delay completed, proceeding with socket connection",
            );

            // Continue with socket connection after delay
            proceedWithSocketConnection();
          }, 1000);

          // Return early - the setTimeout callback will continue execution
          return;
        }

        // If no queue stopped error, proceed immediately
        proceedWithSocketConnection();
      } catch (storageError) {
        console.warn("[WEBRTC] Error accessing sessionStorage:", storageError);
        // Proceed with socket connection even if there's an error
        proceedWithSocketConnection();
      }

      // Define the function to proceed with socket connection
      function proceedWithSocketConnection() {
        // If we have a socket but it's not connected, clean it up first
        if (state.socket) {
          console.log("[WEBRTC] Socket exists but not connected, cleaning up");
          try {
            state.socket.removeAllListeners();
            state.socket.disconnect();
          } catch (error) {
            console.error(
              "[WEBRTC] Error disconnecting existing socket:",
              error,
            );
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

        // Get user ID from multiple sources
        let userId = user?.id;

        // If no user ID from auth store, try to get from session storage
        if (!userId) {
          const storedUserId = sessionStorage.getItem("currentUserId");
          if (storedUserId) {
            console.log(
              `[WEBRTC] Using user ID from sessionStorage: ${storedUserId}`,
            );
            userId = storedUserId;
          }
        }

        // If still no user ID, try to get from URL parameters
        if (!userId && typeof window !== "undefined") {
          const urlParams = new URLSearchParams(window.location.search);
          const urlUserId = urlParams.get("userId");
          if (urlUserId) {
            console.log(
              `[WEBRTC] Using user ID from URL parameters: ${urlUserId}`,
            );
            userId = urlUserId;
          }
        }

        if (!accessToken || !userId) {
          console.error(
            "[WEBRTC] Not authenticated - missing token or user ID",
          );
          reject(new Error("Not authenticated - missing token or user ID"));
          return;
        }

        const currentUserId = userId;

        // Ensure Socket URL is not undefined
        const socketUrl = `${process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3000"}/call`;
        console.log(`[WEBRTC] Connecting to call socket at ${socketUrl}`);

        // Add a connection timeout
        const connectionTimeout = setTimeout(() => {
          console.error("[WEBRTC] Socket connection timeout after 30 seconds");
          reject(new Error("Socket connection timeout"));
        }, 30000); // Increased to 30 seconds timeout to match socket timeout

        try {
          // Create socket with robust configuration for persistent connection
          const newSocket = io(socketUrl, {
            auth: {
              token: accessToken,
              userId: currentUserId,
            },
            transports: ["websocket"], // Use only websocket to avoid polling issues
            reconnection: true, // Enable automatic reconnection for persistent connection
            reconnectionAttempts: Infinity, // Unlimited reconnection attempts
            reconnectionDelay: 1000, // Start with 1s delay
            reconnectionDelayMax: 5000, // Maximum 5s delay between reconnection attempts
            timeout: 60000, // Increased timeout to 60s for better reliability
            // @ts-ignore - socket.io does support this option
            pingTimeout: 180000, // Increased ping timeout to 3 minutes
            pingInterval: 10000, // More frequent pings (every 10 seconds)
            forceNew: true, // Force a new connection to avoid reusing problematic connections
            autoConnect: false, // Don't connect automatically, we'll do it manually
          });

          // Set up error handlers before connecting
          newSocket.on("connect_error", (error) => {
            console.error("[WEBRTC] Socket connect_error:", error);
          });

          newSocket.on("connect_timeout", () => {
            console.error("[WEBRTC] Socket connect_timeout");
          });

          newSocket.on("error", (error) => {
            console.error("[WEBRTC] Socket general error:", error);
          });

          // Assign socket to state immediately so it's available for verification
          state.socket = newSocket;
          console.log(
            "[WEBRTC] Socket created successfully and assigned to state",
          );
        } catch (socketCreationError) {
          console.error("[WEBRTC] Error creating socket:", socketCreationError);
          clearTimeout(connectionTimeout);
          reject(
            new Error(
              "Failed to create socket: " + socketCreationError.message,
            ),
          );
          return;
        }

        // Set up connection event listener
        if (!state.socket) {
          console.error(
            "[WEBRTC] Cannot set up event listeners: state.socket is null",
          );
          clearTimeout(connectionTimeout);
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
            }
          } catch (storageError) {
            console.warn(
              "[WEBRTC] Error storing socket ID in sessionStorage:",
              storageError,
            );
          }

          // Set up event listeners
          setupSocketListeners(state.socket);

          // Set up a keep-alive ping interval to prevent timeouts
          const keepAliveInterval = setInterval(() => {
            if (state.socket && state.socket.connected) {
              console.log(
                "[WEBRTC] Sending keep-alive ping to prevent timeout",
              );
              state.socket.emit("ping", { timestamp: Date.now() });

              // Store the last ping timestamp in sessionStorage
              try {
                sessionStorage.setItem(
                  "last_webrtc_socket_ping",
                  Date.now().toString(),
                );
              } catch (storageError) {
                // Ignore storage errors
              }
            } else if (state.socket && !state.socket.connected) {
              console.log(
                "[WEBRTC] Socket disconnected, clearing keep-alive interval",
              );
              clearInterval(keepAliveInterval);
            }
          }, 8000); // Send a ping every 8 seconds

          // Store the interval ID in the state for cleanup
          state.keepAliveInterval = keepAliveInterval;

          resolve();
        });

        // Handle connection errors
        state.socket.on("connect_error", (error) => {
          clearTimeout(connectionTimeout);
          console.error("[WEBRTC] Socket connection error:", error);
          reject(error);
        });

        // Manually connect the socket after setting up all event listeners
        console.log("[WEBRTC] Manually connecting socket...");
        state.socket.connect();
      }
    } catch (error) {
      console.error("[WEBRTC] Error in connectToSocket:", error);
      reject(error);
    }
  });
}
