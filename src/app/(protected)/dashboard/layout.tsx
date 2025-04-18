"use client";
import ChatSocketHandler from "@/components/chat/ChatSocketHandler";
import { useEffect } from "react";
import Sidebar from "@/components/SidebarMain";
import { useFriendStore } from "@/stores/friendStore";
import { useAuthStore } from "@/stores/authStore";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { accessToken } = useAuthStore();
  const { fetchFriends } = useFriendStore();

  // Initialize friend data when dashboard loads
  useEffect(() => {
    if (accessToken) {
      fetchFriends();
    }
  }, [accessToken, fetchFriends]);

  return (
    <div className="protected-layout h-screen w-full flex overflow-hidden">
      <div className="flex h-full bg-gray-100">
        {/* Sidebar trái - Tabs */}
        <Sidebar />
        <ChatSocketHandler />
      </div>
      <div className="flex flex-col flex-1">{children}</div>
    </div>
  );
}
