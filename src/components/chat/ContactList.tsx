"use client";

import { useState, useEffect } from "react";
import { Search, UserPlus, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatMessageTime } from "@/data/mockData";
import { User, UserInfo } from "@/types/base";
import { getAllUsers } from "@/actions/user.action";
import { useAuthStore } from "@/stores/authStore";

type UserWithLastMessage = User & {
  userInfo: UserInfo;
  lastMessage?: {
    text: string;
    time: string;
  };
};

interface ContactListProps {
  onSelectContact: (contactId: string) => void;
  selectedContactId: string | null;
}

export default function ContactList({
  onSelectContact,
  selectedContactId,
}: ContactListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [users, setUsers] = useState<UserWithLastMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const currentUser = useAuthStore((state) => state.user);

  // Fetch all users
  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      try {
        const result = await getAllUsers();
        if (result.success && result.users) {
          // Filter out current user and transform to UserWithLastMessage
          const otherUsers = result.users
            .filter((user) => user.id !== currentUser?.id)
            .map((user) => ({
              ...user,
              userInfo: user.userInfo || {
                id: user.id,
                fullName: user.email || user.phoneNumber || "Unknown",
                profilePictureUrl: null,
                statusMessage: "No status",
                blockStrangers: false,
                createdAt: new Date(),
                updatedAt: new Date(),
                userAuth: user,
              },
              // For now, no last message
              lastMessage: undefined,
            }));
          setUsers(otherUsers);
        }
      } catch (error) {
        console.error("Error fetching users:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [currentUser?.id]);

  // Filter users based on search query
  const filteredUsers = users.filter((user) =>
    user.userInfo?.fullName?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="flex flex-col h-full w-full">
      <div className="p-4 border-b flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-2 border rounded-md pl-2 h-9 flex-1 bg-gray-50">
          <Search className="h-4 w-4 text-gray-500" />
          <Input
            placeholder="Tìm kiếm"
            className="border-0 h-8 focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-2 ml-2">
          <UserPlus className="h-5 w-5 text-gray-600 cursor-pointer" />
          <Users className="h-5 w-5 text-gray-600 cursor-pointer" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {loading ? (
          <div className="flex justify-center items-center h-20">
            <p className="text-gray-500">Đang tải danh sách người dùng...</p>
          </div>
        ) : filteredUsers.length > 0 ? (
          filteredUsers.map((user) => (
            <div
              key={user.id}
              className={`flex items-center gap-3 p-3 hover:bg-gray-100 cursor-pointer ${
                selectedContactId === user.id ? "bg-blue-50" : ""
              }`}
              onClick={() => onSelectContact(user.id)}
            >
              <Avatar className="h-12 w-12 border">
                <AvatarImage src={user.userInfo?.profilePictureUrl || ""} />
                <AvatarFallback>
                  {user.userInfo?.fullName?.slice(0, 2).toUpperCase() || "??"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center">
                  <p className="font-medium truncate">
                    {user.userInfo?.fullName}
                  </p>
                  {user.lastMessage && (
                    <span className="text-xs text-gray-500 whitespace-nowrap ml-1">
                      {user.lastMessage.time}
                    </span>
                  )}
                </div>
                {user.lastMessage && (
                  <p className="text-sm text-gray-500 truncate">
                    {user.lastMessage.text}
                  </p>
                )}
                {!user.lastMessage && user.userInfo?.statusMessage && (
                  <p className="text-sm text-gray-500 truncate">
                    {user.userInfo.statusMessage}
                  </p>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="flex justify-center items-center h-20">
            <p className="text-gray-500">Không tìm thấy người dùng nào</p>
          </div>
        )}
      </div>
    </div>
  );
}
