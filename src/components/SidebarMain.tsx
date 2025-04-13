import { useAuthStore } from "@/stores/authStore";
import { useFriendStore } from "@/stores/friendStore";
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
import { BsChatDotsFill, BsGear, BsDoorOpenFill } from "react-icons/bs";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import SettingsDialog from "./SettingDialog";

import { useState, useCallback, useMemo, memo } from "react";
import ProfileDialog from "./profile/ProfileDialog";
import { LoadingWithMessage } from "./Loading";
import { IconType } from "react-icons";
import { LucideBookUser, LucideCircuitBoard } from "lucide-react";

// Định nghĩa các mục điều hướng bên ngoài component để tránh tạo lại mỗi lần render
const NAV_ITEMS: { path: string; icon: IconType; label: string }[] = [
  { path: "/dashboard/chat", icon: BsChatDotsFill, label: "Chat" },
  { path: "/dashboard/contact", icon: LucideBookUser, label: "Contacts" },
  { path: "/dashboard/post", icon: LucideCircuitBoard, label: "Posts" },
];

function Sidebar() {
  const { logout: logoutFromStore, user } = useAuthStore();
  const { unreadReceivedRequests } = useFriendStore();
  const router = useRouter();
  const pathname = usePathname();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSettingsMenuOpen, setIsSettingsMenuOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Sử dụng useCallback để tránh tạo lại hàm mỗi lần render
  const handleLogout = useCallback(async () => {
    setIsLoggingOut(true);
    try {
      const result = await logoutFromStore();
      if (result) {
        router.push("/login");
      } else {
        setIsLoggingOut(false);
      }
    } catch {
      setIsLoggingOut(false);
    }
  }, [logoutFromStore, router]);

  // Sử dụng useCallback cho các hàm xử lý sự kiện
  const handleProfileOpen = useCallback(() => setIsProfileOpen(true), []);
  const handleSettingsOpen = useCallback(() => setIsSettingsOpen(true), []);

  // Sử dụng useMemo để tránh tính toán lại mỗi lần render
  const bottomNavItems = useMemo(
    () => [
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
    ],
    [isSettingsMenuOpen, handleLogout],
  );

  // Hàm kiểm tra đường dẫn hiện tại để xác định mục đang được chọn
  const isActive = useCallback(
    (path: string) => {
      return pathname === path || pathname.startsWith(`${path}/`);
    },
    [pathname],
  );

  // Tạo avatar fallback text một lần duy nhất khi user thay đổi
  const avatarFallback = useMemo(() => {
    if (!user?.userInfo?.fullName) return "";
    return user.userInfo.fullName
      .split(" ")
      .map((w) => w[0])
      .join("");
  }, [user?.userInfo?.fullName]);

  // Tạo display name một lần duy nhất khi user thay đổi
  const displayName = useMemo(() => {
    return user?.userInfo?.fullName || "Guest";
  }, [user?.userInfo?.fullName]);

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
                  src={user?.userInfo?.profilePictureUrl || undefined}
                />
                <AvatarFallback className="text-gray">
                  {avatarFallback}
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
              <DropdownMenuLabel>{displayName}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem>
                  Nâng cấp tài khoản
                  <DropdownMenuShortcut>⇧⌘P</DropdownMenuShortcut>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleProfileOpen}>
                  Hồ sơ của bạn
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleSettingsOpen}>
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
          {NAV_ITEMS.map((item) => (
            <div key={item.path} className="relative group">
              <Link href={item.path} scroll={false}>
                <Button
                  variant="ghost"
                  className={`flex items-center justify-center text-white p-3 hover:bg-[#0045b8] hover:text-white active:bg-[#0045b8] active:text-white ${isActive(item.path) ? "bg-[#0045b8]" : ""} [&_svg]:!size-7 !h-12 !w-12 !rounded-2sm`}
                  title={item.label}
                >
                  <div className="relative">
                    <item.icon size={40} />
                    {item.label === "Contacts" &&
                      unreadReceivedRequests > 0 && (
                        <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                          {unreadReceivedRequests > 9
                            ? "9+"
                            : unreadReceivedRequests}
                        </div>
                      )}
                  </div>
                </Button>
              </Link>
            </div>
          ))}
        </div>

        <div className="flex-1" />

        <div className="flex flex-col items-center w-full space-y-2 pb-8 px-2">
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
                      className={`flex items-center justify-center text-white hover:bg-[#0045b8] hover:text-white active:bg-[#0045b8] active:text-white ${item.isActive ? "bg-[#0045b8]" : ""} [&_svg]:!size-7 !h-12 !w-12 !rounded-2sm !p-0`}
                      title={item.label}
                    >
                      <item.icon size={40} className="!w-8 !h-8" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    className="w-56 ml-8"
                    side="top"
                    align="center"
                    sideOffset={5}
                    alignOffset={0}
                  >
                    <DropdownMenuItem onClick={handleProfileOpen}>
                      Thông tin tài khoản
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleSettingsOpen}>
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
                  className="flex items-center justify-center text-white hover:bg-[#0045b8] hover:text-white active:bg-[#0045b8] active:text-white [&_svg]:!size-7 !h-12 !w-12 !rounded-2sm !p-0"
                  onClick={item.action}
                  title={item.label}
                >
                  <item.icon size={40} className="!w-8 !h-8" />
                </Button>
              )}
            </div>
          ))}
        </div>

        {/* Sử dụng lazy loading cho các dialog để giảm tải ban đầu */}
        {isProfileOpen && (
          <ProfileDialog
            user={user}
            isOpen={isProfileOpen}
            onOpenChange={setIsProfileOpen}
            isOwnProfile={true}
          />
        )}

        {isSettingsOpen && (
          <SettingsDialog
            isOpen={isSettingsOpen}
            onOpenChange={setIsSettingsOpen}
          />
        )}
      </div>
    </>
  );
}

// Sử dụng memo để tránh re-render không cần thiết
export default memo(Sidebar);
