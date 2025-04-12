"use client";

import { useEffect, useRef } from "react";
import { Message, User, UserInfo } from "@/types/base";
import ChatHeader from "./ChatHeader";
import MessageItem from "./MessageItem";
import MessageInput from "./MessageInput";
import MessageDetailDialog from "./MessageDetailDialog";
import ChatMessagesDropZone from "./ChatMessagesDropZone";
import { formatMessageDate } from "@/utils/dateUtils";
import { useChatStore } from "@/stores/chatStore";
import { useConversationsStore } from "@/stores/conversationsStore";
import { getUserDataById } from "@/actions/user.action";

interface ChatAreaProps {
  currentUser: User;
  onToggleInfo: () => void;
}

export default function ChatArea({ currentUser, onToggleInfo }: ChatAreaProps) {
  const {
    messages,
    selectedContact,
    replyingTo,
    selectedMessage,
    isDialogOpen,
    setReplyingTo,
    setSelectedMessage,
    setIsDialogOpen,
    sendMessage,
  } = useChatStore();

  const { markAsRead, updateLastMessage } = useConversationsStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch complete user data and mark messages as read when viewing a conversation
  useEffect(() => {
    if (selectedContact?.id) {
      markAsRead(selectedContact.id);

      // Fetch complete user data to ensure we have userInfo
      const fetchCompleteUserData = async () => {
        try {
          const result = await getUserDataById(selectedContact.id);
          if (result.success && result.user) {
            // Update the selected contact with complete user data
            const { setSelectedContact } = useChatStore.getState();
            // Ensure userInfo exists
            const user = result.user;
            if (!user.userInfo) {
              user.userInfo = {
                id: user.id,
                fullName: user.email || user.phoneNumber || "Unknown",
                profilePictureUrl: null,
                statusMessage: "No status",
                blockStrangers: false,
                createdAt: new Date(),
                updatedAt: new Date(),
                userAuth: user,
              };
            }
            setSelectedContact(user as User & { userInfo: UserInfo });
          }
        } catch (error) {
          console.error("Error fetching complete user data:", error);
        }
      };

      fetchCompleteUserData();
    }
  }, [selectedContact?.id, markAsRead]);

  useEffect(() => {
    // Scroll to bottom when messages change
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });

    // Update last message in conversations list when messages change
    if (messages.length > 0 && selectedContact) {
      const lastMessage = messages[messages.length - 1];
      updateLastMessage(selectedContact.id, lastMessage);
    }
  }, [messages, selectedContact, updateLastMessage]);

  // Scroll to bottom when component mounts
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
  }, []);

  const handleReply = (message: Message) => {
    setReplyingTo(message);
  };

  const handleMessageClick = (message: Message) => {
    // Hiển thị chi tiết tin nhắn trong dialog khi click vào tin nhắn
    console.log("Message clicked:", message);

    // Chỉ mở dialog khi tin nhắn có media
    if (
      message.content.media?.length ||
      message.content.image ||
      message.content.video
    ) {
      setSelectedMessage(message);
      setIsDialogOpen(true);
    } else if (message.content.text) {
      // Nếu chỉ có text thì hiển thị toast
    }
  };

  const handleCancelReply = () => {
    setReplyingTo(null);
  };

  const handleSendMessage = (text: string, files?: File[]) => {
    sendMessage(text, files, currentUser);
  };

  // Group messages by date
  const groupMessagesByDate = () => {
    const groups: { date: string; messages: Message[] }[] = [];
    let currentDate = "";
    let currentGroup: Message[] = [];

    messages.forEach((message) => {
      // Use our utility function to format the date
      const messageDate = formatMessageDate(message.createdAt);

      if (messageDate !== currentDate) {
        if (currentGroup.length > 0) {
          groups.push({ date: currentDate, messages: currentGroup });
        }
        currentDate = messageDate;
        currentGroup = [message];
      } else {
        currentGroup.push(message);
      }
    });

    if (currentGroup.length > 0) {
      groups.push({ date: currentDate, messages: currentGroup });
    }

    return groups;
  };

  // Group messages by sender (to avoid showing avatar for consecutive messages)
  const processMessagesForDisplay = (messages: Message[]) => {
    return messages.map((message, index, array) => {
      const isCurrentUser = message.senderId === currentUser.id;
      const prevMessage = index > 0 ? array[index - 1] : null;
      const showAvatar =
        !prevMessage || prevMessage.senderId !== message.senderId;

      return { message, isCurrentUser, showAvatar };
    });
  };

  const messageGroups = groupMessagesByDate();

  return (
    <div className="flex flex-col h-full w-full">
      <ChatHeader contact={selectedContact} onToggleInfo={onToggleInfo} />

      <ChatMessagesDropZone
        onFileDrop={(files) => handleSendMessage("", files)}
      >
        <div className="overflow-y-auto overflow-x-hidden bg-gray-50 p-4 custom-scrollbar h-full">
          {selectedContact ? (
            messageGroups.length > 0 ? (
              messageGroups.map((group, groupIndex) => (
                <div key={groupIndex} className="mb-4">
                  <div className="flex justify-center mb-4">
                    <div className="bg-white px-3 py-1 rounded-full text-xs text-gray-500 shadow-sm">
                      {group.date}
                    </div>
                  </div>

                  {processMessagesForDisplay(group.messages).map(
                    ({ message, isCurrentUser, showAvatar }) => (
                      <MessageItem
                        key={message.id}
                        message={message}
                        isCurrentUser={isCurrentUser}
                        showAvatar={showAvatar}
                        onReply={handleReply}
                        onMessageClick={handleMessageClick}
                      />
                    ),
                  )}
                </div>
              ))
            ) : (
              <div className="h-full flex items-center justify-center">
                <p className="text-gray-500">
                  Chưa có tin nhắn nào. Hãy bắt đầu cuộc trò chuyện!
                </p>
              </div>
            )
          ) : (
            <div className="h-full flex items-center justify-center">
              <p className="text-gray-500">
                Chọn một liên hệ để bắt đầu trò chuyện
              </p>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </ChatMessagesDropZone>

      <MessageInput
        onSendMessage={handleSendMessage}
        disabled={!selectedContact}
        replyingTo={replyingTo}
        onCancelReply={handleCancelReply}
      />

      {/* Dialog hiển thị chi tiết tin nhắn */}
      <MessageDetailDialog
        message={selectedMessage}
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
      />
    </div>
  );
}
