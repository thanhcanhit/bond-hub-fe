// lib/socket.ts
import { Socket } from "socket.io-client";
import io from "socket.io-client";

let socket: Socket | null = null;

export const setupSocket = (token: string) => {
  if (!token) return;

  socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3000", {
    auth: { token },
  });

  socket.on("connect", () => {
    console.log("✅ Connected to WebSocket server");
  });

  socket.on("disconnect", () => {
    console.log("❌ Disconnected from WebSocket server");
  });

  socket.on("forceLogout", (data: unknown) => {
    console.warn("🚨 Forced logout:", data);
    // Gọi logout và chuyển hướng
    import("@/stores/authStore").then(({ useAuthStore }) => {
      useAuthStore
        .getState()
        .logout()
        .then(() => {
          window.location.href = "/login";
        });
    });
  });

  return socket;
};

export const getSocket = () => socket;
