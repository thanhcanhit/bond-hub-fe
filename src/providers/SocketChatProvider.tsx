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

// Declare the window interface to include our socket and helper functions
declare global {
  interface Window {
    messageSocket: Socket | null;
    triggerConversationsReload?: () => void;
  }
}

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
        token: accessToken,
      },
      reconnection: true,
      reconnectionAttempts: 5, // Giảm số lần thử kết nối lại để tránh spam
      reconnectionDelay: 2000, // Tăng delay giữa các lần thử
      reconnectionDelayMax: 10000, // Tăng max delay
      timeout: 15000, // Giảm timeout xuống để phát hiện lỗi sớm hơn
      transports: ["websocket"], // Chỉ dùng websocket để tối ưu hiệu suất
      forceNew: true,
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
        } else {
          clearInterval(heartbeatInterval);
        }
      }, 30000);

      // Cleanup interval khi component unmount
      return () => {
        clearInterval(heartbeatInterval);
      };
    });

    // Listen for updateGroupList events from message gateway
    socket.on(
      "updateGroupList",
      (data: {
        action: string;
        groupId: string;
        addedById?: string;
        removedById?: string;
        kicked?: boolean;
        left?: boolean;
        timestamp: Date;
      }) => {
        console.log("[SocketProvider] updateGroupList event received:", data);

        if (data.action === "added_to_group" && currentUser?.id) {
          console.log(
            `[SocketProvider] Current user added to group ${data.groupId} via message gateway`,
          );
          // Backend has already joined us to the group room
          // Trigger conversations reload to show new group
          if (
            typeof window !== "undefined" &&
            window.triggerConversationsReload
          ) {
            window.triggerConversationsReload();
          }
        } else if (data.action === "removed_from_group" && currentUser?.id) {
          console.log(
            `[SocketProvider] Current user removed from group ${data.groupId} via message gateway`,
          );
          // Trigger conversations reload to remove group
          if (
            typeof window !== "undefined" &&
            window.triggerConversationsReload
          ) {
            window.triggerConversationsReload();
          }
        }
      },
    );

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
          if (socket && !socket.connected) {
            socket.connect();
          }
        }, 2000);
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

        // Thử refresh token sau 2 giây
        setTimeout(async () => {
          try {
            const { refreshToken } = await import("@/actions/auth.action");
            const result = await refreshToken();

            if (result.success && socket && !socket.connected) {
              console.log(
                "[SocketProvider] Token refreshed successfully, reconnecting...",
              );
              socket.connect();
            }
          } catch (refreshError) {
            console.error(
              "[SocketProvider] Error refreshing token:",
              refreshError,
            );
          }
        }, 2000);
      }
    });

    // Cleanup khi component unmount hoặc khi token/user thay đổi
    return () => {
      console.log("[SocketProvider] Cleaning up socket connection");

      try {
        if (socket) {
          socket.removeAllListeners();
          if (socket.connected) {
            socket.disconnect();
          }
        }

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
