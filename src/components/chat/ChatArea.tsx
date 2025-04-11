"use client";

import { useEffect, useRef, useState } from "react";
import { Message, MessageType, User, UserInfo } from "@/types/base";
import ChatHeader from "./ChatHeader";
import MessageItem from "./MessageItem";
import MessageInput from "./MessageInput";
import MessageDetailDialog from "./MessageDetailDialog";
import {
  getMessagesBetweenUsers,
  sendTextMessage,
  sendMediaMessage,
} from "@/actions/message.action";
import { formatMessageDate } from "@/utils/dateUtils";
import { toast } from "sonner";

interface ChatAreaProps {
  currentUser: User;
  selectedContact: (User & { userInfo: UserInfo }) | null;
  onToggleInfo: () => void;
}

export default function ChatArea({
  currentUser,
  selectedContact,
  onToggleInfo,
}: ChatAreaProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selectedContact) {
      // Load messages for the selected contact from API
      const fetchMessages = async () => {
        try {
          const result = await getMessagesBetweenUsers(selectedContact.id);
          if (result.success && result.messages) {
            // Sắp xếp tin nhắn theo thời gian tạo, từ cũ đến mới
            const sortedMessages = [...result.messages].sort((a, b) => {
              return (
                new Date(a.createdAt).getTime() -
                new Date(b.createdAt).getTime()
              );
            });
            setMessages(sortedMessages);

            // Cuộn xuống cuối sau khi tin nhắn được tải
            setTimeout(() => {
              messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
            }, 100);
          } else {
            setMessages([]);
          }
        } catch (error) {
          console.error("Error fetching messages:", error);
          setMessages([]);
        }
      };

      fetchMessages();
    } else {
      setMessages([]);
    }
  }, [selectedContact]);

  useEffect(() => {
    // Scroll to bottom when messages change
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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
      toast.info("Xem chi tiết tin nhắn: " + message.content.text);
    }
  };

  const handleCancelReply = () => {
    setReplyingTo(null);
  };

  const handleSendMessage = async (text: string, files?: File[]) => {
    if (
      !selectedContact ||
      (!text.trim() && !files?.length) ||
      !currentUser ||
      !currentUser.id
    ) {
      console.error(
        "Cannot send message: Missing contact, message text, or current user",
      );
      return;
    }

    // Create a temporary message to show immediately
    const tempMessage: Message = {
      id: `temp-${Date.now()}`,
      content: {
        text,
        // Add placeholder for files if they exist
        media: files?.map((file) => ({
          url: URL.createObjectURL(file),
          type: file.type.startsWith("image/")
            ? "IMAGE"
            : file.type.startsWith("video/")
              ? "VIDEO"
              : "DOCUMENT",
          fileId: `temp-${Date.now()}-${file.name}`,
          fileName: file.name,
          metadata: {
            path: "",
            size: file.size,
            mimeType: file.type,
            extension: file.name.split(".").pop() || "",
            bucketName: "",
            uploadedAt: new Date().toISOString(),
            sizeFormatted: `${Math.round(file.size / 1024)} KB`,
          },
          thumbnailUrl: file.type.startsWith("image/")
            ? URL.createObjectURL(file)
            : undefined,
        })),
      },
      senderId: currentUser.id,
      sender: currentUser,
      receiverId: selectedContact.id,
      receiver: selectedContact,
      recalled: false,
      deletedBy: [],
      reactions: [],
      readBy: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      messageType: MessageType.USER,
      repliedTo: replyingTo?.id,
    };

    // Add temporary message to UI - đảm bảo tin nhắn mới được thêm vào cuối danh sách
    setMessages((prev) => [...prev, tempMessage]);

    // Cuộn xuống cuối ngay lập tức sau khi gửi tin nhắn
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 50);

    try {
      // Send message to API
      let result;
      if (files && files.length > 0) {
        // Use sendMediaMessage if we have files
        result = await sendMediaMessage(selectedContact.id, text, files);
      } else {
        // Use sendTextMessage if we only have text
        result = await sendTextMessage(selectedContact.id, text);
      }

      if (result.success && result.message) {
        // Replace temporary message with real one from server
        setMessages((prev) =>
          prev.map((msg) => (msg.id === tempMessage.id ? result.message : msg)),
        );
      } else {
        // If sending failed, mark the message as failed
        console.error("Failed to send message:", result.error);
        // You could add error handling here, like marking the message as failed
      }
    } catch (error) {
      console.error("Error sending message:", error);
      // Handle error, maybe mark the message as failed
    }

    // Clear reply state
    setReplyingTo(null);
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

      <div className="flex-1 overflow-y-auto overflow-x-hidden bg-gray-50 p-4 custom-scrollbar">
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
