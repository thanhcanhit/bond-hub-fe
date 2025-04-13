"use client";

import { useAuthStore } from "@/stores/authStore";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useRef, useCallback, memo } from "react";
import SocketProvider from "@/components/SocketProvider";
import { LoadingWithMessage } from "@/components/Loading";

// Các đường dẫn công khai (không cần đăng nhập) - định nghĩa bên ngoài component
const publicPaths = ["/login", "/register", "/"];

// Sử dụng memo để tránh re-render không cần thiết
function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(true);
  const redirectingRef = useRef(false);
  const redirectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Lấy trạng thái xác thực từ store sử dụng selector để chỉ lấy các giá trị cần thiết
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const _hasHydrated = useAuthStore((state) => state._hasHydrated);

  // Tạo hàm chuyển hướng để tái sử dụng
  const redirect = useCallback(
    (path: string) => {
      if (redirectingRef.current) return;

      redirectingRef.current = true;
      router.push(path);

      // Xóa timeout cũ nếu có
      if (redirectTimeoutRef.current) {
        clearTimeout(redirectTimeoutRef.current);
      }

      // Đặt timeout mới
      redirectTimeoutRef.current = setTimeout(() => {
        redirectingRef.current = false;
        redirectTimeoutRef.current = null;
      }, 1000);
    },
    [router],
  );

  // Đảm bảo store đã được hydrate
  useEffect(() => {
    if (_hasHydrated) {
      setIsLoading(false);
    }

    // Cleanup function để tránh memory leak
    return () => {
      if (redirectTimeoutRef.current) {
        clearTimeout(redirectTimeoutRef.current);
        redirectTimeoutRef.current = null;
      }
    };
  }, [_hasHydrated]);

  // Xử lý chuyển hướng dựa trên trạng thái xác thực
  useEffect(() => {
    // Nếu đang loading hoặc đang chuyển hướng, không làm gì
    if (isLoading || redirectingRef.current) return;

    // Kiểm tra đường dẫn hiện tại
    const isPublicPath = publicPaths.includes(pathname);
    const isProtectedPath = pathname.startsWith("/dashboard");

    // Nếu đã đăng nhập và đang ở trang công khai
    if (isAuthenticated && isPublicPath) {
      redirect("/dashboard");
    }
    // Nếu chưa đăng nhập và đang ở trang được bảo vệ
    else if (!isAuthenticated && isProtectedPath) {
      redirect("/login");
    }
  }, [isAuthenticated, pathname, redirect, isLoading]);

  // Hiển thị loading trong khi kiểm tra trạng thái xác thực
  if (isLoading) {
    return <LoadingWithMessage message="Đang chuẩn bị..." />;
  }

  // Sử dụng SocketProvider để quản lý kết nối socket
  return <SocketProvider>{children}</SocketProvider>;
}

// Export memo component để tránh re-render không cần thiết
export default memo(AuthProvider);
