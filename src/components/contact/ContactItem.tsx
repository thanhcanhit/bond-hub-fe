"use client";
import { memo, useState, useEffect } from "react";
import Image from "next/image";
import { removeFriend, blockUser } from "@/actions/friend.action";
import { useAuthStore } from "@/stores/authStore";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { User } from "@/types/base";
import ProfileDialog from "@/components/profile/ProfileDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type ContactItemProps = {
  id: string; // Keeping for future use
  fullName: string;
  profilePictureUrl: string;
  email?: string;
  phoneNumber?: string;
  onRemove?: (id: string) => void; // Callback when friend is removed
};

function ContactItem({
  id,
  fullName,
  profilePictureUrl,
  email,
  phoneNumber,
  onRemove,
}: ContactItemProps) {
  // State for dialogs
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [showBlockDialog, setShowBlockDialog] = useState(false);
  const [isBlocking, setIsBlocking] = useState(false);

  // Effect to ensure cleanup when component unmounts
  useEffect(() => {
    return () => {
      // Force cleanup of any potential overlay issues when component unmounts
      document.body.style.pointerEvents = "auto";
    };
  }, []);

  // Create user object for ProfileDialog
  const userForProfile = {
    id,
    userInfo: {
      fullName,
      profilePictureUrl,
    },
    email,
    phoneNumber,
  } as unknown as User;

  // Add a global click handler to ensure dialogs can be closed
  useEffect(() => {
    const handleGlobalClick = () => {
      // Check if any dialogs are open
      if (showProfileDialog || showBlockDialog) {
        console.log("Global click handler detected");
      }
    };

    // Add the event listener
    document.addEventListener("click", handleGlobalClick);

    // Clean up
    return () => {
      document.removeEventListener("click", handleGlobalClick);
    };
  }, [showProfileDialog, showBlockDialog]);

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

  // Handle block user
  const handleBlockUser = async () => {
    if (!id) return;

    setIsBlocking(true);
    try {
      const accessToken = useAuthStore.getState().accessToken || undefined;
      const result = await blockUser(id, accessToken);
      if (result.success) {
        toast.success(`Đã chặn ${fullName}`);

        // Force cleanup of any potential overlay issues
        document.body.style.pointerEvents = "auto";

        // Close the dialog with a slight delay
        setTimeout(() => {
          setShowBlockDialog(false);

          // Call the callback if provided to update UI
          if (onRemove) {
            onRemove(id);
          }
        }, 50);
      } else {
        toast.error(`Không thể chặn người dùng: ${result.error}`);
      }
    } catch (error) {
      console.error("Error blocking user:", error);
      toast.error("Đã xảy ra lỗi khi chặn người dùng");
    } finally {
      setIsBlocking(false);
    }
  };

  return (
    <>
      <div className="group flex items-center justify-between py-3 px-1 hover:bg-[#f0f2f5] relative last:after:hidden after:content-[''] after:absolute after:left-[56px] after:right-0 after:bottom-0 after:h-[0.25px] after:bg-black/20">
        <div
          className="flex items-center cursor-pointer"
          onClick={() => setShowProfileDialog(true)}
        >
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
              <DropdownMenuItem
                className="cursor-pointer"
                onClick={() => setShowProfileDialog(true)}
              >
                Xem thông tin
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer">
                Phân loại
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer">
                Đặt tên gọi nhớ
              </DropdownMenuItem>
              <DropdownMenuItem
                className="cursor-pointer"
                onClick={() => setShowBlockDialog(true)}
              >
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

      {/* Profile Dialog - Using controlled component pattern */}
      <ProfileDialog
        user={userForProfile}
        isOpen={showProfileDialog}
        onOpenChange={(open) => {
          console.log("Profile dialog onOpenChange:", open);
          // Always set the state immediately
          setShowProfileDialog(open);

          // If dialog is closing, ensure cleanup
          if (!open) {
            // Force cleanup of any potential overlay issues
            document.body.style.pointerEvents = "auto";
          }
        }}
        isOwnProfile={false}
      />

      {/* Block User Confirmation Dialog - Using controlled component pattern */}
      <AlertDialog
        open={showBlockDialog}
        onOpenChange={(open) => {
          console.log("Block dialog onOpenChange:", open);
          // Always set the state immediately
          setShowBlockDialog(open);

          // If dialog is closing, ensure cleanup
          if (!open) {
            // Force cleanup of any potential overlay issues
            document.body.style.pointerEvents = "auto";
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Chặn người dùng</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc chắn muốn chặn {fullName}? Người này sẽ không thể gửi
              tin nhắn hoặc gọi điện cho bạn nữa.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isBlocking}>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBlockUser}
              disabled={isBlocking}
              className="bg-red-500 hover:bg-red-600"
            >
              {isBlocking ? (
                <>
                  <div className="animate-spin h-4 w-4 border-2 border-white rounded-full border-t-transparent mr-2"></div>
                  Đang chặn...
                </>
              ) : (
                "Chặn"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// Export memoized component to prevent unnecessary re-renders
export default memo(ContactItem);
