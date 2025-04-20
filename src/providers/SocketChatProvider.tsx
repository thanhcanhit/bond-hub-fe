"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { io, Socket } from "socket.io-client";
import { useAuthStore } from "@/stores/authStore";

// Định nghĩa context cho socket
interface SocketContextType {
  messageSocket: Socket | null;
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextType>({
  messageSocket: null,
  isConnected: false,
});

// Hook để sử dụng socket trong các component
export const useSocket = () => useContext(SocketContext);

interface SocketProviderProps {
  children: ReactNode;
}

export function SocketChatProvider({ children }: SocketProviderProps) {
  const [messageSocket, setMessageSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const currentUser = useAuthStore((state) => state.user);

  // Kết nối socket khi đăng nhập thành công
  useEffect(() => {
    if (!currentUser) {
      // Nếu không có token hoặc user, đóng kết nối socket nếu đang mở
      if (messageSocket) {
        console.log("Closing socket connection due to logout");
        try {
          // Remove all listeners before disconnecting to prevent memory leaks
          messageSocket.removeAllListeners();
          messageSocket.disconnect();
          setMessageSocket(null);
          setIsConnected(false);

          // Xóa tham chiếu socket khỏi window object
          if (typeof window !== "undefined") {
            window.messageSocket = null;
          }
        } catch (error) {
          console.error("Error during socket cleanup:", error);
        }
      }
      return;
    }

    // Tạo kết nối socket đến namespace message
    const socketUrl = `${process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3000"}/message`;
    console.log(`Connecting to message socket at ${socketUrl}`);

    // Thêm token vào auth để đảm bảo xác thực đúng
    const accessToken = useAuthStore.getState().accessToken;

    const socket = io(socketUrl, {
      auth: {
        userId: currentUser.id,
        token: accessToken, // Thêm token vào auth để server có thể xác thực
      },
      reconnection: true,
      reconnectionAttempts: 10, // Tăng số lần thử kết nối lại
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000, // Tăng timeout
      transports: ["websocket", "polling"], // Hỗ trợ cả polling để tăng độ tin cậy
      forceNew: true, // Đảm bảo tạo kết nối mới
    });

    // Lưu socket vào state
    setMessageSocket(socket);

    // Lưu socket vào window object để các component khác có thể truy cập
    if (typeof window !== "undefined") {
      window.messageSocket = socket;
    }

    // Thiết lập các event listener
    socket.on("connect", () => {
      console.log(
        "[SocketProvider] Connected to message socket server with ID:",
        socket.id,
      );
      setIsConnected(true);

      // Thiết lập heartbeat để giữ kết nối
      const heartbeatInterval = setInterval(() => {
        if (socket.connected) {
          socket.emit("heartbeat");
          console.log("[SocketProvider] Heartbeat sent");
        } else {
          clearInterval(heartbeatInterval);
        }
      }, 30000); // 30 giây

      // Debug: Theo dõi tất cả các event
      // Sử dụng onAny thay vì onevent vì onevent là private
      socket.onAny((event, ...args) => {
        console.log(`[SocketProvider] Event received: ${event}`, args);
      });

      // Cleanup interval khi component unmount
      return () => {
        clearInterval(heartbeatInterval);
      };
    });

    socket.on("disconnect", (reason) => {
      console.log(
        "[SocketProvider] Disconnected from message socket server. Reason:",
        reason,
      );
      setIsConnected(false);

      // Xử lý các lý do ngắt kết nối khác nhau
      if (reason === "io server disconnect") {
        // Server đã ngắt kết nối, cần kết nối lại thủ công
        console.log(
          "[SocketProvider] Server disconnected us, attempting to reconnect manually...",
        );
        setTimeout(() => {
          socket.connect();
        }, 1000);
      } else if (reason === "transport close" || reason === "ping timeout") {
        // Vấn đề mạng, socket.io sẽ tự động kết nối lại
        console.log(
          "[SocketProvider] Network issue, socket.io will automatically try to reconnect",
        );
      } else if (reason === "transport error") {
        // Lỗi giao thức, thử chuyển sang polling nếu đang dùng websocket
        console.log(
          "[SocketProvider] Transport error, will try to reconnect with polling if needed",
        );
      }
    });

    socket.on("connect_error", (error) => {
      console.error("[SocketProvider] Socket connection error:", error);
      setIsConnected(false);

      // Kiểm tra xem lỗi có phải là do xác thực không
      if (
        error.message.includes("Authentication") ||
        error.message.includes("jwt") ||
        error.message.includes("token")
      ) {
        console.error(
          "[SocketProvider] Authentication error, will try to refresh token",
        );

        // Thử refresh token sau 1 giây
        setTimeout(async () => {
          try {
            // Thử refresh token
            const { refreshToken } = await import("@/actions/auth.action");
            const result = await refreshToken();

            if (result.success) {
              console.log(
                "[SocketProvider] Token refreshed successfully, reconnecting...",
              );
              // Socket sẽ tự động kết nối lại với token mới
            } else {
              console.error(
                "[SocketProvider] Failed to refresh token:",
                result.error,
              );
            }
          } catch (refreshError) {
            console.error(
              "[SocketProvider] Error refreshing token:",
              refreshError,
            );
          }
        }, 1000);
      }
    });

    // Cleanup khi component unmount hoặc khi token/user thay đổi
    return () => {
      console.log("[SocketProvider] Cleaning up socket connection");

      try {
        // Xóa tất cả các event listener trước khi disconnect
        if (socket && socket.connected) {
          socket.removeAllListeners();
          socket.disconnect();
        }

        // Xóa tham chiếu socket khỏi window object
        if (typeof window !== "undefined") {
          window.messageSocket = null;
        }
      } catch (error) {
        console.error("[SocketProvider] Error during cleanup:", error);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);

  return (
    <SocketContext.Provider value={{ messageSocket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
}
