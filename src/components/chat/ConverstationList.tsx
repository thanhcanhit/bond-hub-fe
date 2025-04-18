"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatMessageTime } from "@/utils/dateUtils";
import { getUserInitials, getUserDisplayName } from "@/utils/userUtils";
import { useConversationsStore } from "@/stores/conversationsStore";
import { useChatStore } from "@/stores/chatStore";
import SearchHeader from "../SearchHeader";

interface ContactListProps {
  onSelectConversation: (
    conversationId: string | null,
    type: "USER" | "GROUP",
  ) => void;
}

export default function ContactList({
  onSelectConversation,
}: ContactListProps) {
  const selectedContact = useChatStore((state) => state.selectedContact);
  const selectedGroup = useChatStore((state) => state.selectedGroup);
  const currentChatType = useChatStore((state) => state.currentChatType);
  const {
    isLoading,
    // searchQuery, setSearchQuery,
    getFilteredConversations,
  } = useConversationsStore();

  // Get filtered conversations based on search query
  const filteredConversations = getFilteredConversations();

  // Log conversations for debugging
  console.log(
    "Filtered conversations:",
    filteredConversations.map((conv) => ({
      id: conv.type === "GROUP" ? conv.group?.id : conv.contact.id,
      name:
        conv.type === "GROUP"
          ? conv.group?.name
          : conv.contact.userInfo?.fullName,
      type: conv.type,
    })),
  );

  return (
    <div className="flex flex-col h-full w-full">
      {/* <div className="p-4 bg-white border-b flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-2 border rounded-md pl-2 h-9 flex-1 bg-gray-50">
          <Search className="h-4 w-4 text-gray-500" />
          <Input
            placeholder="Tìm kiếm"
            className="border-0 shadow-none h-8 focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div> */}
      <SearchHeader />

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {isLoading ? (
          <div className="flex justify-center items-center h-20">
            <p className="text-gray-500">Đang tải danh sách người dùng...</p>
          </div>
        ) : filteredConversations.length > 0 ? (
          filteredConversations.map((conversation) => (
            <div
              key={
                conversation.type === "GROUP"
                  ? `group-${conversation.group?.id}`
                  : conversation.contact.id
              }
              className={`flex items-center gap-3 p-3 hover:bg-gray-100 cursor-pointer ${
                (currentChatType === "USER" &&
                  selectedContact?.id === conversation.contact.id) ||
                (currentChatType === "GROUP" &&
                  selectedGroup?.id === conversation.group?.id)
                  ? "bg-blue-50"
                  : ""
              }`}
              onClick={() =>
                conversation.type === "GROUP"
                  ? onSelectConversation(
                      conversation.group?.id || null,
                      "GROUP",
                    )
                  : onSelectConversation(conversation.contact.id, "USER")
              }
            >
              <div className="relative">
                <Avatar className="h-12 w-12 border">
                  {conversation.type === "GROUP" ? (
                    <>
                      <AvatarImage
                        src={conversation.group?.avatarUrl || undefined}
                        className="object-cover"
                      />
                      <AvatarFallback>
                        {conversation.group?.name?.slice(0, 2).toUpperCase() ||
                          "GR"}
                      </AvatarFallback>
                    </>
                  ) : (
                    <>
                      <AvatarImage
                        src={
                          conversation.contact.userInfo?.profilePictureUrl ||
                          undefined
                        }
                        className="object-cover"
                      />
                      <AvatarFallback>
                        {getUserInitials(conversation.contact)}
                      </AvatarFallback>
                    </>
                  )}
                </Avatar>
                {/* Online status indicator - only for user conversations */}
                {conversation.type === "USER" &&
                  conversation.contact.online && (
                    <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 border-2 border-white"></span>
                  )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center">
                  <p className="font-medium truncate">
                    {conversation.type === "GROUP"
                      ? conversation.group?.name || "Nhóm chat"
                      : getUserDisplayName(conversation.contact)}
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
                {conversation.isTyping ? (
                  <p className="text-sm text-blue-500 truncate flex items-center">
                    Đang nhập
                    <span className="ml-1 flex">
                      <span className="animate-bounce mx-0.5 delay-0">.</span>
                      <span className="animate-bounce mx-0.5 delay-100">.</span>
                      <span className="animate-bounce mx-0.5 delay-200">.</span>
                    </span>
                  </p>
                ) : conversation.lastMessage ? (
                  <p className="text-sm text-gray-500 truncate">
                    {conversation.lastMessage.recalled
                      ? "Tin nhắn đã được thu hồi"
                      : conversation.lastMessage.content.text ||
                        (conversation.lastMessage.content.media?.length
                          ? "[Hình ảnh/Tệp đính kèm]"
                          : "")}
                  </p>
                ) : conversation.type === "USER" &&
                  conversation.contact.userInfo?.statusMessage ? (
                  <p className="text-sm text-gray-500 truncate">
                    {conversation.contact.userInfo.statusMessage}
                  </p>
                ) : conversation.type === "GROUP" ? (
                  <p className="text-sm text-gray-500 truncate">Nhóm chat</p>
                ) : null}
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
