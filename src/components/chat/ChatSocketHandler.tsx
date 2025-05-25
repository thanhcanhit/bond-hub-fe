"use client";

import { useEffect, useCallback, useRef } from "react";
import { Socket } from "socket.io-client";
import { useChatStore } from "@/stores/chatStore";
import { useConversationsStore } from "@/stores/conversationsStore";
import { useAuthStore } from "@/stores/authStore";
import { useNotificationStore } from "@/stores/notificationStore";
import { Message, Reaction, MessageType } from "@/types/base";
import { useSocket } from "@/providers/SocketChatProvider";
import { useNotificationSound } from "@/hooks/useNotificationSound";
import { getCachedUserInfo, cacheUserInfo } from "@/utils/userCache";

// Extend Window interface to include our socket
declare global {
  interface Window {
    messageSocket: Socket | null;
  }
}

// Helper function to safely get socket instance
export function getMessageSocket(): Socket | null {
  if (typeof window === "undefined") return null;
  return window.messageSocket;
}

// Define types for socket events
interface MessageEventData {
  type: "user" | "group";
  message: Message;
  timestamp: Date;
}

// Define types for updateGroupList event
interface UpdateGroupListEventData {
  action: "added_to_group" | "removed_from_group" | "group_dissolved";
  groupId: string;
  addedById?: string;
  timestamp: Date;
}

// Define types for updateConversationList event
interface UpdateConversationListEventData {
  action: "group_dissolved" | "group_created" | "member_removed";
  groupId: string;
  userId?: string;
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

  // Simplified function to ensure message sender has userInfo - similar to mobile approach
  // NOTE: This function is not used in the mobile-style approach but kept for reference
  const ensureMessageHasUserInfo = useCallback(
    (message: Message) => {
      // Set messageType based on message properties
      if (message.groupId && !message.messageType) {
        message = { ...message, messageType: MessageType.GROUP };
      } else if (message.receiverId && !message.messageType) {
        message = { ...message, messageType: MessageType.USER };
      }

      // If message already has complete sender info, return as is
      if (message.sender?.userInfo?.fullName) {
        return message;
      }

      // If sender is current user, use current user's info
      if (message.senderId === currentUser?.id && currentUser?.userInfo) {
        return {
          ...message,
          sender: {
            ...currentUser,
            userInfo: currentUser.userInfo,
          },
        };
      }

      // For group messages, try to find sender in group members
      if (message.groupId) {
        // First try current selected group
        if (
          selectedGroup?.id === message.groupId &&
          selectedGroup.memberUsers
        ) {
          const senderMember = selectedGroup.memberUsers.find(
            (member) => member.id === message.senderId,
          );
          if (senderMember) {
            const userInfo = {
              id: message.senderId,
              fullName: senderMember.fullName,
              profilePictureUrl: senderMember.profilePictureUrl,
              statusMessage: "",
              blockStrangers: false,
              createdAt: new Date(),
              updatedAt: new Date(),
              userAuth: message.sender || ({ id: message.senderId } as any),
            };
            // Cache the user info for future use
            cacheUserInfo(message.senderId, userInfo);
            return {
              ...message,
              sender: {
                ...message.sender,
                id: message.senderId,
                userInfo,
              },
            };
          }
        }

        // Then try to find in conversations
        const groupConversation = conversations.find(
          (conv) => conv.type === "GROUP" && conv.group?.id === message.groupId,
        );
        if (groupConversation?.group?.memberUsers) {
          const senderMember = groupConversation.group.memberUsers.find(
            (member) => member.id === message.senderId,
          );
          if (senderMember) {
            const userInfo = {
              id: message.senderId,
              fullName: senderMember.fullName,
              profilePictureUrl: senderMember.profilePictureUrl,
              statusMessage: "",
              blockStrangers: false,
              createdAt: new Date(),
              updatedAt: new Date(),
              userAuth: message.sender || ({ id: message.senderId } as any),
            };
            // Cache the user info for future use
            cacheUserInfo(message.senderId, userInfo);
            return {
              ...message,
              sender: {
                ...message.sender,
                id: message.senderId,
                userInfo,
              },
            };
          }
        }
      }

      // For direct messages, check if sender is selected contact
      if (
        selectedContact?.id === message.senderId &&
        selectedContact.userInfo
      ) {
        return {
          ...message,
          sender: {
            ...selectedContact,
            userInfo: selectedContact.userInfo,
          },
        };
      }

      // Try to get user info from cache first
      const cachedUserInfo = getCachedUserInfo(message.senderId);
      if (cachedUserInfo) {
        return {
          ...message,
          sender: {
            ...message.sender,
            id: message.senderId,
            userInfo: cachedUserInfo,
          },
        };
      }

      // Try to get user info from conversations store cache
      const conversationsStore = useConversationsStore.getState();
      const conversationUserInfo =
        conversationsStore.getUserInfoFromConversations(message.senderId);
      if (conversationUserInfo) {
        // Cache it for future use
        cacheUserInfo(message.senderId, conversationUserInfo);
        return {
          ...message,
          sender: {
            ...message.sender,
            id: message.senderId,
            userInfo: conversationUserInfo,
          },
        };
      }

      // If all else fails, create minimal fallback
      const fallbackUserInfo = {
        id: message.senderId,
        fullName: `Người dùng ${message.senderId?.slice(-4) || ""}`,
        profilePictureUrl: null,
        statusMessage: "",
        blockStrangers: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        userAuth: message.sender || ({ id: message.senderId } as any),
      };

      // Cache the fallback to avoid repeated processing
      cacheUserInfo(message.senderId, fallbackUserInfo);

      return {
        ...message,
        sender: {
          ...message.sender,
          id: message.senderId,
          userInfo: fallbackUserInfo,
        },
      };
    },
    [currentUser, selectedContact, selectedGroup, conversations],
  );

  // Handle new message event - using mobile app approach
  const handleNewMessage = useCallback(
    (data: MessageEventData) => {
      // Normalize message structure like mobile app
      const normalizedMessage: Message = {
        ...data.message,
        content: {
          text: data.message.content.text || "",
          media: data.message.content.media || [],
          image: data.message.content.image,
          video: data.message.content.video,
        },
      };

      // Check if this is current user chat or current group chat (like mobile)
      const isCurrentUserChat =
        currentChatType === "USER" &&
        selectedContact &&
        (normalizedMessage.senderId === selectedContact.id ||
          normalizedMessage.receiverId === selectedContact.id);

      const isCurrentGroupChat =
        currentChatType === "GROUP" &&
        selectedGroup &&
        normalizedMessage.groupId === selectedGroup.id;

      // Only add message if we're in the right conversation (like mobile)
      if (isCurrentUserChat || isCurrentGroupChat) {
        // Use simple addMessage like mobile app
        const chatStore = useChatStore.getState();
        chatStore.addMessage(normalizedMessage, {
          updateCache: true,
          notifyConversationStore: false,
          skipDuplicateCheck: true,
        });

        // Mark as read if from others
        if (normalizedMessage.senderId !== currentUser?.id) {
          resetUnread();
        }
      }

      // Handle notifications for messages from others (like mobile)
      if (
        normalizedMessage.senderId !== currentUser?.id &&
        !isCurrentUserChat &&
        !isCurrentGroupChat
      ) {
        playNotificationSound();
        incrementGlobalUnread();
      }

      // Always update conversations store
      const conversationsStore = useConversationsStore.getState();
      conversationsStore.processNewMessage(normalizedMessage, {
        incrementUnreadCount:
          normalizedMessage.senderId !== currentUser?.id &&
          !isCurrentUserChat &&
          !isCurrentGroupChat,
        markAsRead: Boolean(
          (isCurrentUserChat || isCurrentGroupChat) &&
            normalizedMessage.senderId !== currentUser?.id,
        ),
        updateLastActivity: true,
      });
    },
    [
      currentUser,
      selectedContact,
      selectedGroup,
      currentChatType,
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
        // Create a Set from the readBy array to remove duplicates
        const uniqueReadBy = Array.isArray(data.readBy)
          ? [...new Set(data.readBy)]
          : [];

        // Create updated message with deduplicated readBy array
        const updatedMessage = {
          ...messageToUpdate,
          readBy: uniqueReadBy,
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

        // Determine if this is a reaction from the current user to someone else's message
        const isCurrentUserReactingToOthersMessage =
          data.userId === currentUser?.id &&
          messageToUpdate.senderId !== currentUser?.id;

        conversationsStore.processNewMessage(updatedMessage, {
          incrementUnreadCount: false, // Never increment unread count for reactions
          markAsRead: isCurrentUserReactingToOthersMessage, // Mark as read if current user is reacting to someone else's message
          updateLastActivity: false, // Don't update lastActivity for reaction events
        });

        // Phát âm thanh thông báo nếu cảm xúc đến từ người khác và không phải cuộc trò chuyện hiện tại
        // Chỉ phát âm thanh khi người khác thả cảm xúc cho tin nhắn của mình
        if (!isCurrentUser && messageToUpdate.senderId === currentUser?.id) {
          // Kiểm tra xem tin nhắn có thuộc cuộc trò chuyện hiện tại không
          let isFromCurrentChat = false;

          // Kiểm tra chi tiết dựa trên loại tin nhắn
          if (
            messageToUpdate.messageType === MessageType.GROUP ||
            messageToUpdate.groupId
          ) {
            // Đây là tin nhắn nhóm
            isFromCurrentChat = Boolean(
              currentChatType === "GROUP" &&
                selectedGroup &&
                messageToUpdate.groupId === selectedGroup.id,
            );
          } else {
            // Đây là tin nhắn trực tiếp
            isFromCurrentChat = Boolean(
              currentChatType === "USER" &&
                selectedContact &&
                (messageToUpdate.senderId === selectedContact.id ||
                  messageToUpdate.receiverId === selectedContact.id),
            );
          }

          // Chỉ phát âm thanh nếu không phải cuộc trò chuyện hiện tại
          if (!isFromCurrentChat) {
            console.log(
              `[ChatSocketHandler] Playing notification sound for reaction from ${data.userId}`,
            );
            playNotificationSound();
            // Không tăng số lượng tin nhắn chưa đọc khi có người thả cảm xúc
            // incrementGlobalUnread();
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

        // Xác định loại cuộc trò chuyện (nhóm hoặc cá nhân)
        const isGroupChat = Boolean(data.groupId);

        if (isGroupChat) {
          // Đối với nhóm, cập nhật trạng thái typing cho nhóm với thông tin người đang nhập
          console.log(
            `[ChatSocketHandler] Group typing: User ${data.userId} is typing in group ${data.groupId}`,
          );

          // Kiểm tra xem nhóm có tồn tại trong danh sách cuộc trò chuyện không
          const groupConversation = conversationsStore.conversations.find(
            (conv) => conv.type === "GROUP" && conv.group?.id === data.groupId,
          );

          if (groupConversation) {
            // Tìm thông tin người dùng đang nhập từ danh sách thành viên nhóm
            const typingUserInfo = groupConversation.group?.memberUsers?.find(
              (member) => member.id === data.userId,
            );

            if (typingUserInfo) {
              console.log(
                `[ChatSocketHandler] Found user info for typing user: ${typingUserInfo.fullName}`,
              );
            }

            // Cập nhật trạng thái typing cho nhóm
            conversationsStore.setGroupTypingStatus(
              data.groupId!,
              data.userId,
              true,
            );
          } else {
            console.log(
              `[ChatSocketHandler] Group ${data.groupId} not found in conversations, cannot update typing status`,
            );
          }
        } else {
          // Đối với chat cá nhân, cập nhật trạng thái typing cho người dùng
          conversationsStore.setTypingStatus(data.userId, true);
        }
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

        // Xác định loại cuộc trò chuyện (nhóm hoặc cá nhân)
        const isGroupChat = Boolean(data.groupId);

        if (isGroupChat) {
          // Đối với nhóm, cập nhật trạng thái typing cho nhóm với thông tin người đang nhập
          console.log(
            `[ChatSocketHandler] Group typing stopped: User ${data.userId} stopped typing in group ${data.groupId}`,
          );

          // Kiểm tra xem nhóm có tồn tại trong danh sách cuộc trò chuyện không
          const groupConversation = conversationsStore.conversations.find(
            (conv) => conv.type === "GROUP" && conv.group?.id === data.groupId,
          );

          if (groupConversation) {
            // Cập nhật trạng thái typing cho nhóm
            conversationsStore.setGroupTypingStatus(
              data.groupId!,
              data.userId,
              false,
            );
          } else {
            console.log(
              `[ChatSocketHandler] Group ${data.groupId} not found in conversations, cannot update typing status`,
            );
          }
        } else {
          // Đối với chat cá nhân, cập nhật trạng thái typing cho người dùng
          conversationsStore.setTypingStatus(data.userId, false);
        }
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

  // Handle updateGroupList event
  const handleUpdateGroupList = useCallback(
    (data: UpdateGroupListEventData) => {
      console.log(
        "[ChatSocketHandler] Update group list event received:",
        data,
      );

      if (data.action === "added_to_group") {
        console.log(
          "[ChatSocketHandler] User was added to a group, updating group list",
        );

        setTimeout(() => {
          useConversationsStore.getState().forceUpdate();
        }, 0);
      }
      // Không xử lý các sự kiện removed_from_group và group_dissolved ở đây
      // vì đã được xử lý trong GroupSocketHandler
    },
    [],
  );

  // Handle updateConversationList event
  const handleUpdateConversationList = useCallback(
    (data: UpdateConversationListEventData) => {
      console.log(
        "[ChatSocketHandler] Update conversation list event received:",
        data,
      );

      // Không xử lý sự kiện group_dissolved ở đây vì đã được xử lý trong GroupSocketHandler
      if (data.action === "group_created" || data.action === "member_removed") {
        setTimeout(() => {
          useConversationsStore.getState().forceUpdate();
        }, 0);
      }
    },
    [],
  );

  // Send typing indicator
  const sendTypingIndicator = useCallback(
    (isTyping: boolean) => {
      // Safety check - if socket or user is not available, we can't send typing indicator
      if (!messageSocket || !currentUser) {
        console.log(
          "[ChatSocketHandler] Cannot send typing indicator: socket or user not available",
        );
        return;
      }

      try {
        const event = isTyping ? "typing" : "stopTyping";
        const data: { receiverId?: string; groupId?: string } = {};

        if (currentChatType === "USER" && selectedContact) {
          data.receiverId = selectedContact.id;
        } else if (currentChatType === "GROUP" && selectedGroup) {
          data.groupId = selectedGroup.id;
        } else {
          return; // No valid recipient
        }

        // Check if socket is connected before emitting event
        if (messageSocket.connected) {
          messageSocket.emit(event, data);
        } else {
          console.log(
            "[ChatSocketHandler] Cannot send typing indicator: socket not connected",
          );
        }
      } catch (error) {
        console.error(
          "[ChatSocketHandler] Error sending typing indicator:",
          error,
        );
      }
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
  // Use a ref to track if event listeners are already set up
  const eventListenersSetupRef = useRef(false);

  useEffect(() => {
    // Early return if no socket or user
    if (!messageSocket || !currentUser) {
      console.log("[ChatSocketHandler] No socket or user, skipping setup");
      return;
    }

    // Check if socket is connected
    if (!messageSocket.connected) {
      console.log(
        "[ChatSocketHandler] Socket not connected, waiting for connection...",
      );

      // Add a one-time connect event handler
      const handleConnect = () => {
        console.log(
          "[ChatSocketHandler] Socket connected, continuing setup...",
        );
        setupSocketListeners();
      };

      messageSocket.once("connect", handleConnect);

      // Clean up the connect handler if the component unmounts before connection
      return () => {
        messageSocket?.off("connect", handleConnect);
      };
    } else {
      // Socket is already connected, proceed with setup
      setupSocketListeners();
    }

    function setupSocketListeners() {
      // Get initial user statuses for all contacts
      const userIds = conversations
        .filter((conv) => conv.type === "USER")
        .map((conv) => conv.contact.id);

      if (userIds.length > 0 && messageSocket && messageSocket.connected) {
        try {
          messageSocket.emit("getUserStatus", { userIds });
        } catch (error) {
          console.error(
            "[ChatSocketHandler] Error getting user statuses:",
            error,
          );
        }
      }

      // Only set up event listeners if they haven't been set up yet
      if (!eventListenersSetupRef.current && messageSocket) {
        console.log("[ChatSocketHandler] Setting up socket event listeners");

        // Register message event handlers
        messageSocket.on("newMessage", handleNewMessage);
        messageSocket.on("messageRead", handleMessageRead);
        messageSocket.on("messageRecalled", handleMessageRecalled);
        messageSocket.on(
          "messageReactionUpdated",
          handleMessageReactionUpdated,
        );
        messageSocket.on("userTyping", handleUserTyping);
        messageSocket.on("userTypingStopped", handleUserTypingStopped);
        messageSocket.on("userStatus", handleUserStatus);

        // Register group-related event handlers
        messageSocket.on("updateGroupList", handleUpdateGroupList);
        messageSocket.on(
          "updateConversationList",
          handleUpdateConversationList,
        );

        // Log all registered listeners for debugging
        console.log(
          "[ChatSocketHandler] Current listeners:",
          messageSocket.listeners("newMessage").length,
        );

        // Mark event listeners as set up
        eventListenersSetupRef.current = true;
      }
    }

    // Clean up on unmount only, not when dependencies change
    return () => {
      // Only clean up if the component is unmounting
      if (!messageSocket) {
        console.log("[ChatSocketHandler] No socket, skipping cleanup");
        return;
      }

      console.log("[ChatSocketHandler] Removing message socket event handlers");

      // Safety check - if socket is no longer available, we can't remove listeners
      if (!messageSocket.connected) {
        console.log(
          "[ChatSocketHandler] Socket no longer available, skipping cleanup",
        );
        return;
      }

      try {
        // Log current listeners before cleanup
        console.log("[ChatSocketHandler] Listeners before cleanup:", {
          newMessage: messageSocket.listeners("newMessage").length,
          messageRead: messageSocket.listeners("messageRead").length,
          messageRecalled: messageSocket.listeners("messageRecalled").length,
          messageReactionUpdated: messageSocket.listeners(
            "messageReactionUpdated",
          ).length,
          userTyping: messageSocket.listeners("userTyping").length,
          userTypingStopped:
            messageSocket.listeners("userTypingStopped").length,
          userStatus: messageSocket.listeners("userStatus").length,
        });

        // Remove specific event handlers
        messageSocket.off("newMessage", handleNewMessage);
        messageSocket.off("messageRead", handleMessageRead);
        messageSocket.off("messageRecalled", handleMessageRecalled);
        messageSocket.off(
          "messageReactionUpdated",
          handleMessageReactionUpdated,
        );
        messageSocket.off("userTyping", handleUserTyping);
        messageSocket.off("userTypingStopped", handleUserTypingStopped);
        messageSocket.off("userStatus", handleUserStatus);

        // Remove group-related event handlers
        messageSocket.off("updateGroupList", handleUpdateGroupList);
        messageSocket.off(
          "updateConversationList",
          handleUpdateConversationList,
        );

        // Reset the ref
        eventListenersSetupRef.current = false;

        // Log listeners after cleanup
        console.log("[ChatSocketHandler] Listeners after cleanup:", {
          newMessage: messageSocket.listeners("newMessage").length,
          messageRead: messageSocket.listeners("messageRead").length,
          messageRecalled: messageSocket.listeners("messageRecalled").length,
          messageReactionUpdated: messageSocket.listeners(
            "messageReactionUpdated",
          ).length,
          userTyping: messageSocket.listeners("userTyping").length,
          userTypingStopped:
            messageSocket.listeners("userTypingStopped").length,
          userStatus: messageSocket.listeners("userStatus").length,
        });
      } catch (error) {
        console.error("[ChatSocketHandler] Error during cleanup:", error);
      }
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
    handleUpdateGroupList,
    handleUpdateConversationList,
  ]);

  // Export typing indicator function to chat store
  useEffect(() => {
    // Only update the store if the user is logged in
    if (
      currentUser &&
      useChatStore.getState().sendTypingIndicator !== sendTypingIndicator
    ) {
      try {
        useChatStore.setState({ sendTypingIndicator });
      } catch (error) {
        console.error("[ChatSocketHandler] Error updating chat store:", error);
      }
    }
  }, [sendTypingIndicator, currentUser]);

  // Add event listeners for group-related events
  useEffect(() => {
    if (!messageSocket) return;

    const handleGroupDissolved = (data: UpdateGroupListEventData) => {
      console.log("[ChatSocketHandler] Group dissolved event received:", data);
      if (selectedGroup && selectedGroup.id === data.groupId) {
        console.log(
          `[ChatSocketHandler] Leaving group room: group:${data.groupId} via groupDissolved`,
        );
        messageSocket.emit("leaveGroup", { groupId: data.groupId });
        useChatStore.getState().setSelectedGroup(null);
      }
      useConversationsStore.getState().removeConversation(data.groupId);
    };

    const handleMemberRemoved = (data: UpdateGroupListEventData) => {
      console.log("[ChatSocketHandler] Member removed event received:", data);
      if (selectedGroup && selectedGroup.id === data.groupId) {
        console.log(
          `[ChatSocketHandler] Refreshing selected group after member removed`,
        );
        useChatStore.getState().refreshSelectedGroup();
      }
      useConversationsStore.getState().removeConversation(data.groupId);
    };

    messageSocket.on("groupDissolved", handleGroupDissolved);
    messageSocket.on("memberRemoved", handleMemberRemoved);

    return () => {
      messageSocket.off("groupDissolved", handleGroupDissolved);
      messageSocket.off("memberRemoved", handleMemberRemoved);
    };
  }, [messageSocket, selectedGroup]);

  // This component doesn't render anything
  return null;
}
