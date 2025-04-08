"use client";

import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { useState } from "react";
import { refreshUserData } from "@/hooks/useUserDataSync";
import { toast } from "sonner";

interface RefreshUserDataButtonProps {
  className?: string;
  variant?:
    | "default"
    | "destructive"
    | "outline"
    | "secondary"
    | "ghost"
    | "link";
  size?: "default" | "sm" | "lg" | "icon";
  showText?: boolean;
}

export default function RefreshUserDataButton({
  className = "",
  variant = "ghost",
  size = "icon",
  showText = false,
}: RefreshUserDataButtonProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    if (isRefreshing) return;

    setIsRefreshing(true);
    try {
      const success = await refreshUserData();
      if (success) {
        toast.success("Dữ liệu người dùng đã được cập nhật");
      } else {
        toast.error("Không thể cập nhật dữ liệu người dùng");
      }
    } catch (error) {
      console.error("Lỗi khi làm mới dữ liệu:", error);
      toast.error("Đã xảy ra lỗi khi cập nhật dữ liệu");
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      onClick={handleRefresh}
      disabled={isRefreshing}
    >
      <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
      {showText && <span className="ml-2">Làm mới</span>}
    </Button>
  );
}
