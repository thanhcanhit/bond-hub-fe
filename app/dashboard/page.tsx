"use client";

// import useUserStore from "@/stores/authStore";

// export default function DashboardPage() {
//   const user = useUserStore((state) => state.user);

//   if (!user) {
//     return <div>Bạn cần đăng nhập để xem trang này.</div>;
//   }

//   return (
//     <div>
//       <h1>Chào mừng, {user.username}!</h1>
//       <p>Đây là trang Dashboard.</p>
//     </div>
//   );
// }
import { useAuthStore } from "@/stores/authStore";
import { useEffect } from "react";
import { useRouter } from "next/router";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";

export default function Dashboard() {
  const { accessToken, logout } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!accessToken) {
      router.push("/login");
    }
  }, [accessToken, router]);

  return (
    <div>
      <SidebarProvider>
        <AppSidebar />
        <main className="min-h-screen">
          <SidebarTrigger />
          <h1>Dashboard</h1>
          <button onClick={logout}>Đăng xuất</button>
        </main>
      </SidebarProvider>

    </div>
  );
}
