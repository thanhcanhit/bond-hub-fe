import Link from "next/link";

export default function Home() {
  // Chỉ sử dụng AuthProvider để xử lý chuyển hướng
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100">
      <h1 className="text-4xl font-bold mb-4">Chào mừng đến với Vodka</h1>
      <p className="text-lg mb-6">
        Vui lòng đăng nhập hoặc đăng ký để tiếp tục.
      </p>
      <div className="space-x-4">
        <Link href="/login">
          <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
            Đăng nhập
          </button>
        </Link>
        <Link href="/register">
          <button className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700">
            Đăng ký
          </button>
        </Link>
      </div>
    </div>
  );
}
