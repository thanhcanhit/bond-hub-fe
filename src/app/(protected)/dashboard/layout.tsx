"use client";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";
import { useEffect } from "react";
import Loading from "@/components/Loading";
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
import { Compass, LucideContactRound, MessageCircleMore } from "lucide-react";
import { logout } from "@/actions/auth.action";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, isLoading } = useAuthStore();
  const router = useRouter();
  const { user } = useAuthStore();
  const handleLogout = () => {
    logout();
    setTimeout(() => router.push("/login"), 2000); // Chờ 2s rồi chuyển hướng
  };

  useEffect(() => {
    console.log("ProtectedLayout: isAuthenticated", isAuthenticated);
    console.log("ProtectedLayout: isLoading", isLoading);
    console.log("ProtectedLayout: user", user);
    if (!isAuthenticated && !isLoading) {
      router.push("/login");
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return <Loading />;
  }

  if (!isAuthenticated) {
    return null; // Hoặc một thông báo tạm thời trước khi chuyển hướng
  }

  return (
    <div className="protected-layout">
      <div className="flex h-screen bg-gray-100">
        {/* Sidebar trái - Tabs */}
        <div className="w-16 bg-[#005ae0] text-white flex flex-col items-center space-y-6">
          <div className="mt-5">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Avatar className="cursor-pointer">
                  <AvatarImage src="https://i.ibb.co/XxXXczsK/480479681-599145336423941-8941882180530449347-n.jpg" />
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
                  {user?.userInfo?.fullName ?? "Guest"}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem>
                    Nâng cấp tài khoản
                    <DropdownMenuShortcut>⇧⌘P</DropdownMenuShortcut>
                  </DropdownMenuItem>
                  <DropdownMenuItem>Hồ sơ của bạn</DropdownMenuItem>
                  <DropdownMenuItem>Cài đặt</DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem>Đăng xuất</DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <Button variant="ghost" className="text-white focus:bg-[#005ae0]">
            <MessageCircleMore className="h-20 w-20" />
          </Button>
          <Button variant="ghost" className="text-white focus:bg-[#005ae0]">
            <LucideContactRound className="h-20 w-20" />
          </Button>
          <Button variant="ghost" className="text-white focus:bg-[#005ae0]">
            <Compass className="h-20 w-20" />
          </Button>
          <div>
            <Button
              className="bg- #005ae0 text-white rounded-full"
              onClick={handleLogout}
            >
              Đăng xuất
            </Button>
          </div>
        </div>
      </div>
      {children}
    </div>
  );
}
