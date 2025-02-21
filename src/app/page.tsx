"use client";

import { useRouter } from "next/navigation";
import useAuthStore from "@/stores/authStore";
// import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
// import { AppSidebar } from "@/components/app-sidebar";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Bell,
  MoreHorizontal,
  PanelLeft,
  Pin,
  Plug,
  Plus,
  Users,
} from "lucide-react";
export default function ChatPage() {
  const accessToken = useAuthStore();
  // const logout = useAuthStore((state) => state.logout);
  const router = useRouter();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const toggleSidebar = () => {
    setIsSidebarCollapsed((prev) => !prev);
  };

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (!token) router.push("/login");
    else router.push("/");
  }, [accessToken, router]);

  // return (
  // <SidebarProvider suppressHydrationWarning={true}>
  //   <AppSidebar />
  //   <main className="min-h-screen">
  //     <SidebarTrigger />
  //     <div className="flex flex-col items-center justify-center h-screen bg-gray-50">
  //       <p className="mt-4 text-lg">Đây là trang chat của bạn.</p>
  //       <button onClick={logout}>Đăng xuất</button>
  //     </div>
  //   </main>
  // </SidebarProvider>
  return (
    <div className="flex h-screen bg-gray-100">
      {/* Left Sidebar - Chat List */}
      <div className="w-[408px] bg-[#005ae0] text-white p-4 flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">Danh sách chat</h2>
          <Button variant="ghost" size="icon" className="text-white">
            <Plug className="h-4 w-4" />
          </Button>
        </div>
        <div className="space-y-2 overflow-y-auto flex-1">
          {/* Chat Items */}
          <ChatItem
            name="Cloud của tôi"
            message="Hôm qua"
            time="2 giờ"
            avatar="https://via.placeholder.com/40"
          />
          <ChatItem
            name="Ultimate Zalo"
            message="Bạn: nhutam050@gmail.com"
            time="1 giờ"
            avatar="https://via.placeholder.com/40"
          />
          <ChatItem
            name="Hủy diệt Thắng"
            message="Khẳng: https://meet.google.com/..."
            time="2 giờ"
            avatar="https://via.placeholder.com/40"
          />
          <ChatItem
            name="Nguyệt"
            message="Bạn: Rồi à ❤️ Nguyệt"
            time="2 giờ"
            avatar="https://via.placeholder.com/40"
          />
          <ChatItem
            name="Hồ Văn Toàn"
            message="Hình ảnh"
            time="2 giờ"
            avatar="https://via.placeholder.com/40"
          />
          <ChatItem
            name="CN-DHKTPM17C"
            message="Học hành để đăng hoàng nhận cái..."
            time="3 giờ"
            avatar="https://via.placeholder.com/40"
          />
          <ChatItem
            name="Như Ngọc"
            message="Bạn: Chờ em mua cái máy sấy tóc cái..."
            time="16 giờ"
            avatar="https://via.placeholder.com/40"
          />
        </div>
      </div>

      {/* Main Chat Area */}
      <div
        className={`flex-1 flex flex-col ${isSidebarCollapsed ? "w-full" : "w-[calc(100%-64rem)]"} transition-all duration-300`}
      >
        {/* Chat Header */}
        <div className="border-b bg-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Avatar>
              <AvatarImage src="https://via.placeholder.com/40" />
              <AvatarFallback>UZ</AvatarFallback>
            </Avatar>
            <div>
              <h2 className="font-semibold">Ultimate Zalo</h2>
              <p className="text-sm text-gray-500">4 thành viên</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="icon">
              <Bell className="h-4 w-4" />
            </Button>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-48">
                <div className="space-y-2">
                  <Button variant="ghost" className="w-full justify-start">
                    Bắt buộc
                  </Button>
                  <Button variant="ghost" className="w-full justify-start">
                    Ghim hội thoại
                  </Button>
                  <Button variant="ghost" className="w-full justify-start">
                    Thêm thành viên
                  </Button>
                  <Button variant="ghost" className="w-full justify-start">
                    Quan lý nhóm
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
            <Button variant="ghost" size="icon" onClick={toggleSidebar}>
              <PanelLeft className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 bg-[#ebecf0] p-4 overflow-y-auto space-y-4">
          <div className="flex justify-center">
            <div className="bg-purple-600 text-white p-4 rounded-lg max-w-md">
              <p>Hostinger - Bring Your Idea Online With a Website</p>
              <p>
                Choose Hostinger and make the perfect site. From Shared Hosting
                and Domains to VPS and Cloud plans. We have all...
              </p>
              <p className="text-sm text-gray-200 mt-2">www.hostinger.com</p>
            </div>
          </div>
          <div className="flex items-end gap-2">
            <Avatar>
              <AvatarImage src="https://via.placeholder.com/40" />
              <AvatarFallback>NT</AvatarFallback>
            </Avatar>
            <div className="bg-blue-100 p-2 rounded-lg max-w-xs">
              <p>nhutam050@gmail.com</p>
            </div>
            <span className="text-sm text-gray-500">13:30</span>
          </div>
        </div>

        {/* Input Area */}
        <div className="border-t p-4 bg-white flex items-center gap-2">
          <Button variant="ghost" size="icon">
            <img src="/attachment-icon.png" alt="Attach" className="h-5 w-5" />
          </Button>
          <input
            type="text"
            placeholder="Nhập tin nhắn..."
            className="flex-1 p-2 border rounded-lg focus:outline-none"
          />
          <Button variant="ghost" size="icon">
            <img src="/emoji-icon.png" alt="Emoji" className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon">
            <img src="/send-icon.png" alt="Send" className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Right Sidebar - Group Info (Collapsible) */}
      <div
        className={`bg-white border-l transition-all duration-300 ${
          isSidebarCollapsed ? "w-0 overflow-hidden" : "w-[344px]"
        }`}
      >
        <h3 className="font-semibold mb-4">Thông tin nhóm</h3>
        <div className="space-y-2">
          <Button variant="ghost" className="w-full justify-start">
            Bắt buộc <Bell className="ml-2 h-4 w-4" />
          </Button>
          <Button variant="ghost" className="w-full justify-start">
            Ghim hội thoại <Pin className="ml-2 h-4 w-4" />
          </Button>
          <Button variant="ghost" className="w-full justify-start">
            Thêm thành viên <Plus className="ml-2 h-4 w-4" />
          </Button>
          <Button variant="ghost" className="w-full justify-start">
            Quan lý nhóm <Users className="ml-2 h-4 w-4" />
          </Button>
        </div>
        <div className="mt-4">
          <h4 className="font-medium">Thành viên nhóm</h4>
          <p>4 thành viên</p>
        </div>
      </div>
    </div>
  );

  // Chat Item Component
  function ChatItem({
    name,
    message,
    time,
    avatar,
  }: {
    name: string;
    message: string;
    time: string;
    avatar: string;
  }) {
    return (
      <div className="flex items-center gap-2 p-2 hover:bg-blue-700 rounded-lg cursor-pointer">
        <Avatar>
          <AvatarImage src={avatar} />
          <AvatarFallback>{name.slice(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <div className="flex justify-between">
            <p className="font-medium">{name}</p>
            <span className="text-xs">{time}</span>
          </div>
          <p className="text-sm truncate">{message}</p>
        </div>
      </div>
    );
  }
  //);
}
