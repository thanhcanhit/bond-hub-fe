// lib/socket.ts
import { Socket } from "socket.io-client";
import io from "socket.io-client";

// Create a socket instance that will be initialized later
const socket: Socket = io({
  autoConnect: false, // Don't connect automatically
  forceNew: true, // Force a new connection
  reconnection: false, // Disable automatic reconnection
  timeout: 20000,
  transports: ["websocket"], // Use only websocket to avoid polling issues
});

// Create a dedicated socket for call namespace
let callSocket: Socket | null = null;

export { socket, callSocket }; // Export the sockets directly

export const setupSocket = (token: string) => {
  console.log(
    `Setting up socket with token: ${token ? "Token exists" : "No token"}`,
  );

  if (!token) {
    console.error("Cannot setup socket: No token provided");
    return;
  }

  // If socket is already connected, just return it
  if (socket.connected) {
    console.log("Socket already connected, reusing existing socket");
    return socket;
  }

  // Clean up socket if it exists but is not connected
  if (!socket.connected) {
    console.log("Cleaning up socket before reconnecting");
    try {
      socket.disconnect();
    } catch (error) {
      console.error("Error disconnecting socket:", error);
    }
  }

  // Update socket options and connect
  socket.auth = { token };

  const socketUrl =
    process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3000";
  console.log(`Setting socket URL to: ${socketUrl}`);

  // Create a new socket with updated options
  const newSocket = io(socketUrl, {
    auth: { token },
    reconnection: false,
    timeout: 20000,
    transports: ["websocket"],
    forceNew: true,
  });

  // Replace the old socket with the new one
  Object.assign(socket, newSocket);

  console.log("Socket options configured, connecting...");

  // Connect the socket
  try {
    socket.connect();
  } catch (error) {
    console.error("Error connecting socket:", error);
  }

  // Log connection status after a timeout
  setTimeout(() => {
    if (!socket.connected) {
      console.warn("⚠️ Socket failed to connect within timeout");
    }
  }, 5000);

  socket.on("connect", () => {
    console.log("✅ Connected to WebSocket server with ID:", socket?.id);
  });

  socket.on("disconnect", (reason) => {
    console.log("❌ Disconnected from WebSocket server. Reason:", reason);
  });

  socket.on("connect_error", (error) => {
    console.error("⚠️ Socket connection error:", error);
  });

  // Handle force logout event
  socket.on("forceLogout", (data: unknown) => {
    console.warn("🚨 Forced logout:", data);
    // Gọi logout và chuyển hướng
    import("@/stores/authStore").then(({ useAuthStore }) => {
      useAuthStore
        .getState()
        .logout()
        .then(() => {
          console.log("Logout successful, redirecting to login page");
          window.location.href = "/login";
        })
        .catch((error) => {
          console.error("Error during logout:", error);
          // Force redirect even if logout fails
          window.location.href = "/login";
        });
    });
  });

  return socket;
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
  if (socket.connected) {
    console.log("Manually disconnecting socket");
    socket.disconnect();
  }

  if (callSocket && callSocket.connected) {
    console.log("Manually disconnecting call socket");
    callSocket.disconnect();
  }
};

/**
 * Set up a dedicated socket for the call namespace
 * This is important because the main socket might be connected to a different namespace
 */
export const setupCallSocket = (token: string) => {
  console.log(
    `Setting up call socket with token: ${token ? "Token exists" : "No token"}`,
  );

  if (!token) {
    console.error("Cannot setup call socket: No token provided");
    return null;
  }

  // If we already have a connected socket, just return it
  if (callSocket && callSocket.connected) {
    console.log("Call socket already connected, reusing existing socket");
    return callSocket;
  }

  // Clean up existing socket if it exists but is not connected
  if (callSocket) {
    console.log("Cleaning up existing call socket before creating a new one");
    try {
      callSocket.removeAllListeners();
      callSocket.disconnect();
    } catch (error) {
      console.error("Error cleaning up existing call socket:", error);
    }
    callSocket = null;
  }

  // Get the socket URL
  const baseSocketUrl =
    process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3000";
  const callSocketUrl = `${baseSocketUrl}/call`;
  console.log(`Setting up call socket at URL: ${callSocketUrl}`);

  // Create a new socket for the call namespace
  try {
    callSocket = io(callSocketUrl, {
      auth: { token },
      reconnection: false, // Disable automatic reconnection
      timeout: 20000,
      transports: ["websocket"],
      forceNew: true, // Always create a new connection for the call namespace
    });
  } catch (error) {
    console.error("Error creating call socket:", error);
    return null;
  }

  // Set up event listeners for debugging
  callSocket.on("connect", () => {
    console.log(
      "✅ Connected to Call WebSocket server with ID:",
      callSocket?.id,
    );
  });

  callSocket.on("disconnect", (reason) => {
    console.log("❌ Disconnected from Call WebSocket server. Reason:", reason);
  });

  callSocket.on("connect_error", (error) => {
    console.error("⚠️ Call Socket connection error:", error);
  });

  // Track active calls to prevent duplicate notifications
  const activeCallIds = new Set<string>();

  // Add a direct debug listener for incoming calls
  callSocket.on("call:incoming", (data) => {
    console.log("🔔 DEBUG: Call socket received call:incoming event:", data);

    // Check if we're already handling this call
    if (activeCallIds.has(data.callId)) {
      console.log(
        `Call ${data.callId} is already being handled by call socket, ignoring duplicate event`,
      );
      return;
    }

    // Add to active calls
    activeCallIds.add(data.callId);

    // Dispatch a custom event that can be listened to by components
    if (typeof window !== "undefined") {
      console.log("Dispatching call:incoming custom event from call socket");
      window.dispatchEvent(new CustomEvent("call:incoming", { detail: data }));
    }

    // Remove from active calls after a delay to prevent duplicate notifications
    setTimeout(() => {
      activeCallIds.delete(data.callId);
    }, 5000);
  });

  // Also listen for legacy event name
  callSocket.on("incomingCall", (data) => {
    console.log(
      "🔔 DEBUG: Call socket received incomingCall event (legacy):",
      data,
    );

    // Check if we're already handling this call
    if (activeCallIds.has(data.callId)) {
      console.log(
        `Call ${data.callId} is already being handled by call socket, ignoring duplicate legacy event`,
      );
      return;
    }

    // Add to active calls
    activeCallIds.add(data.callId);

    // Dispatch a custom event that can be listened to by components
    if (typeof window !== "undefined") {
      console.log(
        "Dispatching call:incoming custom event from call socket (legacy)",
      );
      window.dispatchEvent(new CustomEvent("call:incoming", { detail: data }));
    }

    // Remove from active calls after a delay to prevent duplicate notifications
    setTimeout(() => {
      activeCallIds.delete(data.callId);
    }, 5000);
  });

  return callSocket;
};
