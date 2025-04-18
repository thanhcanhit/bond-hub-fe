"use client";

import { useEffect, useRef, useState } from "react";
import { Message, User, UserInfo } from "@/types/base";
import ChatHeader from "./ChatHeader";
import GroupChatHeader from "./GroupChatHeader";
import MessageItem from "./MessageItem";
import MessageInput from "./MessageInput";
import MessageDetailDialog from "./MessageDetailDialog";
import ChatMessagesDropZone from "./ChatMessagesDropZone";
import TypingIndicator from "./TypingIndicator";
import { formatMessageDate } from "@/utils/dateUtils";
import { useChatStore } from "@/stores/chatStore";
import { useConversationsStore } from "@/stores/conversationsStore";
import { useNotificationStore } from "@/stores/notificationStore";
import { getUserDataById } from "@/actions/user.action";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface ChatAreaProps {
  currentUser: User;
  onToggleInfo: () => void;
}

export default function ChatArea({ currentUser, onToggleInfo }: ChatAreaProps) {
  const {
    messages,
    selectedContact,
    selectedGroup,
    currentChatType,
    replyingTo,
    selectedMessage,
    isDialogOpen,
    searchText,
    searchResults,
    isSearching,
    isLoading,
    isLoadingOlder,
    hasMoreMessages,
    clearSearch,
    setReplyingTo,
    setSelectedMessage,
    setIsDialogOpen,
    sendMessage,
    loadOlderMessages,
  } = useChatStore();

  const { markAsRead, updateLastMessage, conversations } =
    useConversationsStore();
  const { resetUnread } = useNotificationStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const [isTyping, setIsTyping] = useState(false);

  // Fetch complete user data and mark messages as read when viewing a conversation
  useEffect(() => {
    if (currentChatType === "USER" && selectedContact?.id) {
      markAsRead(selectedContact.id);

      // Reset global unread count
      resetUnread();

      // Fetch complete user data to ensure we have userInfo
      const fetchCompleteUserData = async () => {
        try {
          const result = await getUserDataById(selectedContact.id);
          if (result.success && result.user) {
            // Get the current selected contact to make sure it hasn't changed
            const currentSelectedContact =
              useChatStore.getState().selectedContact;

            // Only update if the selected contact is still the same
            if (currentSelectedContact?.id === selectedContact.id) {
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
            } else {
              console.log(
                `[ChatArea] Selected contact changed while fetching data, skipping update`,
              );
            }
          }
        } catch (error) {
          console.error("Error fetching complete user data:", error);
        }
      };

      fetchCompleteUserData();
    }
  }, [selectedContact?.id, markAsRead, resetUnread, currentChatType]);

  // Keep track of previous messages to detect what changed
  const prevMessagesRef = useRef<Message[]>([]);

  useEffect(() => {
    // Skip if no messages or no selected contact
    if (!messages.length || !selectedContact) {
      prevMessagesRef.current = [];
      return;
    }

    console.log(
      `[ChatArea] Messages updated for contact: ${selectedContact.id}, count: ${messages.length}`,
    );

    // Only scroll to bottom when a new message is added, not when reactions change
    const shouldScrollToBottom = () => {
      // If message count changed, it's a new message
      if (prevMessagesRef.current.length !== messages.length) {
        return true;
      }

      // If the last message ID changed, it's a new message
      if (messages.length > 0 && prevMessagesRef.current.length > 0) {
        const lastMessageId = messages[messages.length - 1].id;
        const prevLastMessageId =
          prevMessagesRef.current[prevMessagesRef.current.length - 1].id;
        return lastMessageId !== prevLastMessageId;
      }

      return false;
    };

    // Only scroll if it's a new message, not a reaction update
    if (shouldScrollToBottom()) {
      console.log(`[ChatArea] Scrolling to bottom for new message`);
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }

    // Update last message in conversations list when messages change
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (currentChatType === "USER" && selectedContact) {
        const currentSelectedContact = useChatStore.getState().selectedContact;
        if (currentSelectedContact?.id === selectedContact.id) {
          updateLastMessage(selectedContact.id, lastMessage);
        }
      } else if (currentChatType === "GROUP" && selectedGroup) {
        // Update last message for group conversation
        // This would need to be implemented in the conversationsStore
      }
    }

    // Update the previous messages reference
    prevMessagesRef.current = [...messages];
  }, [messages, selectedContact, updateLastMessage]);

  // Scroll to bottom when component mounts or when selected contact changes
  useEffect(() => {
    if (selectedContact && !isLoading && messages.length > 0) {
      console.log(
        `[ChatArea] Scrolling to bottom for contact: ${selectedContact.id}`,
      );
      messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
    }
  }, [selectedContact?.id, isLoading, messages.length]);

  // Handle scroll event to load older messages
  useEffect(() => {
    const chatContainer = chatContainerRef.current;
    if (!chatContainer || !selectedContact) return;

    console.log(
      `[ChatArea] Setting up scroll handler for contact: ${selectedContact.id}`,
    );

    const handleScroll = () => {
      // Check if user has scrolled near the top (within 50px from top)
      if (chatContainer.scrollTop < 50 && !isLoadingOlder && hasMoreMessages) {
        console.log(
          `[ChatArea] Near top of scroll, loading older messages for: ${selectedContact.id}`,
        );

        // Save current scroll position and height
        const scrollHeight = chatContainer.scrollHeight;
        const scrollPosition = chatContainer.scrollTop;

        // Store the current contact ID to verify it doesn't change during loading
        const currentContactId = selectedContact.id;

        // Load older messages
        loadOlderMessages().then((success) => {
          if (!success) {
            console.log(
              `[ChatArea] Failed to load older messages or no more messages`,
            );
            return;
          }

          // After loading, restore relative scroll position
          // Wait a bit for DOM to update
          setTimeout(() => {
            // Verify the contact hasn't changed during loading
            const currentSelectedContact =
              useChatStore.getState().selectedContact;
            if (currentSelectedContact?.id !== currentContactId) {
              console.log(
                `[ChatArea] Contact changed during loading, skipping scroll adjustment`,
              );
              return;
            }

            if (chatContainerRef.current) {
              // Calculate new scroll position based on height difference
              const newScrollHeight = chatContainerRef.current.scrollHeight;
              const heightDifference = newScrollHeight - scrollHeight;
              chatContainerRef.current.scrollTop =
                scrollPosition + heightDifference;
              console.log(
                `[ChatArea] Adjusted scroll position after loading older messages`,
              );
            }
          }, 100);
        });
      }
    };

    chatContainer.addEventListener("scroll", handleScroll);
    return () => {
      chatContainer.removeEventListener("scroll", handleScroll);
    };
  }, [isLoadingOlder, hasMoreMessages, loadOlderMessages, selectedContact]);

  // Track typing status from conversationsStore
  useEffect(() => {
    if (currentChatType !== "USER" || !selectedContact) {
      setIsTyping(false);
      return;
    }

    console.log(
      `[ChatArea] Setting up typing indicator for contact: ${selectedContact.id}`,
    );

    // Check initial typing status
    const conversation = conversations.find(
      (conv) => conv.contact.id === selectedContact.id,
    );
    if (conversation) {
      setIsTyping(!!conversation.isTyping);
    } else {
      setIsTyping(false);
    }

    // Subscribe to changes
    const unsubscribe = useConversationsStore.subscribe((state) => {
      // Get the current selected contact to make sure it hasn't changed
      const currentSelectedContact = useChatStore.getState().selectedContact;
      if (
        !currentSelectedContact ||
        currentSelectedContact.id !== selectedContact.id
      ) {
        // If contact has changed, don't update typing status
        return;
      }

      const updatedConversation = state.conversations.find(
        (conv) => conv.contact.id === selectedContact.id,
      );
      if (updatedConversation) {
        setIsTyping(!!updatedConversation.isTyping);
      } else {
        setIsTyping(false);
      }
    });

    return () => {
      unsubscribe();
      // Reset typing status when unmounting or changing contact
      setIsTyping(false);
    };
  }, [selectedContact?.id, conversations, currentChatType]);

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

      // Ensure we have userInfo for the sender
      const userInfo =
        message.sender?.userInfo ||
        (currentChatType === "USER" ? selectedContact?.userInfo : null);

      return { message, isCurrentUser, showAvatar, userInfo };
    });
  };

  const messageGroups = groupMessagesByDate();

  // Process messages or search results for display
  const renderMessageContent = () => {
    // If we're searching, display search results
    if (searchText && searchResults.length > 0) {
      return (
        <div className="mb-4">
          <div className="sticky top-0 bg-blue-50 p-2 rounded-md flex justify-between items-center mb-4 z-10">
            <div className="text-sm text-blue-700">
              Kết quả tìm kiếm: {searchResults.length} tin nhắn
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-blue-700 hover:bg-blue-100"
              onClick={clearSearch}
            >
              <X className="h-4 w-4 mr-1" />
              Đóng
            </Button>
          </div>

          {processMessagesForDisplay(searchResults).map(
            ({ message, isCurrentUser, showAvatar, userInfo }) => (
              <MessageItem
                key={message.id}
                message={message}
                isCurrentUser={isCurrentUser}
                showAvatar={showAvatar}
                onReply={handleReply}
                onMessageClick={handleMessageClick}
                highlight={searchText}
                userInfo={userInfo}
              />
            ),
          )}
        </div>
      );
    }

    // Otherwise show normal messages grouped by date
    return messageGroups.length > 0 ? (
      messageGroups.map((group, groupIndex) => (
        <div key={groupIndex} className="mb-4">
          <div className="flex justify-center mb-4">
            <div className="bg-white px-3 py-1 rounded-full text-xs text-gray-500 shadow-sm">
              {group.date}
            </div>
          </div>

          {processMessagesForDisplay(group.messages).map(
            ({ message, isCurrentUser, showAvatar, userInfo }) => (
              <MessageItem
                key={message.id}
                message={message}
                isCurrentUser={isCurrentUser}
                showAvatar={showAvatar}
                onReply={handleReply}
                onMessageClick={handleMessageClick}
                userInfo={userInfo}
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
    );
  };

  return (
    <div className="flex flex-col h-full w-full">
      {currentChatType === "USER" ? (
        <ChatHeader contact={selectedContact} onToggleInfo={onToggleInfo} />
      ) : (
        <GroupChatHeader group={selectedGroup} onToggleInfo={onToggleInfo} />
      )}

      <ChatMessagesDropZone
        onFileDrop={(files) => handleSendMessage("", files)}
      >
        <div
          ref={chatContainerRef}
          className="overflow-y-auto overflow-x-hidden bg-gray-50 p-4 custom-scrollbar h-full"
        >
          {selectedContact ? (
            isLoading ? (
              <div className="h-full flex items-center justify-center">
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 border-4 border-t-blue-500 border-b-blue-300 border-l-blue-300 border-r-blue-300 rounded-full animate-spin mb-2"></div>
                  <p className="text-gray-500">Đang tải tin nhắn...</p>
                </div>
              </div>
            ) : (
              <>
                {isLoadingOlder && (
                  <div className="flex justify-center mb-4">
                    <div className="flex items-center text-xs text-gray-500">
                      <div className="w-4 h-4 border-2 border-t-blue-500 border-b-blue-300 border-l-blue-300 border-r-blue-300 rounded-full animate-spin mr-2"></div>
                      Đang tải tin nhắn cũ hơn...
                    </div>
                  </div>
                )}
                {renderMessageContent()}
              </>
            )
          ) : (
            <div className="h-full flex items-center justify-center">
              <p className="text-gray-500">
                Chọn một liên hệ hoặc nhóm để bắt đầu trò chuyện
              </p>
            </div>
          )}
          {currentChatType === "USER" && selectedContact && isTyping && (
            <TypingIndicator contact={selectedContact} isTyping={isTyping} />
          )}
          <div ref={messagesEndRef} />
        </div>
      </ChatMessagesDropZone>

      <MessageInput
        onSendMessage={handleSendMessage}
        disabled={(!selectedContact && !selectedGroup) || isSearching}
        replyingTo={replyingTo}
        onCancelReply={handleCancelReply}
      />

      {/* Dialog hiển thị chi tiết tin nhắn */}
      <MessageDetailDialog
        message={selectedMessage}
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        userInfo={
          selectedMessage?.sender?.userInfo ||
          (currentChatType === "USER" ? selectedContact?.userInfo : null)
        }
      />
    </div>
  );
}
