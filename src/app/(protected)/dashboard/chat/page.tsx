// Code: src/app/dashboard/page.tsx
"use client";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Compass,
  LucideContactRound,
  MessageCircleMore,
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

import { Input } from "@/components/ui/input";
// import { Contact } from "@/types/auth";
export default function CoreUI() {
  const { isAuthenticated, logout, isLoading } = useAuthStore();
  const user = useAuthStore((state) => state.user);
  const router = useRouter();

  const [isRightSidebarCollapsed] = useState(false);
  const [isTabContentVisible, setIsTabContentVisible] = useState(true);
  // const [activeFilter, setActiveFilter] = useState("friends");
  // const currentUserId = user?.id || null;
  useEffect(() => {
    const handleResize = () => {
      setIsTabContentVisible(window.innerWidth >= 1024);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, router]);

  const handleLogout = () => {
    logout();
    setTimeout(() => router.push("/login"), 2000); // Chờ 2s rồi chuyển hướng
  };
  // const handleFilterSelect = (filter: string) => {
  //   // setActiveFilter(filter);
  //   setSelectedChat(null); // Reset chat/contact khi đổi filter
  // };
  // Xử lý khi chọn contact để chuyển sang ChatContent
  // const handleContactSelect = (contact: Contact) => {
  //   setSelectedChat({
  //     id: Number(contact.id),
  //     name: contact.user.userInfo.fullName,
  //     message: "Tin nhắn đầu tiên...",
  //     time: new Date().toLocaleTimeString(),
  //     avatar: contact.user.userInfo.profilePictureUrl,
  //     phone: contact.user.phoneNumber || "",
  //     content: "",
  //   });
  // };

  return (
    <>
      {isLoading && <Loading />}
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
            {/* {activeTab === "chat" &&
              chats.map((chat) => (
                <ChatItem
                  key={chat.id}
                  {...chat}
                  onClick={() => setSelectedChat(chat)}
                />
              ))} */}
            {/* {activeTab === "contacts" &&
              contacts.map((contact) => (
                <ContactItem
                  key={contact.id}
                  {...contact}
                  onClick={() => setSelectedChat(contact)}
                />
              ))} */}
            {/* {activeTab === "chat" &&
              // sampleData.chats.map((chat) => (
              //   <ChatItem
              //     key={chat.id}
              //     name={chat.name}
              //     avatar={chat.avatar}
              //     message={chat.messages[0]?.content || "Tin nhắn đầu tiên..."}
              //     time={chat.messages[0]?.time || new Date().toLocaleTimeString()}
              //     onClick={() => setSelectedChat({
              //       id: chat.id,
              //       name: chat.name,
              //       message: chat.messages[0]?.content || "Tin nhắn đầu tiên...",
              //       time: chat.messages[0]?.time || new Date().toLocaleTimeString(),
              //       avatar: chat.avatar,
              //       phone: "",
              //       content: "",
              //     })}
              //   />
              ))} */}
            {/* {activeTab === "contacts" && (
              <ContactItem onFilterSelect={handleFilterSelect} />
            )} */}
            {/* {activeTab === "explore" &&
              sampleData.posts.map((post) => (
                <PostItem
                  key={post.id}
                  {...post}
                  onClick={() => setSelectedChat({
                    id: post.id,
                    name: post.user.userInfo.fullName,
                    message: "",
                    time: post.time,
                    avatar: post.user.userInfo.profilePictureUrl,
                    phone: post.user.phoneNumber,
                    content: post.content,
                  })}
                />
              ))} */}
            {/* {activeTab === "explore" &&
              posts.map((post) => (
                <PostItem
                  key={post.id}
                  {...post}
                  onClick={() => setSelectedChat({ ...post, name: post.user })}
                />
              ))} */}
          </div>
        </div>

        {/* Main Chat Area */}
        <div
          className={`flex-1 flex flex-col ${isRightSidebarCollapsed ? "w-full" : "w-[calc(100%-344px)]"} transition-all duration-300 ${isTabContentVisible ? "md:w-[calc(100%-408px)]" : "w-full"}`}
        >
          <div className="flex-1 bg-[#ebecf0] overflow-y-auto">
            {/* {selectedChat && activeTab === "chat" && (
              <ChatContent chat={selectedChat} />
            )} */}
            {/* {selectedChat && activeTab === "contacts" && selectedChat.phone && (
              <ContactContent
                activeFilter={activeFilter}
                data={{
                  users: sampleData.users.map(user => ({
                    ...user,
                    userInfo: {
                      ...user.userInfo,
                      userAuth: user.userInfo.userAuth ? {
                        ...user.userInfo.userAuth,
                        userInfo: null
                      } : null
                    }
                  })),
                  contacts: sampleData.contacts,
                  friends: sampleData.friends,
                  groups: sampleData.groups,
                  groupMembers: sampleData.groupMembers
                }}
                onContactSelect={handleContactSelect}
              />
            )} */}
            {/* {activeTab === "contacts" && !selectedChat && (
              <ContactContent
                activeFilter={activeFilter}
                data={sampleData}
                onContactSelect={handleContactSelect}
                currentUserId={currentUserId ?? 0}
              />
            )} */}
            {/* {selectedChat && activeTab === "explore" && (
              <PostContent
                post={{
                  ...selectedChat,
                  user: selectedChat.name,
                  content: selectedChat.content || "",
                  time: selectedChat.time || "",
                }}
              />
            )} */}
          </div>
        </div>
      </div>
    </>
  );
}
