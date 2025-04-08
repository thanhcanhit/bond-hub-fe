"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";

export default function Page() {
  const router = useRouter();
  const [redirectAttempted, setRedirectAttempted] = useState(false);
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    // Chỉ chuyển hướng một lần để tránh vòng lặp và chỉ khi đã đăng nhập
    if (!redirectAttempted && isAuthenticated) {
      setRedirectAttempted(true);
      console.log("Redirecting from dashboard to chat");
      // Sử dụng setTimeout để tránh vòng lặp chuyển hướng
      setTimeout(() => {
        router.push("/dashboard/chat", { scroll: false });
      }, 500);
    }
  }, [router, redirectAttempted, isAuthenticated]);

  // Hiển thị màn hình loading trong khi chuyển hướng
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
    </div>
  );
}
