"use client";

import { useEffect, useCallback } from "react";
import { Socket } from "socket.io-client";
import { useChatStore } from "@/stores/chatStore";
import { useConversationsStore } from "@/stores/conversationsStore";
import { useAuthStore } from "@/stores/authStore";
import { Message, User, UserInfo, MessageType, Reaction } from "@/types/base";
import { useSocket } from "@/providers/SocketProvider";

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
  const {
    addMessage,
    updateMessage,
    selectedContact,
    selectedGroup,
    currentChatType,
    messages,
  } = useChatStore();
  const {
    updateLastMessage,
    incrementUnread,
    addConversation,
    conversations,
    updateConversation,
  } = useConversationsStore();

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
      console.log("[ChatSocketHandler] Current chat state:", {
        currentChatType,
        selectedContact: selectedContact?.id,
        selectedGroup: selectedGroup?.id,
        messagesCount: messages.length,
      });

      const message = ensureMessageHasUserInfo(data.message);

      // Kiểm tra xem tin nhắn có phải là tin nhắn vừa gửi từ người dùng hiện tại không
      if (message.senderId === currentUser?.id) {
        // Tạo khóa tin nhắn để kiểm tra
        const messageKey = `${message.id}|${message.content.text}|${message.senderId}`;

        // Kiểm tra xem tin nhắn này có trong danh sách đã gửi không
        if (typeof window !== "undefined" && window.sentMessageIds) {
          // Kiểm tra theo ID chính xác
          if (window.sentMessageIds.has(messageKey)) {
            console.log(
              `[ChatSocketHandler] Message key ${messageKey} was just sent by current user, skipping socket event`,
            );
            return;
          }

          // Kiểm tra theo ID cũ
          if (window.sentMessageIds.has(message.id)) {
            console.log(
              `[ChatSocketHandler] Message ID ${message.id} was just sent by current user, skipping socket event`,
            );
            return;
          }
        }

        // Kiểm tra xem tin nhắn đã có trong danh sách tin nhắn chưa
        const messageExists = messages.some(
          (msg) =>
            // Kiểm tra ID
            msg.id === message.id ||
            // Hoặc kiểm tra nội dung, người gửi và thời gian gửi gần nhau
            (msg.senderId === message.senderId &&
              msg.content.text === message.content.text &&
              Math.abs(
                new Date(msg.createdAt).getTime() -
                  new Date(message.createdAt).getTime(),
              ) < 2000),
        );

        if (messageExists) {
          console.log(
            `[ChatSocketHandler] Message from current user already exists in chat, skipping`,
          );
          return;
        }

        console.log(
          `[ChatSocketHandler] Processing new message from current user: ${message.id}`,
        );
      }

      // If the message is for the current chat, add it to the messages list
      if (currentChatType === "USER" && selectedContact) {
        if (
          (message.senderId === selectedContact.id &&
            message.receiverId === currentUser?.id) ||
          (message.senderId === currentUser?.id &&
            message.receiverId === selectedContact.id)
        ) {
          console.log(
            `[ChatSocketHandler] Adding message to current USER chat with ${selectedContact.id}`,
          );

          // Check if message already exists in the chat
          const messageExists = messages.some((msg) => msg.id === message.id);
          if (messageExists) {
            console.log(
              `[ChatSocketHandler] Message ${message.id} already exists in chat, skipping`,
            );
          } else {
            // Add message to chat store
            addMessage(message);

            // Mark as read if it's from the selected contact
            if (message.senderId === selectedContact.id) {
              // Update the message in the backend to mark it as read
              // This will be handled by the server and broadcast to other clients
              const chatStore = useChatStore.getState();
              chatStore.markMessageAsReadById(message.id);
            }
          }
        }
      } else if (
        currentChatType === "GROUP" &&
        selectedGroup &&
        message.groupId === selectedGroup.id
      ) {
        console.log(
          `[ChatSocketHandler] Adding message to current GROUP chat with ${selectedGroup.id}`,
        );

        // Check if message already exists in the chat
        const messageExists = messages.some((msg) => msg.id === message.id);
        if (messageExists) {
          console.log(
            `[ChatSocketHandler] Message ${message.id} already exists in chat, skipping`,
          );
        } else {
          // Add message to chat store for group chat
          addMessage(message);

          // Mark as read if we're currently viewing this group
          if (message.senderId !== currentUser?.id) {
            const chatStore = useChatStore.getState();
            chatStore.markMessageAsReadById(message.id);
          }
        }
      }

      // Update the conversation list
      if (message.messageType === MessageType.USER) {
        const contactId =
          message.senderId === currentUser?.id
            ? message.receiverId
            : message.senderId;

        if (contactId) {
          // Check if conversation exists
          const existingConversation = conversations.find(
            (conv) => conv.contact.id === contactId,
          );

          if (existingConversation) {
            // Kiểm tra xem tin nhắn này có phải là tin nhắn mới nhất không
            const isNewerMessage =
              !existingConversation.lastMessage ||
              new Date(message.createdAt).getTime() >=
                new Date(existingConversation.lastMessage.createdAt).getTime();

            if (isNewerMessage) {
              console.log(
                `[ChatSocketHandler] Updating last message for conversation with ${contactId}`,
              );
              // Update existing conversation
              updateLastMessage(contactId, message);
            } else {
              console.log(
                `[ChatSocketHandler] Message is older than current last message, skipping conversation update`,
              );
            }

            // Increment unread count if message is not from current user and not from selected contact
            if (
              message.senderId !== currentUser?.id &&
              (currentChatType !== "USER" ||
                message.senderId !== selectedContact?.id)
            ) {
              incrementUnread(message.senderId);
            }
          } else if (message.sender && message.sender.userInfo) {
            console.log(
              `[ChatSocketHandler] Creating new conversation with ${contactId}`,
            );
            // Create new conversation if it doesn't exist
            addConversation({
              contact: message.sender as User & { userInfo: UserInfo },
              lastMessage: message,
              unreadCount: message.senderId !== currentUser?.id ? 1 : 0,
              lastActivity: new Date(message.createdAt),
              type: "USER",
            });
          }
        }
      } else if (
        message.messageType === MessageType.GROUP &&
        message.groupId &&
        message.group
      ) {
        // Handle group message updates for conversation list
        const existingConversation = conversations.find(
          (conv) => conv.type === "GROUP" && conv.group?.id === message.groupId,
        );

        if (existingConversation) {
          // Kiểm tra xem tin nhắn này có phải là tin nhắn mới nhất không
          const isNewerMessage =
            !existingConversation.lastMessage ||
            new Date(message.createdAt).getTime() >=
              new Date(existingConversation.lastMessage.createdAt).getTime();

          if (isNewerMessage) {
            console.log(
              `[ChatSocketHandler] Updating last message for group conversation with ${message.groupId}`,
            );
            // Update existing group conversation
            // For groups, we use the group ID as the key for updateConversation
            updateConversation(message.groupId, {
              lastMessage: message,
              lastActivity: new Date(message.createdAt),
              unreadCount:
                message.senderId !== currentUser?.id &&
                (currentChatType !== "GROUP" ||
                  selectedGroup?.id !== message.groupId)
                  ? existingConversation.unreadCount + 1
                  : existingConversation.unreadCount,
            });
          } else {
            console.log(
              `[ChatSocketHandler] Message is older than current last message, skipping group conversation update`,
            );
          }
        } else if (message.group) {
          console.log(
            `[ChatSocketHandler] Creating new group conversation with ${message.groupId}`,
          );
          // Create new group conversation
          // We need to create a placeholder contact since the Conversation type requires it
          const placeholderContact: User & { userInfo: UserInfo } = {
            id: message.senderId,
            email: "",
            phoneNumber: "",
            passwordHash: "",
            createdAt: new Date(),
            updatedAt: new Date(),
            userInfo: {
              id: message.senderId,
              fullName: "Group Member",
              profilePictureUrl: null,
              statusMessage: "",
              blockStrangers: false,
              createdAt: new Date(),
              updatedAt: new Date(),
              userAuth: null as unknown as User,
            },
            refreshTokens: [],
            qrCodes: [],
            posts: [],
            stories: [],
            groupMembers: [],
            cloudFiles: [],
            pinnedItems: [],
            sentFriends: [],
            receivedFriends: [],
            contacts: [],
            contactOf: [],
            settings: [],
            postReactions: [],
            hiddenPosts: [],
            addedBy: [],
            notifications: [],
            sentMessages: [],
            receivedMessages: [],
            comments: [],
          };

          addConversation({
            contact: placeholderContact,
            group: {
              id: message.group.id,
              name: message.group.name,
              avatarUrl: message.group.avatarUrl,
              createdAt: message.group.createdAt,
            },
            lastMessage: message,
            unreadCount: message.senderId !== currentUser?.id ? 1 : 0,
            lastActivity: new Date(message.createdAt),
            type: "GROUP",
          });
        }
      }
    },
    [
      currentUser,
      selectedContact,
      selectedGroup,
      currentChatType,
      conversations,
      messages,
      addMessage,
      updateLastMessage,
      incrementUnread,
      addConversation,
      updateConversation,
      ensureMessageHasUserInfo,
    ],
  );

  // Handle message read event
  const handleMessageRead = useCallback(
    (data: MessageReadEventData) => {
      console.log("Message read event:", data);

      // Update the message in the current chat
      const messageToUpdate = messages.find((msg) => msg.id === data.messageId);
      if (messageToUpdate) {
        // Update in chat store
        updateMessage(data.messageId, {
          ...messageToUpdate,
          readBy: data.readBy,
        });

        // Check if this is the last message in a conversation and update it in conversations store
        const conversationsStore = useConversationsStore.getState();
        const affectedConversation = conversationsStore.conversations.find(
          (conv) => conv.lastMessage?.id === data.messageId,
        );

        if (affectedConversation) {
          if (affectedConversation.type === "USER") {
            // Update last message in user conversation
            conversationsStore.updateLastMessage(
              affectedConversation.contact.id,
              {
                ...messageToUpdate,
                readBy: data.readBy,
              },
            );

            // If the current user read the message, mark the conversation as read
            if (data.userId === currentUser?.id) {
              conversationsStore.markAsRead(affectedConversation.contact.id);
            }
          } else if (
            affectedConversation.type === "GROUP" &&
            affectedConversation.group
          ) {
            // Update last message in group conversation
            conversationsStore.updateConversation(
              affectedConversation.group.id,
              {
                lastMessage: {
                  ...messageToUpdate,
                  readBy: data.readBy,
                },
              },
            );

            // If the current user read the message, mark the conversation as read
            if (data.userId === currentUser?.id) {
              conversationsStore.updateConversation(
                affectedConversation.group.id,
                {
                  unreadCount: 0,
                },
              );
            }
          }
        }
      }
    },
    [messages, updateMessage, currentUser],
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

        // Update in chat store
        const chatStore = useChatStore.getState();

        // Sử dụng phương thức updateMessage trực tiếp từ store để đảm bảo cập nhật state
        chatStore.updateMessage(data.messageId, {
          ...messageToUpdate,
          recalled: true,
        });

        // Get the conversations store directly to ensure we have the latest state
        const conversationsStore = useConversationsStore.getState();

        // If this is the last message in a conversation, update the conversation
        const conversation = conversationsStore.conversations.find(
          (conv) => conv.lastMessage?.id === data.messageId,
        );

        if (conversation) {
          console.log(
            `[ChatSocketHandler] Updating recalled message in conversation`,
          );

          if (conversation.type === "USER") {
            // Update last message in user conversation
            conversationsStore.updateLastMessage(conversation.contact.id, {
              ...messageToUpdate,
              recalled: true,
            });
          } else if (conversation.type === "GROUP" && conversation.group) {
            // Update last message in group conversation
            conversationsStore.updateConversation(conversation.group.id, {
              lastMessage: {
                ...messageToUpdate,
                recalled: true,
              },
            });
          }
        }
      } else {
        console.log(
          `[ChatSocketHandler] Message ${data.messageId} not found in current chat, fetching from API`,
        );

        // Nếu tin nhắn không có trong danh sách hiện tại, cần cập nhật lại danh sách tin nhắn
        // Đây có thể là tin nhắn từ một cuộc trò chuyện khác
        const conversationsStore = useConversationsStore.getState();

        // Tìm tất cả các cuộc trò chuyện có thể chứa tin nhắn này
        const affectedConversations = conversationsStore.conversations.filter(
          (conv) => conv.lastMessage?.id === data.messageId,
        );

        // Cập nhật tất cả các cuộc trò chuyện bị ảnh hưởng
        affectedConversations.forEach((conversation) => {
          if (conversation.lastMessage) {
            console.log(
              `[ChatSocketHandler] Updating recalled message in conversation ${conversation.type === "USER" ? conversation.contact.id : conversation.group?.id}`,
            );

            const updatedMessage = {
              ...conversation.lastMessage,
              recalled: true,
            };

            if (conversation.type === "USER") {
              conversationsStore.updateLastMessage(
                conversation.contact.id,
                updatedMessage,
              );
            } else if (conversation.type === "GROUP" && conversation.group) {
              conversationsStore.updateConversation(conversation.group.id, {
                lastMessage: updatedMessage,
              });
            }
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

      // Update the message in the current chat
      const messageToUpdate = messages.find((msg) => msg.id === data.messageId);
      if (messageToUpdate) {
        // Update in chat store
        updateMessage(data.messageId, {
          ...messageToUpdate,
          reactions: data.reactions,
        });

        // Check if this is the last message in a conversation and update it in conversations store
        const conversationsStore = useConversationsStore.getState();
        const affectedConversation = conversationsStore.conversations.find(
          (conv) => conv.lastMessage?.id === data.messageId,
        );

        if (affectedConversation) {
          if (affectedConversation.type === "USER") {
            // Update last message in user conversation
            conversationsStore.updateLastMessage(
              affectedConversation.contact.id,
              {
                ...messageToUpdate,
                reactions: data.reactions,
              },
            );
          } else if (
            affectedConversation.type === "GROUP" &&
            affectedConversation.group
          ) {
            // Update last message in group conversation
            conversationsStore.updateConversation(
              affectedConversation.group.id,
              {
                lastMessage: {
                  ...messageToUpdate,
                  reactions: data.reactions,
                },
              },
            );
          }
        }
      }
    },
    [messages, updateMessage],
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
        updateConversation(data.userId, {
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
    [conversations, updateConversation],
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
