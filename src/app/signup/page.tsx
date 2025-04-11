"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { LoadingWithMessage } from "@/components/Loading";

export default function SignupPage() {
  const router = useRouter();

  useEffect(() => {
    // Chuyển hướng đến trang login với tham số showRegister=true
    router.replace("/login?showRegister=true", { scroll: false });
  }, [router]);

  // Hiển thị loading trong khi chuyển hướng
  return (
    <LoadingWithMessage message="Đang chuyển hướng đến trang đăng ký..." />
  );
}
