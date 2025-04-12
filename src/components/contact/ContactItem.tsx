"use client";
import { memo } from "react";
import Image from "next/image";
import { removeFriend } from "@/actions/friend.action";
import { useAuthStore } from "@/stores/authStore";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type ContactItemProps = {
  id: string; // Keeping for future use
  fullName: string;
  profilePictureUrl: string;
  onRemove?: (id: string) => void; // Callback when friend is removed
};

function ContactItem({
  id,
  fullName,
  profilePictureUrl,
  onRemove,
}: ContactItemProps) {
  // Handle remove friend
  const handleRemoveFriend = async () => {
    if (!id) return;

    if (!confirm(`Bạn có chắc chắn muốn xóa kết bạn với ${fullName}?`)) {
      return;
    }

    try {
      const accessToken = useAuthStore.getState().accessToken || undefined;
      const result = await removeFriend(id, accessToken);
      if (result.success) {
        toast.success(`Đã xóa kết bạn với ${fullName}`);
        // Call the callback if provided
        if (onRemove) {
          onRemove(id);
        }
      } else {
        toast.error(`Không thể xóa kết bạn: ${result.error}`);
      }
    } catch (error) {
      console.error("Error removing friend:", error);
      toast.error("Đã xảy ra lỗi khi xóa kết bạn");
    }
  };
  return (
    <div className="group flex items-center justify-between py-3 px-1 hover:bg-[#f0f2f5] cursor-pointer relative last:after:hidden after:content-[''] after:absolute after:left-[56px] after:right-0 after:bottom-0 after:h-[0.25px] after:bg-black/20">
      <div className="flex items-center">
        <div className="h-11 w-11 mr-3 rounded-full overflow-hidden relative">
          <Image
            src={profilePictureUrl}
            alt={fullName}
            fill
            sizes="44px"
            className="object-cover"
          />
          {/* Fallback if image fails to load */}
          <div className="absolute inset-0 flex items-center justify-center bg-gray-200 opacity-0">
            {fullName.charAt(0)}
          </div>
        </div>
        <div className="font-medium text-sm">{fullName}</div>
      </div>
      <div className="flex items-center">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="h-8 w-8 rounded-full flex items-center justify-center hover:bg-gray-200 outline-none focus:outline-none focus:ring-0">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="1"></circle>
                <circle cx="19" cy="12" r="1"></circle>
                <circle cx="5" cy="12" r="1"></circle>
              </svg>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem className="cursor-pointer">
              Xem thông tin
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer">
              Phân loại
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer">
              Đặt tên gọi nhớ
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer">
              Chặn người này
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="cursor-pointer text-red-500"
              onClick={handleRemoveFriend}
            >
              Xóa bạn
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

// Export memoized component to prevent unnecessary re-renders
export default memo(ContactItem);
