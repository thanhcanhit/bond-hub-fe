// components/Loading.tsx
import React from "react";

export default function Loading() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-white bg-opacity-50 z-50">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-t-4 border-blue-500 border-solid rounded-full animate-spin"></div>
        <p className="text-white text-lg">Đang tải...</p>
      </div>
    </div>
  );
}
