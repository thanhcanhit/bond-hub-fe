// Tạm thời vô hiệu hóa middleware để tìm nguyên nhân gây vòng lặp

import { NextResponse } from "next/server";

export function middleware() {
  // Không làm gì cả, chỉ cho phép tiếp tục
  return NextResponse.next();
}

// Chỉ áp dụng cho các đường dẫn trong thư mục dashboard
export const config = {
  matcher: ["/dashboard/:path*"],
};
