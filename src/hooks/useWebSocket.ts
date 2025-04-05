import { useEffect, useRef } from "react";
import io from "socket.io-client";
import { Socket } from "socket.io-client";
import { SocketMessage, SocketAuth } from "../types/socket";
import { useRouter } from "next/navigation";

type SocketType = typeof Socket;

const useSocket = (
  url: string,
  accessToken: string | null,
  onLogout: () => void,
) => {
  const socketRef = useRef<SocketType | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (!accessToken) return;

    socketRef.current = io(url, {
      auth: { token: accessToken } as SocketAuth,
    });

    socketRef.current.on("connect", () => {
      console.log("Connected to WebSocket server");
    });

    socketRef.current.on("forceLogout", (data: SocketMessage) => {
      console.log("Forced logout:", data);
      onLogout(); // Gọi hàm logout được truyền vào
      router.push("/login");
    });

    socketRef.current.on("disconnect", () => {
      console.log("Disconnected from WebSocket server");
    });

    socketRef.current.on("connect_error", (error: Error) => {
      console.error("WebSocket connection error:", error);
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, [accessToken, url, onLogout, router]);

  return socketRef.current;
};

export default useSocket;
