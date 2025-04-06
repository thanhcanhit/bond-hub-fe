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
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Compass,
  HelpCircle,
  LogOut,
  LucideContactRound,
  MessageCircleMore,
  Settings,
} from "lucide-react";
import { useRouter } from "next/navigation";
import SettingsDialog from "./SettingDialog";

import { useState } from "react";
import ProfileDialog from "./ProfileDialog";

export default function Sidebar() {
  const { logout: logoutFromStore, user } = useAuthStore();
  console.log("user", user);
  // const user = useAuthStore((state) => state.user);
  const router = useRouter();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const handleLogout = async () => {
    const result = await logoutFromStore();
    if (result) {
      router.push("/login");
    } else {
      console.log("Logout failed:");
    }
  };

  return (
    <div className="w-16 bg-[#005ae0] text-white flex flex-col items-center space-y-6">
      <div className="mt-5">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Avatar className="cursor-pointer">
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
      <Button
        variant="ghost"
        className="text-white focus:bg-[#005ae0]"
        onClick={() => router.push("/dashboard/chat")}
      >
        <MessageCircleMore className="h-20 w-20" />
      </Button>
      <Button
        variant="ghost"
        className="text-white focus:bg-[#005ae0]"
        onClick={() => router.push("/dashboard/contact")}
      >
        <LucideContactRound className="h-20 w-20" />
      </Button>
      <Button
        variant="ghost"
        className="text-white focus:bg-[#005ae0]"
        onClick={() => router.push("/dashboard/post")}
      >
        <Compass className="h-20 w-20" />
      </Button>

      <div className="flex-1" />

      <div className="mb-5 flex flex-col items-center space-y-4">
        <Button
          variant="ghost"
          className="text-red-400 hover:bg-[#0045b8] focus:bg-[#0045b8]"
          onClick={handleLogout}
        >
          <LogOut className="h-6 w-6" />
        </Button>
        <Button
          variant="ghost"
          className="text-white hover:bg-[#0045b8] focus:bg-[#0045b8]"
          onClick={() => setIsSettingsOpen(true)}
        >
          <Settings className="h-6 w-6" />
        </Button>
        <Button
          variant="ghost"
          className="text-white hover:bg-[#0045b8] focus:bg-[#0045b8]"
          onClick={() => router.push("/dashboard/help")}
        >
          <HelpCircle className="h-6 w-6" />
        </Button>
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
  );
}
