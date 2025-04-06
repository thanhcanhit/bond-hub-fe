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
import { IconType } from "react-icons";

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

  // Navigation items configuration
  const navItems: { path: string; icon: IconType; label: string }[] = [
    { path: "/dashboard/chat", icon: BsChatDotsFill, label: "Chat" },
    { path: "/dashboard/contact", icon: RiContactsLine, label: "Contacts" },
    { path: "/dashboard/post", icon: BsCompass, label: "Posts" },
  ];

  // Bottom navigation items
  const bottomNavItems: {
    icon: IconType;
    label: string;
    action?: () => void;
    isActive?: boolean;
    isDropdown?: boolean;
  }[] = [
    {
      icon: BsGear,
      label: "Settings",
      isActive: isSettingsMenuOpen,
      isDropdown: true,
    },
    {
      icon: BsDoorOpenFill,
      label: "Logout",
      action: handleLogout,
    },
  ];

  // Hàm kiểm tra đường dẫn hiện tại để xác định mục đang được chọn
  const isActive = (path: string) => {
    return pathname === path || pathname.startsWith(`${path}/`);
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
                  className="object-cover"
                  src={user?.userInfo?.profilePictureUrl || ""}
                />
                <AvatarFallback className="text-gray">
                  {user?.userInfo?.fullName?.split(" ")?.map((w) => w[0])}
                </AvatarFallback>
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
          {navItems.map((item) => (
            <div key={item.path} className="relative group">
              <Button
                variant="ghost"
                className={`flex items-center justify-center text-white hover:bg-[#0045b8] hover:text-white active:bg-[#0045b8] active:text-white ${isActive(item.path) ? "bg-[#0045b8]" : ""}`}
                onClick={() => router.push(item.path)}
                title={item.label}
              >
                <item.icon size={32} />
              </Button>
            </div>
          ))}
        </div>

        <div className="flex-1" />

        <div className="flex flex-col items-center w-full space-y-2">
          {bottomNavItems.map((item, index) => (
            <div key={index} className="relative group">
              {item.isDropdown ? (
                <DropdownMenu
                  open={isSettingsMenuOpen}
                  onOpenChange={setIsSettingsMenuOpen}
                >
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      className={`flex items-center justify-center text-white hover:bg-[#0045b8] hover:text-white active:bg-[#0045b8] active:text-white ${item.isActive ? "bg-[#0045b8]" : ""}`}
                      title={item.label}
                    >
                      <item.icon size={32} />
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
              ) : (
                <Button
                  variant="ghost"
                  className="flex items-center justify-center text-white hover:bg-[#0045b8] hover:text-white active:bg-[#0045b8] active:text-white"
                  onClick={item.action}
                  title={item.label}
                >
                  <item.icon size={32} />
                </Button>
              )}
            </div>
          ))}
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
