"use client";

import { Socket } from "socket.io-client";
import io from "socket.io-client";
import { useAuthStore } from "@/stores/authStore";

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
 * @param forceInit Force initialization even if not on a call page
 * @returns The initialized call socket
 */
export const initCallSocket = (
  token: string,
  forceInit: boolean = false,
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
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 30000, // Increased timeout to 30 seconds
      pingTimeout: 60000, // Increased ping timeout to 60 seconds
      pingInterval: 25000, // Set ping interval to 25 seconds
      transports: ["websocket"],
      forceNew: true, // Always create a new connection for the call namespace
    });

    // Set up a keep-alive interval to prevent timeout disconnections
    let keepAliveInterval: NodeJS.Timeout | null = null;

    // Start the keep-alive when connected
    callSocket.on("connect", () => {
      // Clear any existing interval
      if (keepAliveInterval) {
        clearInterval(keepAliveInterval);
      }

      // Set up a new keep-alive interval
      keepAliveInterval = setInterval(() => {
        if (callSocket && callSocket.connected) {
          console.log("[WEBRTC] Sending keep-alive ping to prevent timeout");
          callSocket.emit("ping", { timestamp: Date.now() });
        } else if (keepAliveInterval) {
          // Clear the interval if socket is no longer connected
          clearInterval(keepAliveInterval);
          keepAliveInterval = null;
        }
      }, 30000); // Send a ping every 30 seconds
    });

    // Clear the keep-alive interval when disconnected
    callSocket.on("disconnect", () => {
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

    // Try to reconnect after a delay if the disconnect wasn't intentional
    if (reason !== "io client disconnect") {
      // Check if we're in cleanup mode
      try {
        const isCleaningUp =
          sessionStorage.getItem("webrtc_cleaning_up") === "true";
        const intentionalDisconnect =
          sessionStorage.getItem("intentional_disconnect") === "true";

        if (isCleaningUp || intentionalDisconnect) {
          console.log(
            "[WEBRTC] Not reconnecting after disconnect because cleanup is in progress or disconnect was intentional",
          );
          return;
        }
      } catch (storageError) {
        console.warn("[WEBRTC] Error checking cleanup status:", storageError);
      }

      // Add a longer delay before reconnection attempt
      setTimeout(() => {
        console.log(
          "[WEBRTC] Attempting to reconnect call socket after disconnect...",
        );
        if (callSocket && !callSocket.connected) {
          callSocket.connect();
        }
      }, 3000);
    } else {
      console.log(
        "[WEBRTC] Not reconnecting after intentional disconnect (io client disconnect)",
      );
    }
  });

  callSocket.on("connect_error", (error) => {
    console.error("⚠️ [WEBRTC] Call Socket connection error:", error);

    // Try to reconnect after a delay
    setTimeout(() => {
      console.log(
        "[WEBRTC] Attempting to reconnect call socket after error...",
      );
      if (callSocket) {
        callSocket.connect();
      }
    }, 2000);
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
      "[WEBRTC] Call socket already connected, reusing existing socket",
    );
    return callSocket;
  }

  // If we have a socket that's connecting, wait for it
  if (callSocket && callSocket.connecting) {
    console.log(
      "[WEBRTC] Call socket is in connecting state, waiting for connection",
    );

    // Wait for the socket to connect with timeout
    const connectionTimeout = 5000;
    const startTime = Date.now();

    while (
      callSocket.connecting &&
      Date.now() - startTime < connectionTimeout
    ) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      console.log("[WEBRTC] Waiting for call socket to finish connecting...");
    }

    // Check if connection was successful
    if (callSocket.connected) {
      console.log("[WEBRTC] Call socket connected successfully while waiting");
      return callSocket;
    } else {
      console.log(
        "[WEBRTC] Call socket failed to connect while waiting, will try to initialize a new one",
      );
    }
  }

  // Try to initialize with token from auth store
  const authStore = useAuthStore.getState();
  if (authStore.accessToken) {
    const newSocket = initCallSocket(authStore.accessToken, forceInit);

    if (newSocket) {
      // Wait for the socket to connect with timeout
      if (!newSocket.connected) {
        console.log("[WEBRTC] Waiting for new call socket to connect...");

        // Connect the socket if it's not already connecting
        if (!newSocket.connecting) {
          newSocket.connect();
        }

        const connectionTimeout = 5000;
        const startTime = Date.now();

        while (
          !newSocket.connected &&
          Date.now() - startTime < connectionTimeout
        ) {
          await new Promise((resolve) => setTimeout(resolve, 500));
          console.log(
            "[WEBRTC] Still waiting for new call socket to connect...",
          );
        }
      }

      if (newSocket.connected) {
        console.log("[WEBRTC] New call socket connected successfully");
      } else {
        console.warn(
          "[WEBRTC] New call socket failed to connect within timeout",
        );
      }

      return newSocket;
    }
  }

  console.error("[WEBRTC] Cannot ensure call socket: No auth token available");
  return null;
};
