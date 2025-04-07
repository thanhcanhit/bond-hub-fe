"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Page() {
  const router = useRouter();

  useEffect(() => {
    // Sử dụng router.push thay vì redirect để tránh vòng lặp
    router.push("/dashboard/chat", { scroll: false });
  }, [router]);

  // Hiển thị màn hình loading trong khi chuyển hướng
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
    </div>
  );
}
