"use client";

import { useSocketConnection } from "@/hooks/useSocketConnection";
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

  return <>{children}</>;
}
