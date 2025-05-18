"use client";

import { Socket } from "socket.io-client";
import io from "socket.io-client";
// Fix import path with dynamic import to avoid TypeScript error
// We'll use dynamic import in the functions that need it

// Create a dedicated socket for call namespace
let callSocket: Socket | null = null;

/**
 * Get the current call socket instance
 * @returns The current call socket instance or null if not initialized
 */
export const getCallSocket = (): Socket | null => {
  return callSocket;
};

/**
 * Initialize a new call socket with the provided token
 * @param token Authentication token
 * @param _forceInit Force initialization even if not on a call page (unused but kept for API compatibility)
 * @returns The initialized call socket
 */
export const initCallSocket = (
  token: string,
  _forceInit: boolean = false, // Renamed to _forceInit to indicate it's not used
): Socket | null => {
  console.log(
    `[WEBRTC] Setting up call socket with token: ${token ? "Token exists" : "No token"}`,
  );

  if (!token) {
    console.error("[WEBRTC] Cannot setup call socket: No token provided");
    return null;
  }

  // This section is now handled in the try/catch block below

  // Get the socket URL
  const baseSocketUrl =
    process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3000";
  const callSocketUrl = `${baseSocketUrl}/call`;
  console.log(`[WEBRTC] Connecting to call socket at ${callSocketUrl}`);
  console.log(
    `[WEBRTC] NEXT_PUBLIC_SOCKET_URL: ${process.env.NEXT_PUBLIC_SOCKET_URL}`,
  );
  console.log(
    `[WEBRTC] NEXT_PUBLIC_API_URL: ${process.env.NEXT_PUBLIC_API_URL}`,
  );

  // Create a new socket for the call namespace
  try {
    // Disconnect any existing socket first
    if (callSocket) {
      callSocket.disconnect();
      callSocket.removeAllListeners();
      callSocket = null;
    }

    console.log("[WEBRTC] Creating new call socket connection");
    callSocket = io(callSocketUrl, {
      auth: { token },
      reconnection: false, // Disable automatic reconnection
      timeout: 60000, // 60 second timeout
      // pingTimeout is not in the type definition, but it's a valid option
      // @ts-ignore - socket.io does support this option
      pingTimeout: 180000, // Increased ping timeout to 3 minutes
      pingInterval: 10000, // More frequent pings (every 10 seconds)
      transports: ["websocket"],
      forceNew: true, // Always create a new connection for the call namespace
      autoConnect: true, // Auto connect when initialized
    });

    // Set up a simple ping mechanism to keep the connection alive
    let keepAliveInterval: NodeJS.Timeout | null = null;

    // Start the keep-alive when connected
    callSocket.on("connect", () => {
      // Clear any existing interval
      if (keepAliveInterval) {
        clearInterval(keepAliveInterval);
      }

      // Set up a keep-alive interval with pings
      keepAliveInterval = setInterval(() => {
        if (callSocket && callSocket.connected) {
          console.log("[WEBRTC] Sending keep-alive ping");
          callSocket.emit("ping", { timestamp: Date.now() });

          // Store the last ping timestamp in sessionStorage
          try {
            sessionStorage.setItem("last_socket_ping", Date.now().toString());
          } catch (storageError) {
            // Ignore storage errors
          }
        } else if (keepAliveInterval) {
          // Clear the interval if socket is no longer connected
          clearInterval(keepAliveInterval);
          keepAliveInterval = null;
        }
      }, 8000); // Send a ping every 8 seconds
    });

    // Clear the keep-alive interval when disconnected
    callSocket.on("disconnect", (reason) => {
      console.log(`[WEBRTC] Socket disconnected. Reason: ${reason}`);

      if (keepAliveInterval) {
        clearInterval(keepAliveInterval);
        keepAliveInterval = null;
      }
    });
  } catch (error) {
    console.error("[WEBRTC] Error creating call socket:", error);
    return null;
  }

  // Set up event listeners for debugging
  callSocket.on("connect", () => {
    console.log(
      "✅ [WEBRTC] Connected to Call WebSocket server with ID:",
      callSocket?.id,
    );
  });

  callSocket.on("disconnect", (reason) => {
    console.log(
      "❌ [WEBRTC] Disconnected from Call WebSocket server. Reason:",
      reason,
    );
    // No reconnection attempts
  });

  callSocket.on("connect_error", (error) => {
    console.error("⚠️ [WEBRTC] Call Socket connection error:", error);
    // No reconnection attempts
  });

  // Add a pong listener to confirm server connection is active
  callSocket.on("pong", (data) => {
    // Only log occasionally to avoid console spam
    if (Math.random() < 0.2) {
      console.log("[WEBRTC] Received pong from server:", data);
    }

    // Store the last pong timestamp in sessionStorage
    try {
      sessionStorage.setItem("last_socket_pong", Date.now().toString());
    } catch (storageError) {
      // Ignore storage errors
    }
  });

  // Track active calls to prevent duplicate notifications
  const activeCallIds = new Set<string>();

  // Add a direct debug listener for incoming calls
  callSocket.on("call:incoming", (data) => {
    console.log("[WEBRTC] Call socket received call:incoming event:", data);

    // Check if we're already handling this call
    if (activeCallIds.has(data.callId)) {
      console.log(
        `[WEBRTC] Call ${data.callId} is already being handled by call socket, ignoring duplicate event`,
      );
      return;
    }

    // Add to active calls
    activeCallIds.add(data.callId);

    // Dispatch a custom event that can be listened to by components
    if (typeof window !== "undefined") {
      console.log(
        "[WEBRTC] Dispatching call:incoming custom event from call socket",
      );
      window.dispatchEvent(new CustomEvent("call:incoming", { detail: data }));
    }
  });

  // Also listen for legacy event name
  callSocket.on("incomingCall", (data) => {
    console.log(
      "[WEBRTC] Call socket received incomingCall event (legacy):",
      data,
    );

    // Check if we're already handling this call
    if (activeCallIds.has(data.callId)) {
      console.log(
        `[WEBRTC] Call ${data.callId} is already being handled by call socket, ignoring duplicate legacy event`,
      );
      return;
    }

    // Add to active calls
    activeCallIds.add(data.callId);

    // Dispatch a custom event that can be listened to by components
    if (typeof window !== "undefined") {
      console.log(
        "[WEBRTC] Dispatching call:incoming custom event from call socket (legacy)",
      );
      window.dispatchEvent(new CustomEvent("call:incoming", { detail: data }));
    }
  });

  // Listen for call ended events
  callSocket.on("call:ended", (data) => {
    console.log("[WEBRTC] Call socket received call:ended event:", data);

    // Remove from active calls
    if (data.callId) {
      activeCallIds.delete(data.callId);
    }

    // Dispatch a custom event
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("call:ended", { detail: data }));
    }
  });

  return callSocket;
};

/**
 * Ensure call socket is initialized and connected
 * @param forceInit Force initialization even if not on a call page
 * @returns The call socket instance
 */
export const ensureCallSocket = async (
  forceInit: boolean = false,
): Promise<Socket | null> => {
  // If we already have a connected socket, return it
  if (callSocket && callSocket.connected) {
    console.log(
      "[WEBRTC] Call socket already connected, reusing existing socket with ID:",
      callSocket.id,
    );
    return callSocket;
  }

  // If we have a socket that's not connected, clean it up and create a new one
  if (callSocket) {
    console.log("[WEBRTC] Call socket exists but not connected, cleaning up");

    // Clean up the existing socket
    try {
      callSocket.disconnect();
      callSocket.removeAllListeners();
      callSocket = null;
    } catch (cleanupError) {
      console.error(
        "[WEBRTC] Error cleaning up existing socket:",
        cleanupError,
      );
    }
  }

  // Try to initialize with token from auth store
  try {
    // Get token from multiple sources
    let token: string | null = null;

    // First try auth store
    const { useAuthStore } = await import("../stores/authStore");
    const authStore = useAuthStore.getState();
    token = authStore.accessToken;

    // If no token in auth store, try session storage
    if (!token) {
      try {
        const storedToken = sessionStorage.getItem("callAccessToken");
        if (storedToken) {
          console.log(
            "[WEBRTC] Using token from sessionStorage for call socket",
          );
          token = storedToken;
        }
      } catch (storageError) {
        console.warn("[WEBRTC] Error accessing sessionStorage:", storageError);
      }
    }

    if (!token) {
      console.error(
        "[WEBRTC] No authentication token available for call socket",
      );
      return null;
    }

    console.log("[WEBRTC] Creating new call socket with token");
    const newSocket = initCallSocket(token, forceInit);

    if (newSocket) {
      // Check if the socket is connected
      if (newSocket.connected) {
        console.log(
          "[WEBRTC] New call socket connected successfully with ID:",
          newSocket.id,
        );

        // Store the socket ID in sessionStorage for debugging
        try {
          if (newSocket.id) {
            sessionStorage.setItem("last_connected_socket_id", newSocket.id);
            sessionStorage.setItem(
              "last_socket_connect_time",
              Date.now().toString(),
            );
          }
        } catch (storageError) {
          // Ignore storage errors
        }

        // Dispatch an event to notify that the socket is ready
        try {
          window.dispatchEvent(
            new CustomEvent("call:socket:ready", {
              detail: {
                socketId: newSocket.id,
                timestamp: new Date().toISOString(),
              },
            }),
          );
          console.log(
            "[WEBRTC] Dispatched call:socket:ready event for new socket",
          );
        } catch (eventError) {
          console.error(
            "[WEBRTC] Error dispatching socket ready event:",
            eventError,
          );
        }

        return newSocket;
      } else {
        console.warn("[WEBRTC] New call socket is not connected");

        // Clean up the socket
        newSocket.disconnect();
        newSocket.removeAllListeners();
        return null;
      }
    }
  } catch (error) {
    console.error("[WEBRTC] Error ensuring call socket:", error);
  }

  console.error(
    "[WEBRTC] Cannot ensure call socket: No auth token available or connection failed",
  );
  return null;
};
