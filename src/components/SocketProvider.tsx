"use client";

import { useSocketConnection } from "@/hooks/useSocketConnection";
// import { useAuthStore } from "@/stores/authStore";

export default function SocketProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  // const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  // Khởi tạo socket connection nếu đã đăng nhập
  useSocketConnection();

  return <>{children}</>;
}
