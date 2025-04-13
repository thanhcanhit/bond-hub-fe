import { useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { useAuthStore } from "@/stores/authStore";
import { useFriendStore } from "@/stores/friendStore";

/**
 * Hook to connect to the friends WebSocket namespace and listen for events
 * @returns The socket instance
 */
export const useFriendSocket = () => {
  const socketRef = useRef<Socket | null>(null);
  const { accessToken, isAuthenticated } = useAuthStore();
  const { refreshAllFriendData } = useFriendStore();

  useEffect(() => {
    // Only connect if user is authenticated and has a token
    if (!isAuthenticated || !accessToken) {
      return;
    }

    // Create socket connection to the friends namespace
    const socket = io(
      `${process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3000"}/friends`,
      {
        auth: { token: accessToken },
        transports: ["websocket"],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      },
    );

    // Store socket in ref
    socketRef.current = socket;

    // Connection events
    socket.on("connect", () => {
      console.log("Connected to friends WebSocket namespace");
    });

    socket.on("disconnect", (reason) => {
      console.log(
        "Disconnected from friends WebSocket namespace. Reason:",
        reason,
      );
    });

    socket.on("connect_error", (error) => {
      console.error("Friends WebSocket connection error:", error);
    });

    // Listen for reload event
    socket.on("reload", () => {
      console.log(
        "Received reload event from friends WebSocket, refreshing data...",
      );

      // Refresh all friend-related data at once
      refreshAllFriendData();
    });

    // Cleanup on unmount
    return () => {
      if (socket) {
        console.log("Cleaning up friends WebSocket connection");
        socket.off("reload");
        socket.disconnect();
        socketRef.current = null;
      }
    };
  }, [accessToken, isAuthenticated, refreshAllFriendData]);

  return socketRef.current;
};
