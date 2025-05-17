import { Device } from "mediasoup-client";
import { useAuthStore } from "@/stores/authStore";
import { state } from "./state";
import { getCurrentRoomId, setCurrentRoomId } from "./state";
import { connectToSocket } from "./socket";
import {
  getUserMedia,
  toggleMute,
  toggleCamera,
  getRemoteStreams,
} from "./media";
import { setupRemoteStreamListeners } from "./events";
import { joinRoom } from "./room";
import { cleanup } from "./cleanup";
import { consume } from "./consumer";
import { produce } from "./producer";

// Keep track of initialization attempts to prevent infinite loops
const initAttemptKeys = new Map<string, number>();

/**
 * Initialize WebRTC connection
 * @param roomId Room ID to join
 * @param withVideo Whether to include video
 * @returns Promise that resolves when connection is established
 */
/**
 * Verify environment variables are correctly set
 * @returns True if environment variables are valid, false otherwise
 */
function verifyEnvironmentVariables(): boolean {
  console.log("[WEBRTC] Verifying environment variables...");

  // Check API URL
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  console.log(`[WEBRTC] NEXT_PUBLIC_API_URL: ${apiUrl || "undefined"}`);

  // Check Socket URL
  const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL;
  console.log(`[WEBRTC] NEXT_PUBLIC_SOCKET_URL: ${socketUrl || "undefined"}`);

  // Check WS URL
  const wsUrl = process.env.NEXT_PUBLIC_WS_URL;
  console.log(`[WEBRTC] NEXT_PUBLIC_WS_URL: ${wsUrl || "undefined"}`);

  // Check Backend URL
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
  console.log(`[WEBRTC] NEXT_PUBLIC_BACKEND_URL: ${backendUrl || "undefined"}`);

  // Store environment variables in sessionStorage for debugging
  try {
    sessionStorage.setItem("env_api_url", apiUrl || "undefined");
    sessionStorage.setItem("env_socket_url", socketUrl || "undefined");
    sessionStorage.setItem("env_ws_url", wsUrl || "undefined");
    sessionStorage.setItem("env_backend_url", backendUrl || "undefined");
    console.log("[WEBRTC] Stored environment variables in sessionStorage");
  } catch (storageError) {
    console.warn(
      "[WEBRTC] Error storing environment variables in sessionStorage:",
      storageError,
    );
  }

  // Check if any required variables are missing
  if (!apiUrl) {
    console.error(
      "[WEBRTC] Missing required environment variable: NEXT_PUBLIC_API_URL",
    );

    // Set a default value for API URL if it's missing
    try {
      // Use window.location to determine the current host
      if (typeof window !== "undefined") {
        const host = window.location.hostname;
        const port = window.location.port ? `:${window.location.port}` : "";
        const protocol = window.location.protocol;

        // Set a default API URL based on the current host
        const defaultApiUrl = `${protocol}//${host}${port}`;
        console.log(`[WEBRTC] Setting default API URL to: ${defaultApiUrl}`);

        // Store the default URL in sessionStorage for debugging
        sessionStorage.setItem("default_api_url", defaultApiUrl);

        // Use this as a fallback, but still return false to indicate the environment is not properly set
        process.env.NEXT_PUBLIC_API_URL = defaultApiUrl;
      }
    } catch (error) {
      console.error("[WEBRTC] Error setting default API URL:", error);
    }

    return false;
  }

  if (!socketUrl) {
    console.error(
      "[WEBRTC] Missing required environment variable: NEXT_PUBLIC_SOCKET_URL",
    );

    // Set a default value for Socket URL if it's missing
    try {
      // Use the API URL as a base for the socket URL
      if (apiUrl) {
        const defaultSocketUrl = apiUrl;
        console.log(
          `[WEBRTC] Setting default Socket URL to: ${defaultSocketUrl}`,
        );

        // Store the default URL in sessionStorage for debugging
        sessionStorage.setItem("default_socket_url", defaultSocketUrl);

        // Use this as a fallback, but still return false to indicate the environment is not properly set
        process.env.NEXT_PUBLIC_SOCKET_URL = defaultSocketUrl;
      }
    } catch (error) {
      console.error("[WEBRTC] Error setting default Socket URL:", error);
    }

    return false;
  }

  return true;
}

export async function initializeWebRTC(
  roomId: string,
  withVideo: boolean,
  forceConnect: boolean = false,
): Promise<MediaStream> {
  // Verify environment variables first
  const envValid = verifyEnvironmentVariables();
  if (!envValid) {
    console.error("[WEBRTC] Environment variables are not correctly set");
    console.log(
      "[WEBRTC] Will attempt to continue with default values, but this may cause issues",
    );

    // Dispatch an event to notify about environment variable issues
    try {
      window.dispatchEvent(
        new CustomEvent("webrtc:environmentError", {
          detail: {
            message:
              "Environment variables are not correctly set. Using fallback values.",
            timestamp: new Date().toISOString(),
          },
        }),
      );
    } catch (eventError) {
      console.error(
        "[WEBRTC] Error dispatching environment error event:",
        eventError,
      );
    }

    // Continue with default values instead of throwing an error
    // This allows the application to attempt to function even with missing environment variables
  }

  // Store the current room ID for recovery purposes
  setCurrentRoomId(roomId);

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
    try {
      await cleanup();
      console.log("[WEBRTC] Cleanup completed successfully");

      // Add a small delay after cleanup to ensure resources are properly released
      await new Promise((resolve) => setTimeout(resolve, 500));
    } catch (cleanupError) {
      console.error("[WEBRTC] Error during cleanup:", cleanupError);
      // Continue anyway, but log the error
    }

    // 1. Initialize device - handle "already loaded" case properly
    try {
      // First check if we already have a loaded device
      if (state.device && state.device.loaded) {
        console.log("[WEBRTC] Device already exists and is loaded, reusing it");
      } else {
        // If device exists but has issues, clear it first
        if (state.device) {
          console.log(
            "[WEBRTC] Clearing existing device before creating a new one",
          );
          state.device = null;
        }

        console.log("[WEBRTC] Creating new mediasoup Device");
        // Create a new Device with default options
        state.device = new Device();
        console.log("[WEBRTC] Device created successfully");
      }
    } catch (error: any) {
      console.error("[WEBRTC] Error creating Device:", error);

      // Handle "already loaded" error properly
      if (error.message && error.message.includes("already loaded")) {
        console.log(
          "[WEBRTC] Device already loaded error caught, using existing device",
        );
        // No need to throw error, the device is already loaded and can be used
      } else {
        // For other errors, we need to reset the device and try again
        console.error("[WEBRTC] Critical device error:", error);
        state.device = null;

        // Try one more time with a clean state
        try {
          console.log("[WEBRTC] Attempting to create device again after error");
          state.device = new Device();
          console.log("[WEBRTC] Device created successfully on second attempt");
        } catch (retryError: any) {
          console.error(
            "[WEBRTC] Failed to create device on retry:",
            retryError,
          );
          throw new Error(
            "Failed to create mediasoup Device: " + retryError.message,
          );
        }
      }
    }

    // 2. Connect to socket
    console.log("[WEBRTC] Connecting to socket server...");

    // Create a function to verify socket connection - improved for reliability
    const verifySocketConnection = async (
      attempt = 1,
      maxAttempts = 5, // Increased max attempts
    ): Promise<void> => {
      if (attempt > maxAttempts) {
        throw new Error(
          `Failed to establish stable socket connection after ${maxAttempts} attempts`,
        );
      }

      try {
        // First check if we already have a socket from callSocket.ts
        try {
          // Import the socket modules
          const callSocketModule = await import("@/lib/callSocket");
          const socketModule = await import("@/lib/socket");
          const authStore = useAuthStore.getState();
          const token = authStore.accessToken;

          if (!token) {
            console.error(
              "[WEBRTC] No token available for socket initialization",
            );
            throw new Error("No token available for socket initialization");
          }

          // First set up the main socket
          console.log("[WEBRTC] Setting up main socket");
          socketModule.setupSocket(token);

          // Then check if we have an existing call socket
          const existingSocket = callSocketModule.getCallSocket();

          if (existingSocket && existingSocket.connected) {
            console.log(
              "[WEBRTC] Using existing connected socket from callSocket.ts with ID:",
              existingSocket.id,
            );
            state.socket = existingSocket;
            return;
          }

          // No connected socket, ensure a new one
          console.log(
            "[WEBRTC] No connected socket found, ensuring call socket",
          );

          // Ensure call socket is initialized and connected with improved error handling
          try {
            const callSocket = await callSocketModule.ensureCallSocket(true);

            if (!callSocket) {
              throw new Error("Failed to create call socket");
            }

            console.log("[WEBRTC] Successfully initialized call socket");
            state.socket = callSocket;

            // Wait for connection to establish if needed
            if (!callSocket.connected) {
              console.log("[WEBRTC] Waiting for call socket to connect...");

              // Connect the socket if it's not already connecting
              if (!callSocket.connecting) {
                callSocket.connect();
              }

              // Set up a promise-based connection wait with timeout
              const waitForConnection = () => {
                return new Promise<boolean>((resolve, reject) => {
                  // Set up a timeout
                  const timeout = setTimeout(() => {
                    callSocket.off("connect");
                    callSocket.off("connect_error");
                    resolve(false);
                  }, 15000); // Increased timeout to 15 seconds

                  // Set up connect listener
                  callSocket.once("connect", () => {
                    clearTimeout(timeout);
                    callSocket.off("connect_error");
                    resolve(true);
                  });

                  // Set up error listener
                  callSocket.once("connect_error", (error) => {
                    clearTimeout(timeout);
                    console.error("[WEBRTC] Socket connect_error:", error);
                    reject(
                      new Error(`Socket connection error: ${error.message}`),
                    );
                  });

                  // If already connected, resolve immediately
                  if (callSocket.connected) {
                    clearTimeout(timeout);
                    resolve(true);
                  }
                });
              };

              // Wait for connection
              try {
                const connected = await waitForConnection();
                if (connected) {
                  console.log(
                    "[WEBRTC] Call socket connected successfully with ID:",
                    callSocket.id,
                  );
                  return;
                } else {
                  console.warn(
                    "[WEBRTC] Call socket failed to connect within timeout, will try connectToSocket",
                  );
                }
              } catch (connectionError) {
                console.error(
                  "[WEBRTC] Error connecting socket:",
                  connectionError,
                );
                throw connectionError;
              }
            } else {
              console.log(
                "[WEBRTC] Call socket already connected with ID:",
                callSocket.id,
              );
              return;
            }
          } catch (socketError) {
            console.error(
              "[WEBRTC] Error initializing call socket:",
              socketError,
            );
            throw socketError;
          }
        } catch (importError) {
          console.error(
            "[WEBRTC] Error with socket initialization:",
            importError,
          );
        }

        // Connect to socket - this now assigns socket to state immediately before connecting
        await connectToSocket();
        console.log(
          `[WEBRTC] Socket connection initiated (attempt ${attempt}/${maxAttempts})`,
        );

        // Check if socket exists immediately after connectToSocket()
        if (!state.socket) {
          console.error(
            "[WEBRTC] Socket object is null after connectToSocket()",
          );

          // Try to create a fallback socket with improved configuration
          try {
            console.log("[WEBRTC] Attempting to create fallback socket");
            const { io } = await import("socket.io-client");
            const authStore = useAuthStore.getState();
            const socketUrl = `${process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3000"}/call`;

            // Create a more robust fallback socket
            const fallbackSocket = io(socketUrl, {
              auth: { token: authStore.accessToken },
              forceNew: true,
              reconnection: true,
              reconnectionAttempts: 5, // Increased reconnection attempts
              reconnectionDelay: 1000, // Start with shorter delay
              reconnectionDelayMax: 5000, // Maximum delay between attempts
              timeout: 30000, // Increased timeout for better reliability
              transports: ["websocket"], // Use only websocket to avoid polling issues
            });

            // Set up error handlers
            fallbackSocket.on("connect_error", (error) => {
              console.error("[WEBRTC] Fallback socket connect_error:", error);
            });

            fallbackSocket.on("error", (error) => {
              console.error("[WEBRTC] Fallback socket general error:", error);
            });

            if (fallbackSocket) {
              console.log("[WEBRTC] Created fallback socket");
              state.socket = fallbackSocket;

              // Connect the socket
              state.socket.connect();

              // Wait a short time for connection to establish
              await new Promise((resolve) => setTimeout(resolve, 1000));
            } else {
              throw new Error("Failed to create fallback socket");
            }
          } catch (fallbackError) {
            console.error(
              "[WEBRTC] Failed to create fallback socket:",
              fallbackError,
            );
            throw new Error(
              "Socket object is null after connectToSocket() and fallback creation failed",
            );
          }
        }

        console.log(
          "[WEBRTC] Socket object exists in state:",
          state.socket.id || "(no ID yet)",
        );

        // The socket should be connected at this point because connectToSocket()
        // waits for the connection to be established before resolving
        if (!state.socket.connected) {
          console.error(
            "[WEBRTC] Socket exists but not connected after connectToSocket()",
          );
          throw new Error(
            "Socket exists but not connected after connectToSocket()",
          );
        }

        console.log(
          `[WEBRTC] Socket connected successfully with ID: ${state.socket.id}`,
        );

        // Add a short delay to ensure connection is stable
        const verificationDelay = 1000; // 1 second is enough to verify stability
        console.log(
          `[WEBRTC] Waiting ${verificationDelay}ms to verify socket connection stability`,
        );
        await new Promise((resolve) => setTimeout(resolve, verificationDelay));

        // Verify socket is still connected after the delay
        if (!state.socket || !state.socket.connected) {
          console.error(
            "[WEBRTC] Socket disconnected during verification period",
          );
          throw new Error("Socket disconnected during verification period");
        }

        // Send a test message to verify the connection is working
        try {
          console.log(
            "[WEBRTC] Sending test message to verify socket connection",
          );
          state.socket.emit("ping", { timestamp: Date.now() });
        } catch (pingError) {
          console.error("[WEBRTC] Error sending test message:", pingError);
          // Don't throw here, just log the error
        }

        // Verify socket has an ID
        if (!state.socket.id) {
          console.error("[WEBRTC] Socket has no ID after connection");
          throw new Error("Socket has no ID after connection");
        }

        // Verify socket is still connected after the delay
        if (!state.socket || !state.socket.connected) {
          console.error(
            "[WEBRTC] Socket disconnected after initial connection",
          );

          // If we still have attempts left, try again
          if (attempt < maxAttempts) {
            console.log(
              `[WEBRTC] Attempting reconnection (${attempt + 1}/${maxAttempts})`,
            );
            await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait 2 seconds before retry
            return verifySocketConnection(attempt + 1, maxAttempts);
          } else {
            throw new Error(
              "Socket connection unstable after multiple attempts",
            );
          }
        } else {
          console.log(
            `[WEBRTC] Socket connection verified and stable with ID: ${state.socket.id}`,
          );

          // Store the socket ID in sessionStorage for debugging
          try {
            sessionStorage.setItem("lastStableSocketId", state.socket.id);
            console.log(
              `[WEBRTC] Stored stable socket ID in sessionStorage: ${state.socket.id}`,
            );
          } catch (storageError) {
            console.warn(
              "[WEBRTC] Error storing socket ID in sessionStorage:",
              storageError,
            );
          }
        }
      } catch (socketError) {
        console.error(
          `[WEBRTC] Error connecting to socket (attempt ${attempt}/${maxAttempts}):`,
          socketError,
        );

        // If we still have attempts left, try again
        if (attempt < maxAttempts) {
          console.log(
            `[WEBRTC] Waiting before retry attempt ${attempt + 1}/${maxAttempts}`,
          );
          await new Promise((resolve) => setTimeout(resolve, 2000 * attempt)); // Increasing backoff
          return verifySocketConnection(attempt + 1, maxAttempts);
        } else {
          throw socketError;
        }
      }
    };

    // Try to establish a stable socket connection
    await verifySocketConnection();

    // Add a listener for socket reconnection events to handle WebRTC recovery
    if (state.socket) {
      state.socket.on("reconnect", async () => {
        console.log(
          "[WEBRTC] Socket reconnected, checking if WebRTC needs recovery",
        );

        // Check if we're still in a call
        const roomId = getCurrentRoomId();
        if (!roomId) {
          console.log("[WEBRTC] No active room ID, no recovery needed");
          return;
        }

        // Check if we need to rejoin the room
        try {
          console.log(
            `[WEBRTC] Attempting to rejoin room ${roomId} after reconnection`,
          );
          await joinRoom(roomId);
          console.log(
            `[WEBRTC] Successfully rejoined room ${roomId} after reconnection`,
          );

          // Notify that WebRTC connection has been recovered
          window.dispatchEvent(
            new CustomEvent("webrtc:connectionRecovered", {
              detail: {
                roomId,
                timestamp: new Date().toISOString(),
              },
            }),
          );
        } catch (error) {
          console.error(
            "[WEBRTC] Failed to rejoin room after reconnection:",
            error,
          );

          // Notify that WebRTC recovery failed
          window.dispatchEvent(
            new CustomEvent("webrtc:recoveryFailed", {
              detail: {
                roomId,
                error: error instanceof Error ? error.message : "Unknown error",
                timestamp: new Date().toISOString(),
              },
            }),
          );
        }
      });
    }

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

    // Check if this is an AwaitQueueStoppedError
    const isQueueStoppedError =
      error.name === "AwaitQueueStoppedError" ||
      (error.message && error.message.includes("queue stopped"));

    if (isQueueStoppedError) {
      console.warn(
        "[WEBRTC] Caught AwaitQueueStoppedError during initialization",
      );

      // Set a flag to prevent immediate retries
      try {
        // Store error details for debugging
        const queueErrors = JSON.parse(
          sessionStorage.getItem("queueStoppedErrors") || "[]",
        );
        queueErrors.push({
          timestamp: new Date().toISOString(),
          roomId: roomId,
          location: "initializeWebRTC",
          attempt: initAttempts,
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

        // Try to perform an emergency cleanup to reset the state
        try {
          console.log(
            "[WEBRTC] Performing emergency cleanup after AwaitQueueStoppedError",
          );

          // Reset all state to ensure clean slate
          state.producers.clear();
          state.consumers.clear();
          state.remoteStreams.clear();
          state.sendTransport = null;
          state.recvTransport = null;

          // Stop local stream tracks if they exist
          if (state.localStream) {
            state.localStream.getTracks().forEach((track) => {
              try {
                track.stop();
                console.log(
                  `[WEBRTC] Stopped ${track.kind} track: ${track.id} during emergency cleanup`,
                );
              } catch (trackError) {
                console.error(
                  `[WEBRTC] Error stopping ${track.kind} track during emergency cleanup:`,
                  trackError,
                );
              }
            });
            state.localStream = null;
          }

          // Disconnect socket if it exists
          if (state.socket) {
            try {
              state.socket.disconnect();
              console.log(
                "[WEBRTC] Socket disconnected during emergency cleanup",
              );
            } catch (socketError) {
              console.error(
                "[WEBRTC] Error disconnecting socket during emergency cleanup:",
                socketError,
              );
            }
            state.socket = null;
          }

          state.device = null;
          setCurrentRoomId(null);

          console.log("[WEBRTC] Emergency cleanup completed");
        } catch (cleanupError) {
          console.error(
            "[WEBRTC] Error during emergency cleanup:",
            cleanupError,
          );
        }

        // Clear the flag after a delay to allow future attempts
        setTimeout(() => {
          sessionStorage.removeItem("webrtc_queue_stopped");
          console.log("[WEBRTC] Cleared queue stopped flag after timeout");
        }, 15000); // Increased from 10s to 15s to give more time

        // Dispatch a special event to notify that we've encountered a queue stopped error
        try {
          window.dispatchEvent(
            new CustomEvent("webrtc:queueStoppedError", {
              detail: {
                roomId: roomId,
                timestamp: new Date().toISOString(),
                attempt: initAttempts,
              },
            }),
          );
          console.log("[WEBRTC] Dispatched webrtc:queueStoppedError event");

          // Also try to notify via BroadcastChannel
          try {
            const callChannel = new BroadcastChannel("call_events");
            callChannel.postMessage({
              type: "QUEUE_STOPPED_ERROR",
              roomId: roomId,
              timestamp: new Date().toISOString(),
              attempt: initAttempts,
            });
            console.log(
              "[WEBRTC] Sent QUEUE_STOPPED_ERROR message via BroadcastChannel",
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
            "[WEBRTC] Error dispatching queue stopped error event:",
            eventError,
          );
        }
      } catch (storageError) {
        console.warn("[WEBRTC] Error accessing sessionStorage:", storageError);
      }
    }

    // Try to clean up on error
    try {
      await cleanup();

      // Add a small delay after cleanup to ensure resources are properly released
      await new Promise((resolve) => setTimeout(resolve, 500));
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
            isQueueStoppedError,
          },
        }),
      );
      console.log("[WEBRTC] Dispatched webrtc:initializationError event");

      // Also dispatch a more general call:error event for broader compatibility
      window.dispatchEvent(
        new CustomEvent("call:error", {
          detail: {
            error: isQueueStoppedError
              ? "Không thể kết nối cuộc gọi: Lỗi kết nối"
              : `Không thể kết nối cuộc gọi: ${error.message || "Lỗi không xác định"}`,
            code: isQueueStoppedError
              ? "AWAIT_QUEUE_STOPPED"
              : "WEBRTC_INIT_ERROR",
            roomId,
            timestamp: new Date().toISOString(),
          },
        }),
      );
      console.log("[WEBRTC] Dispatched call:error event");

      // Also try to notify via BroadcastChannel
      try {
        const callChannel = new BroadcastChannel("call_events");
        callChannel.postMessage({
          type: "CALL_ERROR",
          error: isQueueStoppedError
            ? "Không thể kết nối cuộc gọi: Lỗi kết nối"
            : `Không thể kết nối cuộc gọi: ${error.message || "Lỗi không xác định"}`,
          code: isQueueStoppedError
            ? "AWAIT_QUEUE_STOPPED"
            : "WEBRTC_INIT_ERROR",
          roomId,
          timestamp: new Date().toISOString(),
        });
        console.log("[WEBRTC] Broadcast CALL_ERROR message to all windows");
        callChannel.close();
      } catch (channelError) {
        console.error("[WEBRTC] Error broadcasting call error:", channelError);
      }
    } catch (eventError) {
      console.error("[WEBRTC] Error dispatching error events:", eventError);
    }

    throw error;
  }
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

// Export public API
export { toggleMute, toggleCamera, getRemoteStreams, cleanup };
