"use client";
import { useRouter } from "next/navigation";
import useAuthStore from "@/stores/authStore";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Bell,
  Compass,
  Contact,
  MessageSquare,
  MoreHorizontal,
  Pen,
  Pin,
  Users,
} from "lucide-react";
import Loading from "@/components/Loading";
import { Input } from "@/components/ui/input";
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
  const [isRightSidebarCollapsed, setIsRightSidebarCollapsed] = useState(false);
  const [isTabContentVisible, setIsTabContentVisible] = useState(true);
  const [showProfile, setShowProfile] = useState(false); // State để hiển thị hồ sơ người dùng
  const [nickname, setNickname] = useState(""); // State để chỉnh sửa biệt danh
  const [isEditingNickname, setIsEditingNickname] = useState(false); // State để bật/tắt chỉnh sửa biệt danh

  const handleShowProfile = () => setShowProfile(true);
  const handleEditNickname = () => {
    setIsEditingNickname(true);
    setNickname(selectedChat?.name || ""); // Lấy tên hiện tại làm giá trị ban đầu
  };
  const handleSaveNickname = () => {
    // Logic để lưu biệt danh (giả sử cập nhật vào selectedChat hoặc API)
    console.log("Biệt danh mới:", nickname);
    setIsEditingNickname(false);
  };

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
  // const toggleSidebar = () => {
  //   setIsSidebarCollapsed((prev) => !prev);
  // };
  const toggleRightSidebar = () => {
    setIsRightSidebarCollapsed((prev) => !prev);
  };

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
          className={`w-[408px] bg-white border-r flex flex-col ${isTabContentVisible ? "flex" : "hidden"}`}
        >
          <div className="p-4 border-b">
            <h2 className="text-lg font-bold">
              {activeTab === "chat" && "Danh sách chat"}
              {activeTab === "contacts" && "Danh bạ"}
              {activeTab === "explore" && "Khám phá"}
            </h2>
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
          <div className="border-b bg-white p-4 flex items-center justify-between">
            <h2 className="font-semibold">
              {selectedChat
                ? selectedChat.name
                : "Chọn một mục để xem chi tiết"}
            </h2>
            <div className="flex gap-2">
              <Button variant="ghost" size="icon" onClick={toggleRightSidebar}>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
              <Button onClick={handleLogout} className="bg-red-500 text-white">
                Đăng xuất
              </Button>
            </div>
          </div>
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

        {/* Right Sidebar - Group Info (Collapsible) */}
        <div
          className={`bg-white border-l transition-all duration-300 ${
            isRightSidebarCollapsed ? "w-0 overflow-hidden" : "w-[344px]"
          }`}
        >
          <div className="p-4 border-b items-center justify-center flex">
            <h3 className="font-semibold">Conversation Infor</h3>
          </div>
          {selectedChat && (
            <div className="p-4 space-y-4 overflow-y-auto scroll-container custom-scrollbar max-h-full">
              <div className="flex flex-col items-center gap-2 mb-4">
                <Avatar
                  onClick={handleShowProfile}
                  className="cursor-pointer w-20 h-20 border"
                >
                  <AvatarImage src={selectedChat.avatar} />
                  <AvatarFallback>
                    {selectedChat.name.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  {isEditingNickname ? (
                    <div className="flex items-center gap-2">
                      <Input
                        value={nickname}
                        onChange={(e) => setNickname(e.target.value)}
                        className="w-full"
                        placeholder="Nhập biệt danh"
                      />
                      <Button onClick={handleSaveNickname} size="sm">
                        Lưu
                      </Button>
                      <Button
                        onClick={() => setIsEditingNickname(false)}
                        size="sm"
                        variant="ghost"
                      >
                        Hủy
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-lg">
                        {selectedChat.name}
                      </h4>
                      <Button
                        onClick={handleEditNickname}
                        size="icon"
                        variant="ghost"
                      >
                        <Pen className="h-5 w-5" />
                      </Button>
                    </div>
                  )}
                </div>
                {/* Nút chức năng: Mute, Pin, Create group */}
                <div className="flex gap-8 mb-4">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-gray-500 flex flex-col"
                  >
                    <Bell className="h-4 w-4" />
                    <p>Mute</p>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-gray-500 flex flex-col"
                  >
                    <Pin className="h-4 w-4" />
                    <p>Pin</p>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-gray-500 flex flex-col"
                  >
                    <Users className="h-4 w-4" />
                    <p>
                      Create <br></br> group
                    </p>
                  </Button>
                </div>
              </div>

              {/* Reminder board */}
              <div className="border-t border-gray-200 pt-2 mb-4">
                <Button
                  variant="ghost"
                  className="w-full justify-start text-gray-500"
                >
                  <span className="mr-2">⏰</span> Reminder board
                </Button>
              </div>

              {/* Mutual groups */}
              <div className="border-t border-gray-200 pt-2 mb-4">
                <Button
                  variant="ghost"
                  className="w-full justify-start text-gray-500"
                >
                  <span className="mr-2">👥</span> 4 mutual groups
                </Button>
              </div>

              {/* Photos/Videos - Hiển thị 8 ảnh/video mới nhất, bố cục 4 cột */}
              <div className="space-y-2">
                <h5 className="font-medium">Photos/Videos</h5>
                <div className="grid grid-cols-4 gap-2">
                  {Array.from({ length: 8 }).map((_, index) => (
                    <div
                      key={index}
                      className="w-full aspect-square bg-gray-200 rounded-lg overflow-hidden"
                    >
                      <img
                        src={`https://via.placeholder.com/80?index=${index}`}
                        alt={`Photo/Video ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                </div>
                <Button
                  variant="ghost"
                  className="w-full justify-start text-gray-500 mt-2"
                >
                  View all
                </Button>
              </div>

              {/* Files - Hiển thị 3 file mới nhất */}
              <div className="space-y-2">
                <h5 className="font-medium">File</h5>
                {Array.from({ length: 3 }).map((_, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 p-2 bg-gray-100 rounded-lg"
                  >
                    <span className="text-blue-500">W</span>{" "}
                    {/* Icon file Word */}
                    <div>
                      <p className="text-sm font-medium">
                        File {index + 1}.docx
                      </p>
                      <p className="text-xs text-gray-500">
                        {(index + 1) * 10} KB •{" "}
                        {new Date().toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
                <Button
                  variant="ghost"
                  className="w-full justify-start text-gray-500 mt-2"
                >
                  View all
                </Button>
              </div>

              {/* Links - Hiển thị 3 link mới nhất */}
              <div className="space-y-2">
                <h5 className="font-medium">Link</h5>
                {Array.from({ length: 3 }).map((_, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 p-2 bg-gray-100 rounded-lg"
                  >
                    <span className="text-blue-500">🔗</span> {/* Icon link */}
                    <div>
                      <p className="text-sm font-medium">
                        Link {index + 1} • www.example.com
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date().toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
                <Button
                  variant="ghost"
                  className="w-full justify-start text-gray-500 mt-2"
                >
                  View all
                </Button>
              </div>

              {/* Privacy settings */}
              <div className="space-y-2">
                <h5 className="font-medium">Privacy settings</h5>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-2 bg-gray-100 rounded-lg">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500">⏳</span>
                      <p className="text-sm">Disappearing messages</p>
                    </div>
                    <select className="border rounded p-1 text-sm">
                      <option>Never</option>
                      <option>1 hour</option>
                      <option>1 day</option>
                    </select>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-gray-100 rounded-lg">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500">👁️</span>
                      <p className="text-sm">Hide conversation</p>
                    </div>
                    <input type="checkbox" className="toggle" />
                  </div>
                </div>
              </div>

              {/* Report và Delete chat history */}
              <div className="space-y-2">
                <Button
                  variant="ghost"
                  className="w-full justify-start text-gray-500"
                >
                  <span className="mr-2">⚠️</span> Report
                </Button>
                <Button variant="destructive" className="w-full justify-start">
                  <span className="mr-2">🗑️</span> Delete chat history
                </Button>
              </div>
            </div>
          )}
          {/* Modal hiển thị hồ sơ (nếu cần) */}
          {showProfile && (
            <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
              <div className="bg-white p-6 rounded-lg w-[400px]">
                <h3 className="font-semibold text-lg mb-4">
                  Hồ sơ của {selectedChat?.name}
                </h3>
                <p>Thông tin chi tiết về {selectedChat?.name}...</p>
                <Button onClick={() => setShowProfile(false)} className="mt-4">
                  Đóng
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
