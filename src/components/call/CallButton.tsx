"use client";

import { Button } from "@/components/ui/button";
import { Phone, Video } from "lucide-react";
import { User, Group } from "@/types/base";
import { toast } from "sonner";
// import { useCallStore } from "@/stores/callStore";
import { useRouter } from "next/navigation";

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
  // const { startCall, startGroupCall, isLoading } = useCallStore();
  const router = useRouter();

  // Chức năng gọi điện đã bị vô hiệu hóa
  const handleCall = async () => {
    toast.info(
      "Chức năng gọi điện đang được phát triển và sẽ sớm được cập nhật.",
    );
  };

  // Chức năng gọi video đã bị vô hiệu hóa
  const handleVideoCall = async () => {
    toast.info(
      "Chức năng gọi video đang được phát triển và sẽ sớm được cập nhật.",
    );
  };

  if (variant === "icon") {
    return (
      <>
        <div className="flex gap-2">
          <Button
            onClick={handleCall}
            variant="ghost"
            size="icon"
            disabled={true}
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
              disabled={true}
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
          disabled={true}
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
            disabled={true}
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
