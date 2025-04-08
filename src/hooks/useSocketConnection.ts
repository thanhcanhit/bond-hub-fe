import { useEffect, useState, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { useAuthStore } from "@/stores/authStore";
import { useRouter } from "next/navigation";
import { SocketMessage, isUserDataUpdateMessage } from "@/types/socket";

let socketInstance: Socket | null = null;

export const useSocketConnection = (isAuthenticated: boolean = false) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const { accessToken, logout } = useAuthStore();
  const router = useRouter();
  const socketInitialized = useRef(false);

  useEffect(() => {
    // Chỉ kết nối khi đã đăng nhập và có accessToken
    if (!isAuthenticated || !accessToken) {
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
    try {
      const newSocket = io(
        process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3000",
        {
          auth: { token: accessToken },
          reconnection: true,
          reconnectionAttempts: 5,
          reconnectionDelay: 1000,
          reconnectionDelayMax: 5000,
          timeout: 10000,
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
            console.error(
              "Error during logout after forceLogout event:",
              error,
            );
            // Chuyển hướng ngay cả khi đăng xuất thất bại
            router.push("/login", { scroll: false });
          });
      });

      // Xử lý sự kiện cập nhật dữ liệu người dùng
      newSocket.on("userDataUpdate", (message: SocketMessage) => {
        console.log("📱 User data update received:", message);

        // Sử dụng type guard để kiểm tra loại message
        if (isUserDataUpdateMessage(message)) {
          const { updateUser } = useAuthStore.getState();
          updateUser(message.data.user);
          console.log(
            "✅ User data updated in store with type:",
            message.data.updateType,
          );
        } else {
          console.warn(
            "⚠️ Received userDataUpdate event with invalid data format",
          );
        }
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
    } catch (error) {
      console.error("Error creating socket connection:", error);
      // Trả về hàm cleanup rỗng để tránh lỗi
      return () => {};
    }
  }, [accessToken, logout, router]);

  return socket;
};

// Hàm tiện ích để lấy socket instance hiện tại
export const getSocketInstance = () => socketInstance;
