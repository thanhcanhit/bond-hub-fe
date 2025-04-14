"use client";

import { useEffect, useCallback } from "react";
import { Socket } from "socket.io-client";
import { useChatStore } from "@/stores/chatStore";
import { useConversationsStore } from "@/stores/conversationsStore";
import { useAuthStore } from "@/stores/authStore";
import { useNotificationStore } from "@/stores/notificationStore";
import { Message, Reaction } from "@/types/base";
import { useSocket } from "@/providers/SocketChatProvider";
import { useNotificationSound } from "@/hooks/useNotificationSound";

// Extend Window interface to include our socket and message tracking
declare global {
  interface Window {
    messageSocket: Socket | null;
    sentMessageIds?: Set<string>; // Lưu trữ cả ID và khóa tin nhắn (ID|content|senderId)
  }
}

// Define types for socket events
interface MessageEventData {
  type: "user" | "group";
  message: Message;
  timestamp: Date;
}

interface MessageReadEventData {
  messageId: string;
  readBy: string[];
  userId: string;
  timestamp: Date;
}

interface MessageRecalledEventData {
  messageId: string;
  userId: string;
  timestamp: Date;
}

interface MessageReactionEventData {
  messageId: string;
  reactions: Reaction[];
  userId: string;
  timestamp: Date;
}

interface UserTypingEventData {
  userId: string;
  receiverId?: string;
  groupId?: string;
  timestamp: Date;
}

interface UserStatusEventData {
  userId: string;
  status: "online" | "offline";
  timestamp: Date;
}

export default function ChatSocketHandler() {
  const { messageSocket } = useSocket();
  const currentUser = useAuthStore((state) => state.user);
  const { selectedContact, selectedGroup, currentChatType, messages } =
    useChatStore();
  const { conversations } = useConversationsStore();

  // Sử dụng hook để phát âm thanh thông báo
  const playNotificationSound = useNotificationSound();

  // Sử dụng store để quản lý số lượng tin nhắn chưa đọc
  const { incrementUnread: incrementGlobalUnread, resetUnread } =
    useNotificationStore();

  // Function to ensure message sender has userInfo
  const ensureMessageHasUserInfo = useCallback(
    (message: Message) => {
      if (message.sender) {
        // If sender is current user, always use current user's userInfo
        if (message.senderId === currentUser?.id) {
          message.sender = {
            ...currentUser,
            userInfo: currentUser.userInfo,
          };
        }
        // If sender is selected contact, always use selected contact's data
        else if (selectedContact && message.senderId === selectedContact.id) {
          message.sender = {
            ...selectedContact,
            userInfo: selectedContact.userInfo,
          };
        }
        // If sender doesn't have userInfo or has incomplete userInfo
        else if (
          !message.sender.userInfo ||
          !message.sender.userInfo.fullName
        ) {
          // Create a fallback userInfo
          message.sender.userInfo = {
            id: message.sender.id,
            fullName:
              message.sender.userInfo?.fullName ||
              message.sender.email ||
              message.sender.phoneNumber ||
              "Unknown",
            profilePictureUrl:
              message.sender.userInfo?.profilePictureUrl || null,
            statusMessage:
              message.sender.userInfo?.statusMessage || "No status",
            blockStrangers: message.sender.userInfo?.blockStrangers || false,
            createdAt: message.sender.userInfo?.createdAt || new Date(),
            updatedAt: message.sender.userInfo?.updatedAt || new Date(),
            userAuth: message.sender,
          };
        }
      }
      return message;
    },
    [currentUser, selectedContact],
  );

  // Handle new message event
  const handleNewMessage = useCallback(
    (data: MessageEventData) => {
      console.log("[ChatSocketHandler] New message received:", data);

      const message = ensureMessageHasUserInfo(data.message);
      const conversationsStore = useConversationsStore.getState();
      const chatStore = useChatStore.getState();

      // QUAN TRỌNG: Kiểm tra xem tin nhắn có phải là tin nhắn vừa gửi từ người dùng hiện tại không
      if (message.senderId === currentUser?.id) {
        // Kiểm tra xem tin nhắn đã có trong danh sách tin nhắn chưa (kiểm tra ID chính xác)
        const exactMessageExists = messages.some(
          (msg) => msg.id === message.id,
        );

        if (exactMessageExists) {
          console.log(
            `[ChatSocketHandler] Message with ID ${message.id} already exists in chat, skipping socket event`,
          );
          return;
        }

        // Kiểm tra xem có tin nhắn tạm thời (temp message) có nội dung giống nhau không
        const tempMessages = messages.filter(
          (msg) =>
            msg.id.startsWith("temp-") && // Chỉ kiểm tra tin nhắn tạm thời
            msg.senderId === message.senderId &&
            msg.content.text === message.content.text &&
            Math.abs(
              new Date(msg.createdAt).getTime() -
                new Date(message.createdAt).getTime(),
            ) < 10000, // 10 giây
        );

        if (tempMessages.length > 0) {
          console.log(
            `[ChatSocketHandler] Found ${tempMessages.length} similar temporary messages, replacing with real message`,
          );

          // Đây là trường hợp tin nhắn thật từ server trả về cho tin nhắn tạm thời
          // Thay thế tin nhắn tạm thời đầu tiên tìm thấy bằng tin nhắn thật
          chatStore.updateMessage(tempMessages[0].id, message, {
            notifyConversationStore: true, // Đồng bộ với conversationsStore
            updateCache: true, // Cập nhật cache
          });

          // Xóa các tin nhắn tạm thời khác (nếu có)
          if (tempMessages.length > 1) {
            for (let i = 1; i < tempMessages.length; i++) {
              chatStore.removeMessage(tempMessages[i].id, {
                notifyConversationStore: false, // Không cần đồng bộ với conversationsStore vì đã được xử lý ở trên
              });
            }
          }

          return;
        }

        // Kiểm tra xem tin nhắn này có trong danh sách đã gửi không
        if (typeof window !== "undefined" && window.sentMessageIds) {
          // Tạo khóa tin nhắn để kiểm tra
          const messageKey = `${message.id}|${message.content.text}|${message.senderId}`;

          if (
            window.sentMessageIds.has(messageKey) ||
            window.sentMessageIds.has(message.id)
          ) {
            console.log(
              `[ChatSocketHandler] Message was tracked as sent by current user, skipping socket event`,
            );
            return;
          }
        }

        // Kiểm tra xem tin nhắn đã có trong danh sách tin nhắn chưa (kiểm tra nội dung)
        const similarMessageExists = messages.some(
          (msg) =>
            !msg.id.startsWith("temp-") && // Không phải tin nhắn tạm thời
            msg.senderId === message.senderId &&
            msg.content.text === message.content.text &&
            Math.abs(
              new Date(msg.createdAt).getTime() -
                new Date(message.createdAt).getTime(),
            ) < 5000, // 5 giây
        );

        if (similarMessageExists) {
          console.log(
            `[ChatSocketHandler] Similar message from current user already exists, skipping`,
          );
          return;
        }

        console.log(
          `[ChatSocketHandler] This appears to be a new message from current user: ${message.id}`,
        );
      }

      // Phát âm thanh thông báo và tăng số lượng tin nhắn chưa đọc nếu tin nhắn đến từ người khác
      if (message.senderId !== currentUser?.id) {
        // Kiểm tra xem tin nhắn có phải là tin nhắn mới không
        const messageExists = messages.some((msg) => msg.id === message.id);
        if (!messageExists) {
          console.log(
            `[ChatSocketHandler] Playing notification sound for new message from ${message.senderId}`,
          );
          playNotificationSound();

          // Tăng số lượng tin nhắn chưa đọc toàn cục
          incrementGlobalUnread();
          console.log(`[ChatSocketHandler] Incrementing global unread count`);
        }
      }

      // Kiểm tra xem tin nhắn có thuộc cuộc trò chuyện đang mở không
      const isFromCurrentChat =
        (currentChatType === "USER" &&
          selectedContact &&
          (message.senderId === selectedContact.id ||
            message.receiverId === selectedContact.id)) ||
        (currentChatType === "GROUP" &&
          selectedGroup &&
          message.groupId === selectedGroup.id);

      // Nếu tin nhắn thuộc cuộc trò chuyện đang mở, thêm vào danh sách tin nhắn
      if (isFromCurrentChat) {
        // Kiểm tra xem tin nhắn đã tồn tại trong danh sách chưa
        const messageExists = messages.some((msg) => msg.id === message.id);
        if (!messageExists) {
          console.log(`[ChatSocketHandler] Adding message to current chat`);

          // Sử dụng hàm processNewMessage để xử lý tin nhắn mới
          chatStore.processNewMessage(message, {
            // Không cần đồng bộ với conversationsStore vì sẽ được xử lý riêng
            notifyConversationStore: false,
            // Cập nhật cache
            updateCache: true,
            // Bỏ qua kiểm tra trùng lặp vì đã kiểm tra ở trên
            skipDuplicateCheck: true,
          });

          // Đánh dấu đã đọc nếu tin nhắn từ người khác
          if (message.senderId !== currentUser?.id) {
            chatStore.markMessageAsReadById(message.id);
            // Đặt lại số lượng tin nhắn chưa đọc toàn cục khi đọc tin nhắn
            resetUnread();
          }
        }
      }

      // Xử lý tin nhắn trong conversationsStore
      const shouldMarkAsRead = Boolean(
        currentUser && isFromCurrentChat && message.senderId !== currentUser.id,
      );
      const shouldIncrementUnread = Boolean(
        message.senderId !== currentUser?.id && !isFromCurrentChat,
      );

      conversationsStore.processNewMessage(message, {
        // Tăng số lượng tin nhắn chưa đọc nếu tin nhắn từ người khác và không phải cuộc trò chuyện đang mở
        incrementUnreadCount: shouldIncrementUnread,
        // Đánh dấu đã đọc nếu tin nhắn thuộc cuộc trò chuyện đang mở
        markAsRead: shouldMarkAsRead,
        // Luôn cập nhật lastActivity
        updateLastActivity: true,
      });
    },
    [
      currentUser,
      selectedContact,
      selectedGroup,
      currentChatType,
      messages,
      ensureMessageHasUserInfo,
      playNotificationSound,
      incrementGlobalUnread,
      resetUnread,
    ],
  );

  // Handle message read event
  const handleMessageRead = useCallback(
    (data: MessageReadEventData) => {
      console.log("Message read event:", data);

      // Update the message in the current chat
      const messageToUpdate = messages.find((msg) => msg.id === data.messageId);
      if (messageToUpdate) {
        // Create updated message with new readBy array
        const updatedMessage = {
          ...messageToUpdate,
          readBy: data.readBy,
        };

        // Update in chat store using the utility function
        const chatStore = useChatStore.getState();
        chatStore.updateMessage(data.messageId, updatedMessage, {
          // Đồng bộ với conversationsStore sẽ được xử lý riêng
          notifyConversationStore: false,
        });

        // Use the conversationsStore utility function to update the conversation
        const conversationsStore = useConversationsStore.getState();
        const conversation =
          conversationsStore.findConversationByMessage(updatedMessage);

        if (conversation) {
          // If the current user read the message, mark as read
          const shouldMarkAsRead = data.userId === currentUser?.id;

          conversationsStore.processNewMessage(updatedMessage, {
            incrementUnreadCount: false,
            markAsRead: shouldMarkAsRead,
            updateLastActivity: false, // Don't update lastActivity for read events
          });

          // Đặt lại số lượng tin nhắn chưa đọc toàn cục khi đọc tin nhắn
          if (shouldMarkAsRead) {
            resetUnread();
          }
        }
      }
    },
    [messages, currentUser, resetUnread],
  );

  // Handle message recalled event
  const handleMessageRecalled = useCallback(
    (data: MessageRecalledEventData) => {
      console.log("[ChatSocketHandler] Message recalled event:", data);

      // Update the message in the current chat
      const messageToUpdate = messages.find((msg) => msg.id === data.messageId);
      if (messageToUpdate) {
        console.log(
          `[ChatSocketHandler] Found message to recall: ${data.messageId}`,
        );

        // Create recalled message
        const recalledMessage = {
          ...messageToUpdate,
          recalled: true,
        };

        // Update in chat store
        const chatStore = useChatStore.getState();
        chatStore.updateMessage(data.messageId, recalledMessage);

        // Update in conversations store using the utility function
        const conversationsStore = useConversationsStore.getState();
        conversationsStore.processNewMessage(recalledMessage, {
          incrementUnreadCount: false,
          markAsRead: false,
          updateLastActivity: false, // Don't update lastActivity for recall events
        });
      } else {
        console.log(
          `[ChatSocketHandler] Message ${data.messageId} not found in current chat, checking conversations`,
        );

        // If message not in current chat, find all affected conversations
        const conversationsStore = useConversationsStore.getState();
        const affectedConversations = conversationsStore.conversations.filter(
          (conv) => conv.lastMessage?.id === data.messageId,
        );

        // Update all affected conversations
        affectedConversations.forEach((conversation) => {
          if (conversation.lastMessage) {
            console.log(
              `[ChatSocketHandler] Updating recalled message in conversation ${conversation.type === "USER" ? conversation.contact.id : conversation.group?.id}`,
            );

            const recalledMessage = {
              ...conversation.lastMessage,
              recalled: true,
            };

            // Use the utility function to update the conversation
            conversationsStore.processNewMessage(recalledMessage, {
              incrementUnreadCount: false,
              markAsRead: false,
              updateLastActivity: false,
            });
          }
        });
      }
    },
    [messages],
  );

  // Handle message reaction updated event
  const handleMessageReactionUpdated = useCallback(
    (data: MessageReactionEventData) => {
      console.log("Message reaction updated event:", data);

      // Kiểm tra xem người thả cảm xúc có phải là người dùng hiện tại không
      const isCurrentUser = data.userId === currentUser?.id;
      console.log(
        `[ChatSocketHandler] Reaction from ${isCurrentUser ? "current user" : "other user"}`,
      );

      // Update the message in the current chat
      const messageToUpdate = messages.find((msg) => msg.id === data.messageId);
      if (messageToUpdate) {
        // Create updated message with new reactions
        const updatedMessage = {
          ...messageToUpdate,
          reactions: data.reactions,
        };

        // Update in chat store
        const chatStore = useChatStore.getState();
        chatStore.updateMessage(data.messageId, updatedMessage);

        // Update in conversations store using the utility function
        const conversationsStore = useConversationsStore.getState();
        conversationsStore.processNewMessage(updatedMessage, {
          incrementUnreadCount: false,
          markAsRead: false,
          updateLastActivity: false, // Don't update lastActivity for reaction events
        });

        // Phát âm thanh thông báo nếu cảm xúc đến từ người khác và không phải cuộc trò chuyện hiện tại
        if (!isCurrentUser) {
          // Kiểm tra xem tin nhắn có thuộc cuộc trò chuyện hiện tại không
          const isFromCurrentChat =
            (currentChatType === "USER" &&
              selectedContact &&
              (messageToUpdate.senderId === selectedContact.id ||
                messageToUpdate.receiverId === selectedContact.id)) ||
            (currentChatType === "GROUP" &&
              selectedGroup &&
              messageToUpdate.groupId === selectedGroup.id);

          // Chỉ phát âm thanh nếu không phải cuộc trò chuyện hiện tại
          if (!isFromCurrentChat) {
            console.log(
              `[ChatSocketHandler] Playing notification sound for reaction from ${data.userId}`,
            );
            playNotificationSound();
            incrementGlobalUnread();
          }
        }
      }
    },
    [
      messages,
      currentUser,
      currentChatType,
      selectedContact,
      selectedGroup,
      playNotificationSound,
      incrementGlobalUnread,
    ],
  );

  // Handle user typing event
  const handleUserTyping = useCallback(
    (data: UserTypingEventData) => {
      console.log("[ChatSocketHandler] User typing event:", data);

      // Cập nhật trạng thái đang nhập trong conversationsStore
      const conversationsStore = useConversationsStore.getState();

      // Xác định ID của người dùng hoặc nhóm đang nhập
      const typingId = data.receiverId || data.groupId;

      // Chỉ xử lý nếu có ID và không phải là người dùng hiện tại
      if (typingId && data.userId !== currentUser?.id) {
        console.log(
          `[ChatSocketHandler] Setting typing status for ${typingId} to true`,
        );
        conversationsStore.setTypingStatus(data.userId, true);
      }
    },
    [currentUser],
  );

  // Handle user typing stopped event
  const handleUserTypingStopped = useCallback(
    (data: UserTypingEventData) => {
      console.log("[ChatSocketHandler] User typing stopped event:", data);

      // Cập nhật trạng thái dừng nhập trong conversationsStore
      const conversationsStore = useConversationsStore.getState();

      // Xác định ID của người dùng hoặc nhóm đã dừng nhập
      const typingId = data.receiverId || data.groupId;

      // Chỉ xử lý nếu có ID và không phải là người dùng hiện tại
      if (typingId && data.userId !== currentUser?.id) {
        console.log(
          `[ChatSocketHandler] Setting typing status for ${typingId} to false`,
        );
        conversationsStore.setTypingStatus(data.userId, false);
      }
    },
    [currentUser],
  );

  // Handle user status event
  const handleUserStatus = useCallback(
    (data: UserStatusEventData) => {
      console.log("User status event:", data);
      // Update user online status in conversations
      const conversation = conversations.find(
        (conv) => conv.type === "USER" && conv.contact.id === data.userId,
      );

      if (conversation) {
        const conversationsStore = useConversationsStore.getState();
        conversationsStore.updateConversation(data.userId, {
          contact: {
            ...conversation.contact,
            online: data.status === "online",
            lastSeen:
              data.status === "offline"
                ? new Date()
                : conversation.contact.lastSeen,
          },
        });
      }
    },
    [conversations],
  );

  // Send typing indicator
  const sendTypingIndicator = useCallback(
    (isTyping: boolean) => {
      if (!messageSocket || !currentUser) return;

      const event = isTyping ? "typing" : "stopTyping";
      const data: { receiverId?: string; groupId?: string } = {};

      if (currentChatType === "USER" && selectedContact) {
        data.receiverId = selectedContact.id;
      } else if (currentChatType === "GROUP" && selectedGroup) {
        data.groupId = selectedGroup.id;
      } else {
        return; // No valid recipient
      }

      messageSocket.emit(event, data);
    },
    [
      messageSocket,
      currentUser,
      currentChatType,
      selectedContact,
      selectedGroup,
    ],
  );

  // Không cần sendHeartbeat nữa vì đã được xử lý trong SocketProvider

  // Thiết lập các event listener cho socket
  useEffect(() => {
    if (!messageSocket || !currentUser) return;

    // Get initial user statuses for all contacts
    const userIds = conversations
      .filter((conv) => conv.type === "USER")
      .map((conv) => conv.contact.id);

    if (userIds.length > 0) {
      messageSocket.emit("getUserStatus", { userIds });
    }

    console.log("[ChatSocketHandler] Setting up socket event listeners");

    // Register message event handlers
    messageSocket.on("newMessage", handleNewMessage);
    messageSocket.on("messageRead", handleMessageRead);
    messageSocket.on("messageRecalled", handleMessageRecalled);
    messageSocket.on("messageReactionUpdated", handleMessageReactionUpdated);
    messageSocket.on("userTyping", handleUserTyping);
    messageSocket.on("userTypingStopped", handleUserTypingStopped);
    messageSocket.on("userStatus", handleUserStatus);

    // Log all registered listeners for debugging
    console.log(
      "[ChatSocketHandler] Current listeners:",
      messageSocket.listeners("newMessage").length,
    );

    // Clean up on unmount
    return () => {
      console.log("[ChatSocketHandler] Removing message socket event handlers");

      // Log current listeners before cleanup
      console.log("[ChatSocketHandler] Listeners before cleanup:", {
        newMessage: messageSocket.listeners("newMessage").length,
        messageRead: messageSocket.listeners("messageRead").length,
        messageRecalled: messageSocket.listeners("messageRecalled").length,
        messageReactionUpdated: messageSocket.listeners(
          "messageReactionUpdated",
        ).length,
        userTyping: messageSocket.listeners("userTyping").length,
        userTypingStopped: messageSocket.listeners("userTypingStopped").length,
        userStatus: messageSocket.listeners("userStatus").length,
      });

      // Remove specific event handlers
      messageSocket.off("newMessage", handleNewMessage);
      messageSocket.off("messageRead", handleMessageRead);
      messageSocket.off("messageRecalled", handleMessageRecalled);
      messageSocket.off("messageReactionUpdated", handleMessageReactionUpdated);
      messageSocket.off("userTyping", handleUserTyping);
      messageSocket.off("userTypingStopped", handleUserTypingStopped);
      messageSocket.off("userStatus", handleUserStatus);

      // Log listeners after cleanup
      console.log("[ChatSocketHandler] Listeners after cleanup:", {
        newMessage: messageSocket.listeners("newMessage").length,
        messageRead: messageSocket.listeners("messageRead").length,
        messageRecalled: messageSocket.listeners("messageRecalled").length,
        messageReactionUpdated: messageSocket.listeners(
          "messageReactionUpdated",
        ).length,
        userTyping: messageSocket.listeners("userTyping").length,
        userTypingStopped: messageSocket.listeners("userTypingStopped").length,
        userStatus: messageSocket.listeners("userStatus").length,
      });
    };
  }, [
    messageSocket,
    currentUser,
    conversations,
    handleNewMessage,
    handleMessageRead,
    handleMessageRecalled,
    handleMessageReactionUpdated,
    handleUserTyping,
    handleUserTypingStopped,
    handleUserStatus,
  ]);

  // Export typing indicator function to chat store
  useEffect(() => {
    if (useChatStore.getState().sendTypingIndicator !== sendTypingIndicator) {
      useChatStore.setState({ sendTypingIndicator });
    }
  }, [sendTypingIndicator]);

  // This component doesn't render anything
  return null;
}
