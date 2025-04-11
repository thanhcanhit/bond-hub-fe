// lib/socket.ts
import { Socket } from "socket.io-client";
import io from "socket.io-client";

let socket: Socket | null = null;

export const setupSocket = (token: string) => {
  if (!token) return;

  // Disconnect existing socket if any
  if (socket) {
    console.log("Disconnecting existing socket before creating a new one");
    socket.disconnect();
  }

  // Create new socket connection
  socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3000", {
    auth: { token },
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  });

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
  if (socket) {
    console.log("Manually disconnecting socket");
    socket.disconnect();
    socket = null;
  }
};
