"use client";

import { Button } from "@/components/ui/button";
import { Phone, Video } from "lucide-react";
import { User, Group } from "@/types/base";
import { toast } from "sonner";

interface CallButtonProps {
  target: User | Group;
  targetType?: "USER" | "GROUP";
  variant?: "icon" | "default";
  size?: "sm" | "md" | "lg";
  showVideoCall?: boolean;
}

export default function CallButton({
  target,
  targetType = "USER",
  variant = "default",
  size = "md",
  showVideoCall = true,
}: CallButtonProps) {
  const handleCall = () => {
    // Xác định URL dựa trên loại đối tượng (user hoặc group)
    const callUrl =
      targetType === "USER" ? `/call/${target.id}` : `/call/group/${target.id}`;

    // Mở cửa sổ trình duyệt mới cho cuộc gọi thường
    const callWindow = window.open(callUrl, "_blank", "width=400,height=600");
    if (callWindow) {
      callWindow.focus();
    } else {
      toast.error(
        "Trình duyệt đã chặn cửa sổ pop-up. Vui lòng cho phép pop-up để sử dụng tính năng gọi điện.",
      );
    }
  };

  const handleVideoCall = () => {
    // Xác định URL dựa trên loại đối tượng (user hoặc group)
    const videoCallUrl =
      targetType === "USER"
        ? `/video-call/${target.id}`
        : `/video-call/group/${target.id}`;

    // Mở cửa sổ trình duyệt mới cho cuộc gọi video
    const videoCallWindow = window.open(
      videoCallUrl,
      "_blank",
      "width=800,height=600",
    );
    if (videoCallWindow) {
      videoCallWindow.focus();
    } else {
      toast.error(
        "Trình duyệt đã chặn cửa sổ pop-up. Vui lòng cho phép pop-up để sử dụng tính năng gọi video.",
      );
    }
  };

  if (variant === "icon") {
    return (
      <>
        <div className="flex gap-2">
          <Button
            onClick={handleCall}
            variant="ghost"
            size="icon"
            className={`rounded-full ${size === "sm" ? "h-8 w-8" : size === "lg" ? "h-12 w-12" : "h-10 w-10"}`}
          >
            <Phone
              className={`${size === "sm" ? "h-4 w-4" : size === "lg" ? "h-6 w-6" : "h-5 w-5"}`}
            />
          </Button>

          {showVideoCall && (
            <Button
              onClick={handleVideoCall}
              variant="ghost"
              size="icon"
              className={`rounded-full ${size === "sm" ? "h-8 w-8" : size === "lg" ? "h-12 w-12" : "h-10 w-10"}`}
            >
              <Video
                className={`${size === "sm" ? "h-4 w-4" : size === "lg" ? "h-6 w-6" : "h-5 w-5"}`}
              />
            </Button>
          )}
        </div>
      </>
    );
  }

  return (
    <>
      <div className="flex gap-2">
        <Button
          onClick={handleCall}
          variant="outline"
          className={`
            flex items-center gap-2
            ${size === "sm" ? "text-xs py-1 px-2" : size === "lg" ? "text-base py-2 px-4" : "text-sm py-1.5 px-3"}
          `}
        >
          <Phone
            className={`${size === "sm" ? "h-3 w-3" : size === "lg" ? "h-5 w-5" : "h-4 w-4"}`}
          />
          Gọi điện
        </Button>

        {showVideoCall && (
          <Button
            onClick={handleVideoCall}
            variant="outline"
            className={`
              flex items-center gap-2
              ${size === "sm" ? "text-xs py-1 px-2" : size === "lg" ? "text-base py-2 px-4" : "text-sm py-1.5 px-3"}
            `}
          >
            <Video
              className={`${size === "sm" ? "h-3 w-3" : size === "lg" ? "h-5 w-5" : "h-4 w-4"}`}
            />
            Gọi video
          </Button>
        )}
      </div>
    </>
  );
}
