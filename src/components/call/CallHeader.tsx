"use client";

import React from "react";

interface CallHeaderProps {
  userName: string;
  callStatus: "waiting" | "connecting" | "connected" | "rejected" | "ended";
  callDuration: number;
}

/**
 * Format call duration as mm:ss
 */
const formatDuration = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
};

/**
 * Header component for call page
 */
export default function CallHeader({
  userName,
  callStatus,
  callDuration,
}: CallHeaderProps) {
  return (
    <div className="w-full bg-white p-4 flex items-center justify-between shadow-sm">
      <div className="flex items-center">
        <span className="text-lg font-semibold">{userName}</span>
      </div>
      <div className="text-sm text-gray-500">
        {callStatus === "waiting"
          ? "Đang gọi..."
          : callStatus === "connecting"
            ? "Đang kết nối..."
            : callStatus === "connected"
              ? formatDuration(callDuration)
              : callStatus === "rejected"
                ? "Cuộc gọi đã bị từ chối"
                : "Cuộc gọi đã kết thúc"}
      </div>
    </div>
  );
}
