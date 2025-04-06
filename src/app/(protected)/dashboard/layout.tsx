"use client";
import Sidebar from "@/components/SidebarMain";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="protected-layout h-screen w-full flex overflow-hidden">
      <div className="flex h-full bg-gray-100">
        {/* Sidebar trái - Tabs */}
        <Sidebar />
      </div>
      <div className="flex-1 h-full overflow-hidden">{children}</div>
    </div>
  );
}
