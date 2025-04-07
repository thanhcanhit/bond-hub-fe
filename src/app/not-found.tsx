"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import Image from "next/image";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-4">
      <div className="text-center">
        <div className="mb-6">
          <Image
            src="/logo.png"
            width={200}
            height={80}
            alt="Vodka Logo"
            className="w-[200px] h-auto mx-auto"
          />
        </div>

        <h1 className="text-6xl font-bold text-gray-800 mb-4">404</h1>
        <h2 className="text-2xl font-semibold text-gray-700 mb-6">
          Trang không tồn tại
        </h2>
        <p className="text-gray-600 mb-8 max-w-md mx-auto">
          Trang bạn đang tìm kiếm không tồn tại hoặc đã bị di chuyển.
        </p>

        <Link href="/">
          <Button className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
            Quay lại trang chủ
          </Button>
        </Link>
      </div>
    </div>
  );
}
