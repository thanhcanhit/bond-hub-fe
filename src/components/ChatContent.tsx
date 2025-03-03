import { useState } from "react";
import { Button } from "./ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Input } from "./ui/input";
import { Bell, MoreHorizontal, Pen, Pin, Users } from "lucide-react";
//import { Image } from "@chakra-ui/react";

function ChatContent({
  chat,
}: {
  chat: {
    id: number;
    name: string;
    message?: string;
    time?: string;
    avatar: string;
    phone?: string;
    content?: string;
  };
}) {
  const [isRightSidebarCollapsed, setIsRightSidebarCollapsed] = useState(false);
  const [showProfile, setShowProfile] = useState(false); // State để hiển thị hồ sơ người dùng
  const [isEditingNickname, setIsEditingNickname] = useState(false); // State để bật/tắt chỉnh sửa biệt danh
  const [nickname, setNickname] = useState(""); // State để chỉnh sửa biệt danh
  const handleShowProfile = () => setShowProfile(true);
  const handleEditNickname = () => {
    setIsEditingNickname(true);
    setNickname(chat.name || ""); // Lấy tên hiện tại làm giá trị ban đầu
  };
  const handleSaveNickname = () => {
    // Logic để lưu biệt danh (giả sử cập nhật vào selectedChat hoặc API)
    console.log("Biệt danh mới:", nickname);
    setIsEditingNickname(false);
  };
  const toggleRightSidebar = () => {
    setIsRightSidebarCollapsed((prev) => !prev);
  };

  return (
    <div className="flex flex-row h-screen">
      <div className="flex-1 flex-col">
        <div className="border-b bg-white p-4 flex items-center justify-between">
          <h2 className="font-semibold">{chat.name}</h2>
          <div className="flex gap-2">
            <Button variant="ghost" size="icon" onClick={toggleRightSidebar}>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="flex flex-col h-full justify-end overflow-y-auto gap-4">
          <div className="flex flex-col h-full justify-end overflow-y-scroll scroll-container custom-scrollbar gap-4 p-4">
            <div className="bg-blue-100 p-2 rounded-lg max-w-xs self-end">
              <p>{chat.message}</p>
            </div>
            <div className="bg-gray-200 p-2 rounded-lg max-w-xs">
              <p>{chat.name}: Tin nhắn trả lời...</p>
            </div>
          </div>

          <div className="border p-4 bg-white flex items-center gap-2">
            <Button variant="ghost" size="icon">
              {/* <Image src="/attachment-icon.png" alt="Attach" width={20} height={20} className="h-5 w-5" /> */}
            </Button>
            <input
              type="text"
              placeholder="Nhập tin nhắn..."
              className="flex-1 p-2 border rounded-lg focus:outline-none"
            />
            <Button variant="ghost" size="icon">
              {/* <Image src="/emoji-icon.png" alt="Emoji" width={20} height={20} className="h-5 w-5" /> */}
            </Button>
            <Button variant="ghost" size="icon">
              {/* <Image src="/send-icon.png" alt="Send" width={20} height={20} className="h-5 w-5" /> */}
            </Button>
          </div>
        </div>
      </div>

      <div
        className={`bg-white border-l transition-all duration-300 ${
          isRightSidebarCollapsed ? "w-0 overflow-hidden" : "w-[344px]"
        }`}
      >
        <div className="p-4 border-b items-center justify-center flex">
          <h3 className="font-semibold">Conversation Infor</h3>
        </div>
        <div className="p-4 space-y-4 overflow-y-auto scroll-container custom-scrollbar max-h-full">
          <div className="flex flex-col items-center gap-2 mb-4">
            <Avatar
              onClick={handleShowProfile}
              className="cursor-pointer w-20 h-20 border"
            >
              <AvatarImage src={chat.avatar} />
              <AvatarFallback>
                {chat.name.slice(0, 2).toUpperCase()}
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
                  <h4 className="font-medium text-lg">{chat.name}</h4>
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

          <div className="border-t border-gray-200 pt-2 mb-4">
            <Button
              variant="ghost"
              className="w-full justify-start text-gray-500"
            >
              <span className="mr-2">⏰</span> Reminder board
            </Button>
          </div>

          <div className="border-t border-gray-200 pt-2 mb-4">
            <Button
              variant="ghost"
              className="w-full justify-start text-gray-500"
            >
              <span className="mr-2">👥</span> 4 mutual groups
            </Button>
          </div>

          <div className="space-y-2">
            <h5 className="font-medium">Photos/Videos</h5>
            <div className="grid grid-cols-4 gap-2">
              {Array.from({ length: 8 }).map((_, index) => (
                <div
                  key={index}
                  className="w-full aspect-square bg-gray-200 rounded-lg overflow-hidden"
                >
                  {/* <Image
                        src={chat.avatar}
                        alt={`Photo/Video ${index + 1}`}
                        width={80}
                        height={80}
                        className="w-full h-full object-cover"
                      /> */}
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
          <div className="space-y-2">
            <h5 className="font-medium">File</h5>
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className="flex items-center gap-2 p-2 bg-gray-100 rounded-lg"
              >
                <span className="text-blue-500">W</span> {/* Icon file Word */}
                <div>
                  <p className="text-sm font-medium">File {index + 1}.docx</p>
                  <p className="text-xs text-gray-500">
                    {(index + 1) * 10} KB • {new Date().toLocaleDateString()}
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
        {showProfile && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
            <div className="bg-white p-6 rounded-lg w-[400px]">
              <h3 className="font-semibold text-lg mb-4">
                Hồ sơ của {chat.name}
              </h3>
              <p>Thông tin chi tiết về {chat.name}...</p>
              <Button onClick={() => setShowProfile(false)} className="mt-4">
                Đóng
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
export default ChatContent;
