"use client";

import { useSocketConnection } from "@/hooks/useSocketConnection";
import { useUserDataSync } from "@/hooks/useUserDataSync";
import { useAuthStore } from "@/stores/authStore";

export default function SocketProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  // Chỉ khởi tạo socket connection nếu đã đăng nhập
  // Sử dụng hook ở mức cao nhất của component
  useSocketConnection(isAuthenticated);

  // Đồng bộ dữ liệu người dùng từ database mỗi 30 giây
  // Chỉ hoạt động khi đã đăng nhập
  useUserDataSync(30000, isAuthenticated);

  return <>{children}</>;
}
