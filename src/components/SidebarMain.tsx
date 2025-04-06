import { useAuthStore } from "@/stores/authStore";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuPortal,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
// Sử dụng react-icons thay vì lucide-react
import {
  BsChatDotsFill,
  BsCompass,
  BsGear,
  BsDoorOpenFill,
} from "react-icons/bs";
import { RiContactsLine } from "react-icons/ri";
import { useRouter, usePathname } from "next/navigation";
import SettingsDialog from "./SettingDialog";

import { useState } from "react";
import ProfileDialog from "./ProfileDialog";
import { LoadingWithMessage } from "./Loading";

export default function Sidebar() {
  const { logout: logoutFromStore, user } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSettingsMenuOpen, setIsSettingsMenuOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      const result = await logoutFromStore();
      if (result) {
        router.push("/login");
      } else {
        setIsLoggingOut(false);
        console.log("Logout failed:");
      }
    } catch (error) {
      setIsLoggingOut(false);
      console.error("Logout error:", error);
    }
  };

  // Hàm kiểm tra đường dẫn hiện tại để xác định mục đang được chọn
  const isActive = (path: string) => {
    return pathname.startsWith(path);
  };

  return (
    <>
      {isLoggingOut && <LoadingWithMessage message="Đang đăng xuất..." />}
      <div className="w-16 bg-[#005ae0] text-white flex flex-col items-center py-0 space-y-0 shadow-lg">
        <div className="mt-8 mb-6">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Avatar className="cursor-pointer h-12 w-12 border-2 border-white hover:border-blue-300 transition-all">
                <AvatarImage
                  src={
                    user?.userInfo?.profilePictureUrl
                      ? `${user.userInfo.profilePictureUrl}?t=${new Date().getTime()}`
                      : `https://i.ibb.co/XxXXczsK/480479681-599145336423941-8941882180530449347-n.jpg`
                  }
                  key={user?.userInfo?.profilePictureUrl || "default-avatar"}
                />
                <AvatarFallback>NT</AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-56"
              side="right"
              align="start"
              sideOffset={5}
              alignOffset={5}
            >
              <DropdownMenuLabel>
                {user?.userInfo.fullName || "Guest"}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem>
                  Nâng cấp tài khoản
                  <DropdownMenuShortcut>⇧⌘P</DropdownMenuShortcut>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setIsProfileOpen(true)}>
                  Hồ sơ của bạn
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setIsSettingsOpen(true)}>
                  Cài đặt
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem onClick={handleLogout}>
                  Đăng xuất
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Main navigation buttons */}
        <div className="flex flex-col items-center w-full space-y-2">
          <div
            className={`relative group ${isActive("/dashboard/chat") ? "active-nav-item" : ""}`}
          >
            <Button
              variant="ghost"
              className={`sidebar-nav-button flex items-center justify-center ${isActive("/dashboard/chat") ? "bg-[#0045b8]" : ""}`}
              onClick={() => router.push("/dashboard/chat")}
            >
              <BsChatDotsFill size={32} />
            </Button>
          </div>

          <div
            className={`relative group ${isActive("/dashboard/contact") ? "active-nav-item" : ""}`}
          >
            <Button
              variant="ghost"
              className={`sidebar-nav-button flex items-center justify-center ${isActive("/dashboard/contact") ? "bg-[#0045b8]" : ""}`}
              onClick={() => router.push("/dashboard/contact")}
            >
              <RiContactsLine size={32} />
            </Button>
          </div>

          <div
            className={`relative group ${isActive("/dashboard/post") ? "active-nav-item" : ""}`}
          >
            <Button
              variant="ghost"
              className={`sidebar-nav-button flex items-center justify-center ${isActive("/dashboard/post") ? "bg-[#0045b8]" : ""}`}
              onClick={() => router.push("/dashboard/post")}
            >
              <BsCompass size={32} />
            </Button>
          </div>
        </div>

        <div className="flex-1" />

        <div className="flex flex-col items-center w-full space-y-0">
          <div
            className={`relative group ${isSettingsMenuOpen ? "active-nav-item" : ""}`}
          >
            <DropdownMenu
              open={isSettingsMenuOpen}
              onOpenChange={setIsSettingsMenuOpen}
            >
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className={`sidebar-nav-button flex items-center justify-center`}
                >
                  <BsGear size={32} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-56 ml-8"
                side="top"
                align="center"
                sideOffset={5}
                alignOffset={0}
              >
                <DropdownMenuItem onClick={() => setIsProfileOpen(true)}>
                  Thông tin tài khoản
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setIsSettingsOpen(true)}>
                  Cài đặt
                </DropdownMenuItem>
                <DropdownMenuItem>Dữ liệu</DropdownMenuItem>
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>Ngôn ngữ</DropdownMenuSubTrigger>
                  <DropdownMenuPortal>
                    <DropdownMenuSubContent>
                      <DropdownMenuItem>Tiếng Việt</DropdownMenuItem>
                      <DropdownMenuItem>Tiếng Anh</DropdownMenuItem>
                    </DropdownMenuSubContent>
                  </DropdownMenuPortal>
                </DropdownMenuSub>
                <DropdownMenuItem>Hỗ trợ</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="text-red-500"
                >
                  Đăng xuất
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className={`relative group`}>
            <Button
              variant="ghost"
              className={`sidebar-nav-button flex items-center justify-center text-red-400`}
              onClick={handleLogout}
            >
              <BsDoorOpenFill size={32} />
            </Button>
          </div>
        </div>

        <ProfileDialog
          user={user}
          isOpen={isProfileOpen}
          onOpenChange={setIsProfileOpen}
          isOwnProfile={true}
        />

        <SettingsDialog
          isOpen={isSettingsOpen}
          onOpenChange={setIsSettingsOpen}
        />
      </div>
    </>
  );
}
