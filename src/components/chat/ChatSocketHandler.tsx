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

  // Function to ensure message sender has userInfo
  const ensureMessageHasUserInfo = useCallback(
    (message: Message) => {
      // Make sure messageType is correctly set based on the message properties
      if (message.groupId && !message.messageType) {
        message = {
          ...message,
          messageType: MessageType.GROUP,
        };
        console.log(
          "[ChatSocketHandler] ensureMessageHasUserInfo: Set messageType to GROUP for message with groupId",
          message.id,
        );
      } else if (message.receiverId && !message.messageType) {
        message = {
          ...message,
          messageType: MessageType.USER,
        };
        console.log(
          "[ChatSocketHandler] ensureMessageHasUserInfo: Set messageType to USER for message with receiverId",
          message.id,
        );
      }

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
        // For group messages, try to find sender info from the group members
        else if (
          currentChatType === "GROUP" &&
          selectedGroup &&
          message.groupId === selectedGroup.id
        ) {
          const senderMember = selectedGroup.memberUsers?.find(
            (member) => member.id === message.senderId,
          );
          if (senderMember) {
            // If we found the sender in the group members, use that info
            message.sender.userInfo = {
              ...(message.sender.userInfo || {}),
              id: message.senderId,
              fullName: senderMember.fullName,
              profilePictureUrl: senderMember.profilePictureUrl,
              createdAt: message.sender.userInfo?.createdAt || new Date(),
              updatedAt: message.sender.userInfo?.updatedAt || new Date(),
              blockStrangers: message.sender.userInfo?.blockStrangers || false,
              userAuth: message.sender,
            };
          }
        }
        // If message is from a group but we're not currently viewing that group
        else if (message.groupId && message.messageType === "GROUP") {
          // Try to find the group in conversations
          const groupConversation = conversations.find(
            (conv) =>
              conv.type === "GROUP" && conv.group?.id === message.groupId,
          );

          if (groupConversation && groupConversation.group?.memberUsers) {
            const senderMember = groupConversation.group.memberUsers.find(
              (member) => member.id === message.senderId,
            );

            if (senderMember && message.sender) {
              // Update sender info from group members
              message.sender.userInfo = {
                ...(message.sender.userInfo || {}),
                id: message.senderId,
                fullName: senderMember.fullName,
                profilePictureUrl: senderMember.profilePictureUrl,
                createdAt: message.sender.userInfo?.createdAt || new Date(),
                updatedAt: message.sender.userInfo?.updatedAt || new Date(),
                blockStrangers: false,
                userAuth: message.sender,
              };

              console.log(
                `[ChatSocketHandler] Updated sender info for group message from ${senderMember.fullName}`,
              );
            } else {
              console.log(
                `[ChatSocketHandler] Could not find sender ${message.senderId} in group members`,
              );
            }
          } else {
            console.log(
              `[ChatSocketHandler] Could not find group conversation for ${message.groupId}`,
            );
          }
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
    [
      currentUser,
      selectedContact,
      selectedGroup,
      currentChatType,
      conversations,
    ],
  );

  // Handle new message event
  const handleNewMessage = useCallback(
    (data: MessageEventData) => {
      console.log("[ChatSocketHandler] New message received:", data);

      // Ensure the message has the correct messageType set and user info
      const message = ensureMessageHasUserInfo(data.message);

      // Log message details for debugging
      console.log(
        `[ChatSocketHandler] Processing new message: id=${message.id}, type=${message.messageType}, groupId=${message.groupId || "none"}, senderId=${message.senderId}, receiverId=${message.receiverId || "none"}`,
      );

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

        // Ghi log cho tin nhắn mới từ người dùng hiện tại
        console.log(
          `[ChatSocketHandler] Checking for similar messages from current user`,
        );

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
      // Đồng thời kiểm tra loại tin nhắn để đảm bảo tin nhắn nhóm chỉ hiển thị trong nhóm và tin nhắn trực tiếp chỉ hiển thị trong cuộc trò chuyện trực tiếp
      let isFromCurrentChat = false;

      // Kiểm tra chi tiết dựa trên loại tin nhắn
      if (message.messageType === MessageType.GROUP || message.groupId) {
        // Đây là tin nhắn nhóm
        isFromCurrentChat = Boolean(
          currentChatType === "GROUP" &&
            selectedGroup &&
            message.groupId === selectedGroup.id,
        );
        console.log(
          `[ChatSocketHandler] Group message check: message.groupId=${message.groupId}, selectedGroup.id=${selectedGroup?.id}, isFromCurrentChat=${isFromCurrentChat}`,
        );
      } else {
        // Đây là tin nhắn trực tiếp
        isFromCurrentChat = Boolean(
          currentChatType === "USER" &&
            selectedContact &&
            (message.senderId === selectedContact.id ||
              message.receiverId === selectedContact.id),
        );
        console.log(
          `[ChatSocketHandler] Direct message check: message.senderId=${message.senderId}, message.receiverId=${message.receiverId}, selectedContact.id=${selectedContact?.id}, isFromCurrentChat=${isFromCurrentChat}`,
        );
      }

      // Thông tin người gửi đã được cập nhật trong ensureMessageHasUserInfo

      // Nếu tin nhắn thuộc cuộc trò chuyện đang mở, thêm vào danh sách tin nhắn
      if (isFromCurrentChat) {
        // Kiểm tra xem tin nhắn đã tồn tại trong danh sách chưa
        const messageExists = messages.some((msg) => msg.id === message.id);
        if (!messageExists) {
          console.log(
            `[ChatSocketHandler] Adding message to current chat: ${message.id} (groupId: ${message.groupId || "none"})`,
          );

          // Kiểm tra lại một lần nữa để đảm bảo tin nhắn được thêm vào đúng cuộc trò chuyện
          const currentState = useChatStore.getState();
          const stillValid =
            message.messageType === MessageType.GROUP || message.groupId
              ? // Tin nhắn nhóm
                currentState.currentChatType === "GROUP" &&
                currentState.selectedGroup?.id === message.groupId
              : // Tin nhắn trực tiếp
                currentState.currentChatType === "USER" &&
                currentState.selectedContact?.id &&
                (message.senderId === currentState.selectedContact.id ||
                  message.receiverId === currentState.selectedContact.id);

          if (!stillValid) {
            console.log(
              `[ChatSocketHandler] Conversation changed since message was received, skipping`,
            );
            return;
          }

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
      } else {
        console.log(
          `[ChatSocketHandler] Message ${message.id} is not for current chat (groupId: ${message.groupId || "none"})`,
        );
      }

      // Xử lý tin nhắn trong conversationsStore
      const shouldMarkAsRead = Boolean(
        currentUser && isFromCurrentChat && message.senderId !== currentUser.id,
      );
      const shouldIncrementUnread = Boolean(
        message.senderId !== currentUser?.id && !isFromCurrentChat,
      );

      // Thông tin người gửi đã được cập nhật trong ensureMessageHasUserInfo

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
          conversationsStore.setGroupTypingStatus(
            data.groupId!,
            data.userId,
            true,
          );
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
          conversationsStore.setGroupTypingStatus(
            data.groupId!,
            data.userId,
            false,
          );
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
