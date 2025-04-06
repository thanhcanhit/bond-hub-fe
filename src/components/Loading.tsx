// components/Loading.tsx
import React from "react";
import Image from "next/image";

export default function Loading() {
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
}

// Variant with custom message
export function LoadingWithMessage({
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
}
