"use client";
import { useEffect, useState, useMemo } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

type Friend = {
  id: string;
  fullName: string;
  profilePictureUrl: string;
  status: string;
};

type FriendsByLetter = {
  [key: string]: Friend[];
};

export default function ContactPage() {
  const [activeTab, setActiveTab] = useState<string>("friends");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [friends, setFriends] = useState<Friend[]>([]);
  const [sortOption, setSortOption] = useState<string>("name");

  // Dữ liệu mẫu cố định - sử dụng useMemo để tránh re-render
  const mockFriends = useMemo<Friend[]>(
    () => [
      {
        id: "1",
        fullName: "Anh Trung",
        profilePictureUrl: "https://i.pravatar.cc/150?img=1",
        status: "online",
      },
      {
        id: "2",
        fullName: "Anh Tý",
        profilePictureUrl: "https://i.pravatar.cc/150?img=2",
        status: "offline",
      },
      {
        id: "3",
        fullName: "Anny Kim",
        profilePictureUrl: "https://i.pravatar.cc/150?img=3",
        status: "online",
      },
      {
        id: "4",
        fullName: "Ba",
        profilePictureUrl: "https://i.pravatar.cc/150?img=4",
        status: "offline",
      },
      {
        id: "5",
        fullName: "Bá Ngọc",
        profilePictureUrl: "https://i.pravatar.cc/150?img=5",
        status: "online",
      },
      {
        id: "6",
        fullName: "Cường",
        profilePictureUrl: "https://i.pravatar.cc/150?img=6",
        status: "offline",
      },
      {
        id: "7",
        fullName: "Dũng",
        profilePictureUrl: "https://i.pravatar.cc/150?img=7",
        status: "online",
      },
      {
        id: "8",
        fullName: "Đạt",
        profilePictureUrl: "https://i.pravatar.cc/150?img=8",
        status: "offline",
      },
      {
        id: "9",
        fullName: "Hà",
        profilePictureUrl: "https://i.pravatar.cc/150?img=9",
        status: "online",
      },
      {
        id: "10",
        fullName: "Hùng",
        profilePictureUrl: "https://i.pravatar.cc/150?img=10",
        status: "offline",
      },
      {
        id: "11",
        fullName: "Khánh",
        profilePictureUrl: "https://i.pravatar.cc/150?img=11",
        status: "online",
      },
      {
        id: "12",
        fullName: "Linh",
        profilePictureUrl: "https://i.pravatar.cc/150?img=12",
        status: "offline",
      },
    ],
    [],
  );

  useEffect(() => {
    // Sử dụng dữ liệu mẫu cố định
    setFriends(mockFriends);
  }, [mockFriends]); // Thêm mockFriends vào dependency array

  // Lọc và sắp xếp bạn bè
  const filteredAndSortedFriends = useMemo(() => {
    // Lọc theo từ khóa tìm kiếm
    const filtered = searchQuery
      ? friends.filter((friend) =>
          friend.fullName.toLowerCase().includes(searchQuery.toLowerCase()),
        )
      : friends;

    // Sắp xếp theo tùy chọn
    return [...filtered].sort((a, b) => {
      if (sortOption === "name") {
        return a.fullName.localeCompare(b.fullName);
      } else if (sortOption === "status") {
        // Sắp xếp online trước, offline sau
        return a.status === "online" && b.status !== "online"
          ? -1
          : a.status !== "online" && b.status === "online"
            ? 1
            : a.fullName.localeCompare(b.fullName);
      }
      return 0;
    });
  }, [friends, searchQuery, sortOption]);

  // Lọc bạn bè theo từ khóa tìm kiếm
  const filteredFriends = filteredAndSortedFriends;

  // Hiển thị danh sách bạn bè đã lọc theo chữ cái
  const filteredFriendsByLetter = useMemo(() => {
    const result: FriendsByLetter = {};
    filteredFriends.forEach((friend) => {
      const firstLetter = friend.fullName.charAt(0).toUpperCase();
      if (!result[firstLetter]) {
        result[firstLetter] = [];
      }
      result[firstLetter].push(friend);
    });
    return result;
  }, [filteredFriends]);

  return (
    <div className="flex flex-1 h-screen w-full bg-gray-100 overflow-hidden">
      {/* Left Sidebar - Contact Tabs */}
      <div className="w-[300px] bg-white border-r flex flex-col shadow-sm h-screen">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold mb-2">Danh bạ</h2>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div
            className={`p-4 cursor-pointer hover:bg-gray-100 ${activeTab === "friends" ? "bg-gray-100 text-blue-600" : ""}`}
            onClick={() => setActiveTab("friends")}
          >
            <span className="font-medium">Danh sách bạn bè</span>
          </div>
          <div
            className={`p-4 cursor-pointer hover:bg-gray-100 ${activeTab === "groups" ? "bg-gray-100 text-blue-600" : ""}`}
            onClick={() => setActiveTab("groups")}
          >
            <span className="font-medium">Danh sách nhóm và cộng đồng</span>
          </div>
          <div
            className={`p-4 cursor-pointer hover:bg-gray-100 ${activeTab === "invites" ? "bg-gray-100 text-blue-600" : ""}`}
            onClick={() => setActiveTab("invites")}
          >
            <span className="font-medium">Lời mời kết bạn</span>
          </div>
          <div
            className={`p-4 cursor-pointer hover:bg-gray-100 ${activeTab === "groupInvites" ? "bg-gray-100 text-blue-600" : ""}`}
            onClick={() => setActiveTab("groupInvites")}
          >
            <span className="font-medium">Lời mời vào nhóm và cộng đồng</span>
          </div>
        </div>
      </div>

      {/* Main Content - Friend List */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <div className="p-4 border-b bg-white flex items-center justify-between">
          <h2 className="text-lg font-semibold">Bạn bè ({friends.length})</h2>
          <div className="flex items-center space-x-4">
            <select
              className="border rounded p-1 text-sm bg-white"
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value)}
            >
              <option value="name">Tên (A-Z)</option>
              <option value="status">Trạng thái</option>
            </select>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 bg-white h-[calc(100vh-120px)]">
          <div className="relative w-full mb-4">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
            <Input
              type="text"
              placeholder="Tìm bạn"
              className="w-full h-8 bg-gray-100 border border-gray-200 rounded-md pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {Object.keys(filteredFriendsByLetter)
            .sort()
            .map((letter) => (
              <div key={letter} className="mb-6">
                <div className="text-lg font-semibold mb-2 text-gray-700">
                  {letter}
                </div>
                {filteredFriendsByLetter[letter].map((friend) => (
                  <div
                    key={friend.id}
                    className="flex items-center p-2 hover:bg-gray-100 rounded-md cursor-pointer"
                  >
                    <Avatar className="h-10 w-10 mr-3">
                      <AvatarImage src={friend.profilePictureUrl} />
                      <AvatarFallback>
                        {friend.fullName.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium">{friend.fullName}</div>
                    </div>
                    <div className="ml-auto flex items-center space-x-2">
                      {friend.status === "online" && (
                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
