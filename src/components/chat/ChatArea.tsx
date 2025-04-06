"use client";

import { useEffect, useRef, useState } from "react";
import { Message, MessageType, User, UserInfo } from "@/types/base";
import ChatHeader from "./ChatHeader";
import MessageItem from "./MessageItem";
import MessageInput from "./MessageInput";
import { mockMessages } from "@/data/mockData";
import { v4 as uuidv4 } from "uuid";

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
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selectedContact) {
      // Load messages for the selected contact
      setMessages(mockMessages[selectedContact.id] || []);
    } else {
      setMessages([]);
    }
  }, [selectedContact]);

  useEffect(() => {
    // Scroll to bottom when messages change
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleReply = (message: Message) => {
    setReplyingTo(message);
  };

  const handleCancelReply = () => {
    setReplyingTo(null);
  };

  const handleSendMessage = (text: string) => {
    if (!selectedContact) return;

    const newMessage: Message = {
      id: uuidv4(),
      content: { text },
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

    setMessages((prev) => [...prev, newMessage]);

    // Update mock data (in a real app, this would be an API call)
    if (!mockMessages[selectedContact.id]) {
      mockMessages[selectedContact.id] = [];
    }
    mockMessages[selectedContact.id].push(newMessage);

    // Clear reply state after sending
    setReplyingTo(null);
  };

  // Group messages by date
  const groupMessagesByDate = () => {
    const groups: { date: string; messages: Message[] }[] = [];
    let currentDate = "";
    let currentGroup: Message[] = [];

    messages.forEach((message) => {
      const messageDate = message.createdAt.toLocaleDateString("vi-VN");

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

      <div className="flex-1 overflow-y-auto bg-gray-50 p-4 custom-scrollbar">
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
    </div>
  );
}
