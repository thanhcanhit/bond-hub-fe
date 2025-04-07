// components/Loading.tsx
import React, { memo } from "react";
import Image from "next/image";

// Sử dụng memo để tránh render lại khi không cần thiết
const Loading = memo(function Loading() {
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-white z-50">
      <div className="flex flex-col items-center gap-8">
        {/* Logo */}
        <div className="mb-4">
          <Image
            src="/logo.png"
            width={200}
            height={80}
            alt="Vodka Logo"
            className="w-[200px] h-auto"
            priority
            loading="eager"
          />
        </div>

        {/* Loading spinner */}
        <div className="relative">
          <div className="w-12 h-12 border-4 border-t-4 border-blue-500 border-solid rounded-full animate-spin border-t-transparent"></div>
        </div>

        {/* Loading text */}
        <p className="text-gray-600 text-base">Đang đăng nhập...</p>
      </div>
    </div>
  );
});

export default Loading;

// Variant with custom message
export const LoadingWithMessage = memo(function LoadingWithMessage({
  message = "Đang tải...",
}: {
  message?: string;
}) {
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-white z-50">
      <div className="flex flex-col items-center gap-8">
        {/* Logo */}
        <div className="mb-4">
          <Image
            src="/logo.png"
            width={200}
            height={80}
            alt="Vodka Logo"
            className="w-[200px] h-auto"
            priority
            loading="eager"
          />
        </div>

        {/* Loading spinner */}
        <div className="relative">
          <div className="w-12 h-12 border-4 border-t-4 border-blue-500 border-solid rounded-full animate-spin border-t-transparent"></div>
        </div>

        {/* Loading text */}
        <p className="text-gray-600 text-base">{message}</p>
      </div>
    </div>
  );
});
