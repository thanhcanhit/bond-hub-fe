"use client";
import { useRouter } from "next/navigation";
import useAuthStore from "@/stores/authStore";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Compass,
  Contact,
  MessageSquare,
  Search,
  UserPlus,
  Users,
} from "lucide-react";
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
import PostContent from "@/components/PostContent";
import ContactContent from "@/components/ContactContent";
import ChatContent from "@/components/ChatContent";
import PostItem from "@/components/PostItem";
import ContactItem from "@/components/ContactItem";
import ChatItem from "@/components/ChatItem";
import { Input } from "@/components/ui/input";
export default function CoreUI() {
  const { accessToken, logout, isLoading } = useAuthStore();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("chat"); // Tab hiện tại: "chat", "contacts", "explore"
  const [selectedChat, setSelectedChat] = useState<{
    id: number;
    name: string;
    message?: string;
    time?: string;
    avatar: string;
    phone?: string;
    content?: string;
  } | null>(null); // Mục chat/danh bạ/bài viết được chọn
  const [isRightSidebarCollapsed] = useState(false);
  const [isTabContentVisible, setIsTabContentVisible] = useState(true);
  //const [showProfile, setShowProfile] = useState(false); // State để hiển thị hồ sơ người dùng
  //const [nickname, setNickname] = useState(""); // State để chỉnh sửa biệt danh
  //const [isEditingNickname, setIsEditingNickname] = useState(false); // State để bật/tắt chỉnh sửa biệt danh

  // const handleShowProfile = () => setShowProfile(true);
  // const handleEditNickname = () => {
  //   setIsEditingNickname(true);
  //   setNickname(selectedChat?.name || ""); // Lấy tên hiện tại làm giá trị ban đầu
  // };
  // const handleSaveNickname = () => {
  //   // Logic để lưu biệt danh (giả sử cập nhật vào selectedChat hoặc API)
  //   console.log("Biệt danh mới:", nickname);
  //   setIsEditingNickname(false);
  // };

  useEffect(() => {
    const handleResize = () => {
      // Ẩn phần thanh chứa nội dung tab khi độ rộng cửa sổ nhỏ hơn 1024px (khoảng 1/2 màn hình full HD)
      setIsTabContentVisible(window.innerWidth >= 1024);
    };

    // Gọi lần đầu và lắng nghe sự kiện resize
    handleResize();
    window.addEventListener("resize", handleResize);

    // Cleanup
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (!token) router.push("/login");
  }, [accessToken, router]);

  const handleLogout = () => {
    logout();
    setTimeout(() => router.push("/login"), 2000); // Chờ 2s rồi chuyển hướng
  };

  // Dữ liệu mẫu
  const chats = [
    {
      id: 1,
      name: "Như Ngọc",
      message: "Chờ em mua cái máy sấy tóc...",
      time: "16 giờ",
      avatar:
        "https://i.ibb.co/XxXXczsK/480479681-599145336423941-8941882180530449347-n.jpg",
    },
    {
      id: 2,
      name: "Ultimate Zalo",
      message: "nhutam050@gmail.com",
      time: "1 giờ",
      avatar: "https://i.ibb.co/xSpQqbFY/khok.jpg",
    },
    // Thêm các chat khác...
  ];

  const contacts = [
    {
      id: 1,
      name: "Như Ngọc",
      phone: "0123456789",
      avatar:
        "https://i.ibb.co/XxXXczsK/480479681-599145336423941-8941882180530449347-n.jpg",
    },
    {
      id: 2,
      name: "Như Tâm",
      phone: "0987654321",
      avatar: "https://i.ibb.co/xSpQqbFY/khok.jpg",
    },
    // Thêm các liên hệ khác...
  ];

  const posts = [
    {
      id: 1,
      user: "Như Ngọc",
      content: "Hôm nay đẹp trời quá!",
      time: "2 giờ trước",
      avatar: "https://via.placeholder.com/40",
    },
    // Thêm các bài viết khác...
  ];
  return (
    <>
      {isLoading && <Loading />}
      <div className="flex h-screen bg-gray-100">
        {/* Sidebar trái - Tabs */}
        <div className="w-16 bg-[#005ae0] text-white flex flex-col items-center py-4 space-y-6">
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
                <DropdownMenuLabel>Như Tâm</DropdownMenuLabel>
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
          <Button
            variant="ghost"
            size="icon"
            className="text-white"
            onClick={() => setActiveTab("chat")}
          >
            <MessageSquare className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-white"
            onClick={() => setActiveTab("contacts")}
          >
            <Contact className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-white"
            onClick={() => setActiveTab("explore")}
          >
            <Compass className="h-5 w-5" />
          </Button>
          <div>
            <Button onClick={handleLogout}>Đăng xuất</Button>
          </div>
        </div>

        {/* Left Sidebar - Chat List */}
        <div
          className={`w-[340px] bg-white border-r flex flex-col ${isTabContentVisible ? "flex" : "hidden"}`}
        >
          <div className="p-4 border-b flex items-center justify-between">
            <div className="flex items-center space-x-2 border bg-gray-200 rounded-md pl-2 h-8">
              <Search className="h-4 w-4" />
              <Input placeholder="Tìm kiếm" />
            </div>
            <UserPlus className="h-4 w-4" />
            <Users className="h-4 w-4" />
          </div>
          <div className="flex-1 overflow-y-scroll scroll-container custom-scrollbar">
            {activeTab === "chat" &&
              chats.map((chat) => (
                <ChatItem
                  key={chat.id}
                  {...chat}
                  onClick={() => setSelectedChat(chat)}
                />
              ))}
            {activeTab === "contacts" &&
              contacts.map((contact) => (
                <ContactItem
                  key={contact.id}
                  {...contact}
                  onClick={() => setSelectedChat(contact)}
                />
              ))}
            {activeTab === "explore" &&
              posts.map((post) => (
                <PostItem
                  key={post.id}
                  {...post}
                  onClick={() => setSelectedChat({ ...post, name: post.user })}
                />
              ))}
          </div>
        </div>

        {/* Main Chat Area */}
        <div
          className={`flex-1 flex flex-col ${isRightSidebarCollapsed ? "w-full" : "w-[calc(100%-344px)]"} transition-all duration-300 ${isTabContentVisible ? "md:w-[calc(100%-408px)]" : "w-full"}`}
        >
          <div className="flex-1 bg-[#ebecf0] overflow-y-auto">
            {selectedChat && activeTab === "chat" && (
              <ChatContent chat={selectedChat} />
            )}
            {selectedChat && activeTab === "contacts" && selectedChat.phone && (
              <ContactContent
                contact={
                  selectedChat as {
                    id: number;
                    name: string;
                    phone: string;
                    avatar: string;
                  }
                }
              />
            )}
            {selectedChat && activeTab === "explore" && (
              <PostContent
                post={{
                  ...selectedChat,
                  user: selectedChat.name,
                  content: selectedChat.content || "",
                  time: selectedChat.time || "",
                }}
              />
            )}
          </div>
        </div>
      </div>
    </>
  );
}
