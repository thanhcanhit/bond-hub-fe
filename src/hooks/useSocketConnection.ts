import { useEffect, useState, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { useAuthStore } from "@/stores/authStore";
import { useRouter } from "next/navigation";

let socketInstance: Socket | null = null;

export const useSocketConnection = () => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const { accessToken, logout } = useAuthStore();
  const router = useRouter();
  const socketInitialized = useRef(false);

  useEffect(() => {
    // Chỉ kết nối khi có accessToken
    if (!accessToken) {
      return;
    }

    // Tránh khởi tạo lại socket nếu đã có và token không thay đổi
    if (
      socketInstance &&
      socketInstance.connected &&
      socketInitialized.current
    ) {
      return;
    }

    // Ngắt kết nối socket cũ nếu có
    if (socketInstance) {
      console.log("Disconnecting existing socket connection");
      socketInstance.disconnect();
    }

    // Tạo kết nối socket mới
    console.log("Creating new socket connection with token");
    const newSocket = io(
      process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3000",
      {
        auth: { token: accessToken },
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        transports: ["websocket"], // Chỉ sử dụng websocket để tăng hiệu suất
      },
    );

    // Lưu socket instance vào biến global
    socketInstance = newSocket;
    setSocket(newSocket);
    socketInitialized.current = true;

    // Xử lý các sự kiện socket
    newSocket.on("connect", () => {
      console.log("✅ Socket connected with ID:", newSocket.id);
    });

    newSocket.on("disconnect", (reason) => {
      console.log("❌ Socket disconnected. Reason:", reason);
    });

    newSocket.on("connect_error", (error) => {
      console.error("⚠️ Socket connection error:", error);
    });

    // Xử lý sự kiện forceLogout
    newSocket.on("forceLogout", (data) => {
      console.warn("🚨 Forced logout received:", data);

      // Ngắt kết nối socket
      newSocket.disconnect();

      // Đăng xuất và chuyển hướng
      logout()
        .then(() => {
          console.log("Logout successful after forceLogout event");
          router.push("/login", { scroll: false });
        })
        .catch((error) => {
          console.error("Error during logout after forceLogout event:", error);
          // Chuyển hướng ngay cả khi đăng xuất thất bại
          router.push("/login", { scroll: false });
        });
    });

    // Cleanup khi component unmount hoặc accessToken thay đổi
    return () => {
      console.log("Cleaning up socket connection");
      newSocket.disconnect();
      if (socketInstance === newSocket) {
        socketInstance = null;
        socketInitialized.current = false;
      }
    };
  }, [accessToken, logout, router]);

  return socket;
};

// Hàm tiện ích để lấy socket instance hiện tại
export const getSocketInstance = () => socketInstance;
