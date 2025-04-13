"use client";

import { Search, UserPlus, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatMessageTime } from "@/utils/dateUtils";
import { getUserInitials, getUserDisplayName } from "@/utils/userUtils";
import { useConversationsStore } from "@/stores/conversationsStore";
import { useChatStore } from "@/stores/chatStore";

interface ContactListProps {
  onSelectContact: (contactId: string | null) => void;
}

export default function ContactList({ onSelectContact }: ContactListProps) {
  const selectedContact = useChatStore((state) => state.selectedContact);
  const { isLoading, searchQuery, setSearchQuery, getFilteredConversations } =
    useConversationsStore();

  // Get filtered conversations based on search query
  const filteredConversations = getFilteredConversations();

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
        {isLoading ? (
          <div className="flex justify-center items-center h-20">
            <p className="text-gray-500">Đang tải danh sách người dùng...</p>
          </div>
        ) : filteredConversations.length > 0 ? (
          filteredConversations.map((conversation) => (
            <div
              key={conversation.contact.id}
              className={`flex items-center gap-3 p-3 hover:bg-gray-100 cursor-pointer ${
                selectedContact?.id === conversation.contact.id
                  ? "bg-blue-50"
                  : ""
              }`}
              onClick={() => onSelectContact(conversation.contact.id)}
            >
              <Avatar className="h-12 w-12 border">
                <AvatarImage
                  src={conversation.contact.userInfo?.profilePictureUrl || ""}
                  className="object-cover"
                />
                <AvatarFallback>
                  {getUserInitials(conversation.contact)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center">
                  <p className="font-medium truncate">
                    {getUserDisplayName(conversation.contact)}
                  </p>
                  {conversation.lastMessage && (
                    <span className="text-xs text-gray-500 whitespace-nowrap ml-1">
                      {formatMessageTime(conversation.lastMessage.createdAt)}
                    </span>
                  )}
                  {conversation.unreadCount > 0 && (
                    <span className="bg-blue-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center ml-1">
                      {conversation.unreadCount}
                    </span>
                  )}
                </div>
                {conversation.lastMessage && (
                  <p className="text-sm text-gray-500 truncate">
                    {conversation.lastMessage.recalled
                      ? "Tin nhắn đã được thu hồi"
                      : conversation.lastMessage.content.text ||
                        (conversation.lastMessage.content.media?.length
                          ? "[Hình ảnh/Tệp đính kèm]"
                          : "")}
                  </p>
                )}
                {!conversation.lastMessage &&
                  conversation.contact.userInfo?.statusMessage && (
                    <p className="text-sm text-gray-500 truncate">
                      {conversation.contact.userInfo.statusMessage}
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
