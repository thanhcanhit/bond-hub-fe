"use client";

import { useRouter } from "next/navigation";
import useAuthStore from "@/stores/authStore";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { useEffect } from "react";
export default function ChatPage() {
  const accessToken = useAuthStore();
  const logout = useAuthStore((state) => state.logout);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (!token) router.push("/login");
    else router.push("/");
  }, [accessToken, router]);

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
