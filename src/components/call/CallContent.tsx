"use client";

import React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getUserInitials } from "@/utils/userUtils";
import { Loader2 } from "lucide-react";

interface User {
  id: string;
  userInfo?: {
    fullName?: string;
    profilePictureUrl?: string;
  };
}

interface CallContentProps {
  user: User | null;
  callStatus: "waiting" | "connecting" | "connected" | "rejected" | "ended";
}

/**
 * Main content component for call page
 */
export default function CallContent({ user, callStatus }: CallContentProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 w-full">
      <Avatar className="h-32 w-32 mb-6">
        <AvatarImage
          src={user?.userInfo?.profilePictureUrl || undefined}
          className="object-cover"
        />
        <AvatarFallback className="text-4xl">
          {getUserInitials(user)}
        </AvatarFallback>
      </Avatar>

      <h2 className="text-xl font-semibold mb-2">
        {user?.userInfo?.fullName || "Người dùng"}
      </h2>

      <div className="text-gray-500 mb-8">
        {callStatus === "waiting" ? (
          <div className="flex items-center">
            <Loader2 className="h-5 w-5 mr-2 animate-spin" />
            <span>Đang gọi...</span>
          </div>
        ) : callStatus === "connecting" ? (
          <div>Đang kết nối...</div>
        ) : callStatus === "connected" ? (
          <div>Đang trong cuộc gọi</div>
        ) : callStatus === "rejected" ? (
          <div>Cuộc gọi đã bị từ chối</div>
        ) : (
          <div>Cuộc gọi đã kết thúc</div>
        )}
      </div>
    </div>
  );
}
