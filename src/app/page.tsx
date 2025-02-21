"use client";

import { useRouter } from "next/navigation";
import useAuthStore from "@/stores/authStore";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { useEffect } from "react";
export default function ChatPage() {
  const accessToken = useAuthStore(
    (state: { accessToken: string | null }) => state.accessToken,
  );
  const logout = useAuthStore((state: { logout: () => void }) => state.logout);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (!token) router.push("/login");
    else router.push("/");
  }, [accessToken, router]);

  // Hiển thị loading khi đang xử lý đăng nhập hoặc đăng xuất
  // if (isLoading) {
  //   return (
  //     <div className="flex items-center justify-center h-screen bg-white">
  //       <div className="flex flex-col items-center">
  //         <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-blue-500 border-solid mb-4"></div>
  //         <p className="text-gray-700 text-lg font-medium">Đang tải...</p>
  //       </div>
  //     </div>
  //   );
  // }

  return (
    <SidebarProvider suppressHydrationWarning={true}>
      <AppSidebar />
      <main className="min-h-screen">
        <SidebarTrigger />
        <div className="flex flex-col items-center justify-center h-screen bg-gray-50">
          <p className="mt-4 text-lg">Đây là trang chat của bạn.</p>
          <button onClick={logout}>Đăng xuất</button>
        </div>
      </main>
    </SidebarProvider>
  );
}
