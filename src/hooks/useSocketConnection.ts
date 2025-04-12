import { useEffect, useState, useRef, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { useAuthStore } from "@/stores/authStore";
import { useRouter } from "next/navigation";
import { SocketMessage, isUserDataUpdateMessage } from "@/types/socket";

// Sử dụng một biến singleton để lưu trữ socket instance
let socketInstance: Socket | null = null;

// Tối ưu hóa hook để giảm thiểu sử dụng RAM
export const useSocketConnection = (isAuthenticated: boolean = false) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const { accessToken, logout } = useAuthStore();
  const router = useRouter();
  const socketInitialized = useRef(false);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  // Tạo hàm cleanup socket để tái sử dụng
  const cleanupSocket = useCallback((socketToCleanup: Socket | null) => {
    if (socketToCleanup) {
      // Loại bỏ tất cả các event listener để tránh memory leak
      socketToCleanup.removeAllListeners();
      socketToCleanup.disconnect();

      if (socketInstance === socketToCleanup) {
        socketInstance = null;
        socketInitialized.current = false;
      }
    }
  }, []);

  // Xử lý sự kiện cập nhật dữ liệu người dùng
  const handleUserDataUpdate = useCallback((message: SocketMessage) => {
    // Kiểm tra message trước khi xử lý để tránh lỗi
    if (!message || typeof message !== "object") return;

    // Sử dụng type guard để kiểm tra loại message
    if (isUserDataUpdateMessage(message)) {
      const { updateUser } = useAuthStore.getState();
      updateUser(message.data.user);
    }
  }, []);

  // Xử lý sự kiện forceLogout
  const handleForceLogout = useCallback(
    (data: any) => {
      // Đăng xuất và chuyển hướng
      logout()
        .then(() => router.push("/login", { scroll: false }))
        .catch(() => router.push("/login", { scroll: false }));
    },
    [logout, router],
  );

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
      setSocket(socketInstance);
      return;
    }

    // Ngắt kết nối socket cũ nếu có
    cleanupSocket(socketInstance);

    // Tạo kết nối socket mới với các tùy chọn tối ưu
    try {
      const newSocket = io(
        process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3000",
        {
          auth: { token: accessToken },
          reconnection: true,
          reconnectionAttempts: maxReconnectAttempts,
          reconnectionDelay: 1000,
          reconnectionDelayMax: 5000,
          timeout: 10000,
          transports: ["websocket"], // Chỉ sử dụng websocket để tăng hiệu suất
          forceNew: false, // Tái sử dụng kết nối nếu có thể
          autoConnect: true,
          // Giảm kích thước gói tin
          perMessageDeflate: { threshold: 1024 },
        },
      );

      // Lưu socket instance vào biến global
      socketInstance = newSocket;
      setSocket(newSocket);
      socketInitialized.current = true;
      reconnectAttempts.current = 0;

      // Đăng ký các event listener với tham chiếu hàm xử lý cố định
      newSocket.on("connect", () => {
        reconnectAttempts.current = 0;
      });

      newSocket.on("disconnect", () => {
        // Tăng số lần thử kết nối lại
        reconnectAttempts.current++;

        // Nếu đã thử kết nối lại quá nhiều lần, ngừng thử
        if (reconnectAttempts.current > maxReconnectAttempts) {
          cleanupSocket(newSocket);
        }
      });

      // Đăng ký các event listener chính
      newSocket.on("forceLogout", handleForceLogout);
      newSocket.on("userDataUpdate", handleUserDataUpdate);

      // Cleanup khi component unmount hoặc accessToken thay đổi
      return () => cleanupSocket(newSocket);
    } catch (error) {
      return () => {}; // Trả về hàm cleanup rỗng để tránh lỗi
    }
  }, [
    accessToken,
    isAuthenticated,
    logout,
    router,
    cleanupSocket,
    handleForceLogout,
    handleUserDataUpdate,
  ]);

  return socket;
};

// Hàm tiện ích để lấy socket instance hiện tại
export const getSocketInstance = () => socketInstance;
