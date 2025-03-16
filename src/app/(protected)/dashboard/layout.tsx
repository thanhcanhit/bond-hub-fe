"use client";
import Sidebar from "@/components/SidebarMain";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="protected-layout">
      <div className="flex h-screen bg-gray-100">
        {/* Sidebar trái - Tabs */}
        <Sidebar />
      </div>
      {children}
    </div>
  );
}
