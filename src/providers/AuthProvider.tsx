"use client";

import { useAuthStore } from "@/stores/authStore";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import SocketProvider from "@/components/SocketProvider";
import { LoadingWithMessage } from "@/components/Loading";

// Các đường dẫn công khai (không cần đăng nhập)
const publicPaths = ["/login", "/register", "/"];
export default function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(true);
  const redirectingRef = useRef(false);

  // Lấy trạng thái xác thực từ store
  const { isAuthenticated, _hasHydrated } = useAuthStore();

  // Đảm bảo store đã được hydrate
  useEffect(() => {
    // Chỉ đặt trạng thái loading thành false sau khi store đã được hydrate
    if (_hasHydrated) {
      setIsLoading(false);
    }
  }, [_hasHydrated]);

  // Xử lý chuyển hướng dựa trên trạng thái xác thực
  useEffect(() => {
    // Nếu đang loading hoặc đang chuyển hướng, không làm gì
    if (isLoading || redirectingRef.current) return;

    // Kiểm tra xem đường dẫn hiện tại có phải là đường dẫn công khai không
    const isPublicPath = publicPaths.some((path) => pathname === path);

    // Kiểm tra xem đường dẫn hiện tại có phải là đường dẫn được bảo vệ không
    const isProtectedPath = pathname.startsWith("/dashboard");

    // Nếu đã đăng nhập và đang ở trang chủ, login hoặc register
    if (isAuthenticated && isPublicPath) {
      redirectingRef.current = true;
      router.replace("/dashboard");
      setTimeout(() => {
        redirectingRef.current = false;
      }, 1000);
    }
    // Nếu chưa đăng nhập và đang ở trang dashboard
    else if (!isAuthenticated && isProtectedPath) {
      redirectingRef.current = true;
      router.replace("/login");
      setTimeout(() => {
        redirectingRef.current = false;
      }, 1000);
    }
  }, [isAuthenticated, pathname, router, isLoading]);

  // Hiển thị loading trong khi kiểm tra trạng thái xác thực
  if (isLoading) {
    return <LoadingWithMessage message="Đang chuẩn bị..." />;
  }

  return <SocketProvider>{children}</SocketProvider>;
}
