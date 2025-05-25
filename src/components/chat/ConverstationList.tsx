"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatMessageTime } from "@/utils/dateUtils";
import { getUserInitials, getUserDisplayName } from "@/utils/userUtils";
import { useConversationsStore } from "@/stores/conversationsStore";
import { useChatStore } from "@/stores/chatStore";
import { useAuthStore } from "@/stores/authStore";
import SearchHeader from "../SearchHeader";
import { Media } from "@/types/base";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface ContactListProps {
  onSelectContact: (contactId: string | null) => void;
  onSelectGroup: (groupId: string | null) => void;
}

// Helper function to format the last message media for display
const formatLastMessageMedia = (media: Media[]) => {
  if (!media || media.length === 0) return "";

  // Count media types
  const imageCount = media.filter((m) => m.type === "IMAGE").length;
  const videoCount = media.filter((m) => m.type === "VIDEO").length;
  const audioCount = media.filter((m) => m.type === "AUDIO").length;
  const documentCount = media.filter(
    (m) => m.type !== "IMAGE" && m.type !== "VIDEO" && m.type !== "AUDIO",
  ).length;

  // Format based on media types present
  if (audioCount > 0) {
    if (audioCount === media.length) {
      return audioCount === 1 ? "[Âm thanh]" : `[${audioCount} âm thanh]`;
    }
  }

  if (
    imageCount > 0 &&
    videoCount === 0 &&
    audioCount === 0 &&
    documentCount === 0
  ) {
    return imageCount === 1 ? "[Hình ảnh]" : `[${imageCount} hình ảnh]`;
  }

  if (
    videoCount > 0 &&
    imageCount === 0 &&
    audioCount === 0 &&
    documentCount === 0
  ) {
    return videoCount === 1 ? "[Video]" : `[${videoCount} video]`;
  }

  if (
    documentCount > 0 &&
    imageCount === 0 &&
    videoCount === 0 &&
    audioCount === 0
  ) {
    return documentCount === 1
      ? "[Tệp đính kèm]"
      : `[${documentCount} tệp đính kèm]`;
  }

  // Mixed media types
  return "[Đa phương tiện]";
};

export default function ContactList({
  onSelectContact,
  onSelectGroup,
}: ContactListProps) {
  const { selectedContact, selectedGroup, currentChatType } = useChatStore();
  const currentUser = useAuthStore((state) => state.user);
  const {
    isLoading,
    // searchQuery, setSearchQuery,
    getFilteredConversations,
    loadConversations,
  } = useConversationsStore();

  // Function to refresh conversations
  const refreshConversations = () => {
    if (currentUser?.id) {
      toast.info("Đang làm mới danh sách cuộc trò chuyện...");
      loadConversations(currentUser.id)
        .then(() => {
          toast.success("Đã làm mới danh sách cuộc trò chuyện");
        })
        .catch((error) => {
          console.error("Failed to refresh conversations:", error);
          toast.error("Không thể làm mới danh sách cuộc trò chuyện");
        });
    }
  };

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
      <div className="flex items-center justify-between w-full border-r-0 border-b h-[69px]">
        <SearchHeader className="flex-1 border-none" />
        <Button
          variant="ghost"
          size="icon"
          className="mr-2"
          onClick={refreshConversations}
          title="Làm mới danh sách cuộc trò chuyện"
        >
          <RefreshCw className="h-5 w-5" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {isLoading ? (
          <div className="flex justify-center items-center h-20">
            <p className="text-gray-500">Đang tải danh sách người dùng...</p>
          </div>
        ) : filteredConversations.length > 0 ? (
          filteredConversations.map((conversation) => {
            // Determine if this is a user or group conversation
            const isGroupConversation = conversation.type === "GROUP";
            const isSelected = isGroupConversation
              ? selectedGroup?.id === conversation.group?.id &&
                currentChatType === "GROUP"
              : selectedContact?.id === conversation.contact.id &&
                currentChatType === "USER";

            return (
              <div
                key={
                  isGroupConversation
                    ? `group-${conversation.group?.id}`
                    : `user-${conversation.contact.id}`
                }
                className={`flex items-center gap-3 p-3 hover:bg-gray-100 cursor-pointer ${
                  isSelected ? "bg-blue-50" : ""
                }`}
                onClick={() => {
                  if (isGroupConversation && conversation.group) {
                    onSelectGroup(conversation.group.id);
                  } else {
                    onSelectContact(conversation.contact.id);
                  }
                }}
              >
                <div className="relative">
                  <Avatar className="h-12 w-12 border">
                    <AvatarImage
                      src={
                        isGroupConversation
                          ? conversation.group?.avatarUrl || ""
                          : conversation.contact.userInfo?.profilePictureUrl ||
                            ""
                      }
                      className="object-cover"
                    />
                    <AvatarFallback>
                      {isGroupConversation
                        ? conversation.group?.name
                            ?.substring(0, 2)
                            .toUpperCase() || "GP"
                        : getUserInitials(conversation.contact)}
                    </AvatarFallback>
                  </Avatar>
                  {/* Online status indicator - only for user conversations */}
                  {!isGroupConversation && (
                    <>
                      {conversation.contact.online ? (
                        <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 border-2 border-white"></span>
                      ) : conversation.contact.userInfo?.lastSeen ? (
                        <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-gray-300 border-2 border-white"></span>
                      ) : null}
                    </>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center">
                      <p className="font-medium truncate">
                        {isGroupConversation
                          ? conversation.group?.name
                          : getUserDisplayName(conversation.contact)}
                      </p>
                    </div>
                    <div className="flex items-center">
                      {conversation.lastMessage && (
                        <span className="text-xs text-gray-500 whitespace-nowrap ml-1">
                          {formatMessageTime(
                            conversation.lastMessage.createdAt,
                          )}
                        </span>
                      )}
                      {conversation.unreadCount > 0 && (
                        <span className="bg-blue-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center ml-1">
                          {conversation.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                  {conversation.isTyping ? (
                    <p className="text-sm text-blue-500 truncate flex items-center">
                      {isGroupConversation &&
                      conversation.typingUsers &&
                      conversation.typingUsers.length > 0 ? (
                        <>
                          {conversation.typingUsers[0].fullName} đang nhập
                          {conversation.typingUsers.length > 1 &&
                            ` và ${conversation.typingUsers.length - 1} người khác`}
                        </>
                      ) : (
                        "Đang nhập"
                      )}
                      <span className="ml-1 flex">
                        <span className="animate-bounce mx-0.5 delay-0">.</span>
                        <span className="animate-bounce mx-0.5 delay-100">
                          .
                        </span>
                        <span className="animate-bounce mx-0.5 delay-200">
                          .
                        </span>
                      </span>
                    </p>
                  ) : conversation.lastMessage ? (
                    <p className="text-sm text-gray-500 truncate">
                      {conversation.lastMessage.recalled
                        ? "Tin nhắn đã được thu hồi"
                        : // Add prefix based on sender
                          (isGroupConversation &&
                          conversation.lastMessage.senderId !== currentUser?.id
                            ? (() => {
                                // Try to find sender in group members
                                const sender =
                                  conversation.group?.memberUsers?.find(
                                    (member) =>
                                      member.id ===
                                      conversation.lastMessage?.senderId,
                                  );
                                return (
                                  (sender?.fullName || "Thành viên") + ": "
                                );
                              })()
                            : conversation.lastMessage.senderId ===
                                currentUser?.id
                              ? "Bạn: "
                              : "") +
                          (conversation.lastMessage.content.text ||
                            (conversation.lastMessage.content.media?.length
                              ? formatLastMessageMedia(
                                  conversation.lastMessage.content.media,
                                )
                              : ""))}
                    </p>
                  ) : isGroupConversation ? (
                    <p className="text-sm text-gray-500 truncate">Nhóm chat</p>
                  ) : conversation.contact.userInfo?.statusMessage ? (
                    <p className="text-sm text-gray-500 truncate">
                      {conversation.contact.userInfo.statusMessage}
                    </p>
                  ) : null}
                </div>
              </div>
            );
          })
        ) : (
          <div className="flex justify-center items-center h-20">
            <p className="text-gray-500">Không tìm thấy người dùng nào</p>
          </div>
        )}
      </div>
    </div>
  );
}
