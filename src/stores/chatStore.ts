import { create } from "zustand";
import {
  Group,
  Message,
  MessageType,
  ReactionType,
  User,
  UserInfo,
} from "@/types/base";
import {
  getMessagesBetweenUsers,
  getGroupMessages,
  sendTextMessage,
  sendMediaMessage,
  sendGroupTextMessage,
  sendGroupMediaMessage,
  recallMessage,
  deleteMessageForSelf,
  forwardMessage,
  searchMessagesWithUser,
  searchGroupMessages,
  addReactionToMessage,
  removeReactionFromMessage,
  markMessageAsRead,
  markMessageAsUnread,
} from "@/actions/message.action";
import { getUserDataById } from "@/actions/user.action";
import { useConversationsStore } from "./conversationsStore";
import { useAuthStore } from "./authStore";

interface ChatState {
  // Current chat state
  messages: Message[];
  selectedContact: (User & { userInfo: UserInfo }) | null;
  selectedGroup: Group | null;
  currentChatType: "USER" | "GROUP" | null;
  replyingTo: Message | null;
  selectedMessage: Message | null;
  isDialogOpen: boolean;
  isLoading: boolean;
  isForwarding: boolean;
  searchText: string;
  searchResults: Message[];
  isSearching: boolean;
  sendTypingIndicator?: (isTyping: boolean) => void;

  // Cache for messages
  messageCache: Record<
    string,
    {
      messages: Message[];
      lastFetched: Date;
    }
  >;

  // Flag to control whether to fetch messages from API
  shouldFetchMessages: boolean;

  // ID of message with open reaction picker
  activeReactionPickerMessageId: string | null;

  // Actions
  setSelectedContact: (contact: (User & { userInfo: UserInfo }) | null) => void;
  setSelectedGroup: (group: Group | null) => void;
  loadMessages: (id: string, type: "USER" | "GROUP") => Promise<void>;
  sendMessage: (
    text: string,
    files?: File[],
    currentUser?: User,
  ) => Promise<void>;
  setReplyingTo: (message: Message | null) => void;
  setSelectedMessage: (message: Message | null) => void;
  setIsDialogOpen: (isOpen: boolean) => void;
  recallMessageById: (messageId: string) => Promise<void>;
  deleteMessageById: (messageId: string) => Promise<void>;
  forwardMessageToRecipients: (
    messageId: string,
    recipients: Array<{ type: "USER" | "GROUP"; id: string }>,
  ) => Promise<boolean>;
  setIsForwarding: (isForwarding: boolean) => void;
  searchMessages: (searchText: string) => Promise<void>;
  setSearchText: (text: string) => void;
  clearSearch: () => void;
  addMessage: (message: Message) => void;
  updateMessage: (messageId: string, updatedMessage: Partial<Message>) => void;
  removeMessage: (messageId: string) => void;
  clearChat: () => void;
  addReactionToMessageById: (
    messageId: string,
    reaction: ReactionType,
  ) => Promise<boolean>;
  removeReactionFromMessageById: (messageId: string) => Promise<boolean>;
  markMessageAsReadById: (messageId: string) => Promise<boolean>;
  markMessageAsUnreadById: (messageId: string) => Promise<boolean>;
  openChat: (userId: string) => Promise<boolean>;

  // Cache control methods
  setShouldFetchMessages: (shouldFetch: boolean) => void;
  clearChatCache: (type: "USER" | "GROUP", id: string) => void;
  clearAllCache: () => void;

  // Reaction picker control
  setActiveReactionPickerMessageId: (messageId: string | null) => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  // Initial state
  messages: [],
  selectedContact: null,
  selectedGroup: null,
  currentChatType: null,
  replyingTo: null,
  selectedMessage: null,
  isDialogOpen: false,
  isLoading: false,
  isForwarding: false,
  searchText: "",
  searchResults: [],
  isSearching: false,

  // Initialize cache
  messageCache: {},

  // By default, fetch messages from API
  shouldFetchMessages: true,

  // No active reaction picker initially
  activeReactionPickerMessageId: null,

  // Actions
  setSelectedContact: (contact) => {
    // Clear messages immediately to prevent showing previous conversation's messages
    set({
      selectedContact: contact,
      selectedGroup: null,
      currentChatType: contact ? "USER" : null,
      messages: [], // Clear messages immediately
      isLoading: contact ? true : false, // Set loading state if we're selecting a contact
    });

    if (contact) {
      // Tạo cache key cho cuộc trò chuyện này
      const cacheKey = `USER_${contact.id}`;
      const cachedData = get().messageCache[cacheKey];
      const currentTime = new Date();

      // Kiểm tra xem có dữ liệu trong cache không và cache có cũ không (< 5 phút)
      const isCacheValid =
        cachedData &&
        currentTime.getTime() - cachedData.lastFetched.getTime() <
          5 * 60 * 1000;

      if (isCacheValid && cachedData.messages.length > 0) {
        console.log(`[chatStore] Using cached messages for user ${contact.id}`);
        // Sử dụng dữ liệu từ cache
        set({
          messages: cachedData.messages,
          isLoading: false,
        });
      } else {
        // Nếu không có cache hoặc cache cũ, tải tin nhắn từ API
        console.log(
          `[chatStore] No valid cache for user ${contact.id}, fetching from API`,
        );
        get().loadMessages(contact.id, "USER");
      }
    }
  },

  setSelectedGroup: (group) => {
    // Clear messages immediately to prevent showing previous conversation's messages
    set({
      selectedGroup: group,
      selectedContact: null,
      currentChatType: group ? "GROUP" : null,
      messages: [], // Clear messages immediately
      isLoading: group ? true : false, // Set loading state if we're selecting a group
    });

    if (group) {
      // Tạo cache key cho nhóm này
      const cacheKey = `GROUP_${group.id}`;
      const cachedData = get().messageCache[cacheKey];
      const currentTime = new Date();

      // Kiểm tra xem có dữ liệu trong cache không và cache có cũ không (< 5 phút)
      const isCacheValid =
        cachedData &&
        currentTime.getTime() - cachedData.lastFetched.getTime() <
          5 * 60 * 1000;

      if (isCacheValid && cachedData.messages.length > 0) {
        console.log(`[chatStore] Using cached messages for group ${group.id}`);
        // Sử dụng dữ liệu từ cache
        set({
          messages: cachedData.messages,
          isLoading: false,
        });
      } else {
        // Nếu không có cache hoặc cache cũ, tải tin nhắn từ API
        console.log(
          `[chatStore] No valid cache for group ${group.id}, fetching from API`,
        );
        get().loadMessages(group.id, "GROUP");
      }
    }
  },

  loadMessages: async (id, type) => {
    // Kiểm tra xem có nên tải tin nhắn từ API không
    if (!get().shouldFetchMessages) {
      console.log(
        `[chatStore] Skipping API fetch as shouldFetchMessages is false`,
      );
      return;
    }

    set({ isLoading: true });
    try {
      let result;
      if (type === "USER") {
        result = await getMessagesBetweenUsers(id);
      } else {
        result = await getGroupMessages(id);
      }

      if (result.success && result.messages) {
        // Sort messages chronologically
        const sortedMessages = [...result.messages].sort((a, b) => {
          return (
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          );
        });

        // Cập nhật cache
        const cacheKey = `${type}_${id}`;
        set((state) => ({
          messages: sortedMessages,
          messageCache: {
            ...state.messageCache,
            [cacheKey]: {
              messages: sortedMessages,
              lastFetched: new Date(),
            },
          },
        }));
      } else {
        set({ messages: [] });
      }
    } catch (error) {
      console.error("Error fetching messages:", error);
      set({ messages: [] });
    } finally {
      set({ isLoading: false });
    }
  },

  sendMessage: async (text, files, currentUser) => {
    const { selectedContact, selectedGroup, currentChatType } = get();

    if (
      !currentUser ||
      !currentUser.id ||
      (!text.trim() && !files?.length) ||
      !currentChatType
    ) {
      console.error("Cannot send message: Missing required data");
      return;
    }

    const recipientId =
      currentChatType === "USER" ? selectedContact?.id : selectedGroup?.id;

    if (!recipientId) {
      console.error("Cannot send message: No recipient selected");
      return;
    }

    console.log(
      `[chatStore] Sending message to ${currentChatType === "USER" ? "user" : "group"} ${recipientId}`,
    );

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
      sender: {
        ...currentUser,
        userInfo: currentUser.userInfo,
      },
      receiverId: currentChatType === "USER" ? recipientId : undefined,
      receiver: currentChatType === "USER" ? selectedContact : undefined,
      groupId: currentChatType === "GROUP" ? recipientId : undefined,
      group: currentChatType === "GROUP" ? selectedGroup : undefined,
      recalled: false,
      deletedBy: [],
      reactions: [],
      readBy: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      messageType:
        currentChatType === "USER" ? MessageType.USER : MessageType.GROUP,
      repliedTo: get().replyingTo?.id,
    };

    console.log(
      `[chatStore] Created temporary message with ID: ${tempMessage.id}`,
    );

    // Add temporary message to UI
    set((state) => {
      // Kiểm tra xem tin nhắn đã tồn tại trong danh sách chưa
      const messageExists = state.messages.some((msg) => {
        // Kiểm tra ID
        if (msg.id === tempMessage.id) {
          console.log(
            `[chatStore] Temporary message with ID ${tempMessage.id} already exists, skipping`,
          );
          return true;
        }

        // Kiểm tra nội dung, người gửi và thời gian gửi gần nhau
        if (
          msg.senderId === tempMessage.senderId &&
          msg.content.text === tempMessage.content.text &&
          Math.abs(
            new Date(msg.createdAt).getTime() -
              new Date(tempMessage.createdAt).getTime(),
          ) < 2000
        ) {
          console.log(
            `[chatStore] Duplicate temporary message content detected, skipping`,
          );
          return true;
        }

        return false;
      });

      if (messageExists) {
        console.log(
          `[chatStore] Temporary message already exists in chat, skipping UI update`,
        );
        return { replyingTo: null }; // Chỉ xóa trạng thái reply, không thêm tin nhắn
      }

      console.log(`[chatStore] Adding temporary message to UI`);
      return {
        messages: [...state.messages, tempMessage],
        replyingTo: null, // Clear reply state after sending
      };
    });

    // Update conversation list with temporary message
    // Get the conversations store
    const conversationsStore = useConversationsStore.getState();

    if (currentChatType === "USER" && selectedContact) {
      // Check if conversation exists
      const existingConversation = conversationsStore.conversations.find(
        (conv) => conv.contact.id === selectedContact.id,
      );

      if (existingConversation) {
        // Update existing conversation
        conversationsStore.updateLastMessage(selectedContact.id, tempMessage);
      } else {
        // Create new conversation
        conversationsStore.addConversation({
          contact: selectedContact,
          lastMessage: tempMessage,
          unreadCount: 0,
          lastActivity: new Date(),
          type: "USER",
        });
      }
    } else if (currentChatType === "GROUP" && selectedGroup) {
      // Check if group conversation exists
      const existingConversation = conversationsStore.conversations.find(
        (conv) => conv.type === "GROUP" && conv.group?.id === selectedGroup.id,
      );

      if (existingConversation) {
        // Update existing group conversation
        conversationsStore.updateConversation(selectedGroup.id, {
          lastMessage: tempMessage,
          lastActivity: new Date(),
        });
      } else {
        // Create new group conversation with placeholder contact
        const placeholderContact: User & { userInfo: UserInfo } = {
          id: currentUser.id,
          email: currentUser.email || "",
          phoneNumber: currentUser.phoneNumber || "",
          passwordHash: currentUser.passwordHash,
          createdAt: new Date(),
          updatedAt: new Date(),
          userInfo: currentUser.userInfo || {
            id: currentUser.id,
            fullName: "Group Member",
            profilePictureUrl: null,
            statusMessage: "",
            blockStrangers: false,
            createdAt: new Date(),
            updatedAt: new Date(),
            userAuth: currentUser,
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

        conversationsStore.addConversation({
          contact: placeholderContact,
          group: {
            id: selectedGroup.id,
            name: selectedGroup.name,
            avatarUrl: selectedGroup.avatarUrl,
            createdAt: selectedGroup.createdAt,
          },
          lastMessage: tempMessage,
          unreadCount: 0,
          lastActivity: new Date(),
          type: "GROUP",
        });
      }
    }

    try {
      // Send message to API
      let result;
      if (currentChatType === "USER") {
        if (files && files.length > 0) {
          // Use sendMediaMessage if we have files
          result = await sendMediaMessage(recipientId, text, files);
        } else {
          // Use sendTextMessage if we only have text
          result = await sendTextMessage(recipientId, text);
        }
      } else {
        if (files && files.length > 0) {
          // Use sendGroupMediaMessage if we have files for group
          result = await sendGroupMediaMessage(recipientId, text, files);
        } else {
          // Use sendGroupTextMessage if we only have text for group
          result = await sendGroupTextMessage(recipientId, text);
        }
      }

      if (result.success && result.message) {
        console.log(
          `[chatStore] Message sent successfully, received real message with ID: ${result.message.id}`,
        );

        // Đánh dấu tin nhắn thật để tránh xử lý trùng lặp từ socket
        if (typeof window !== "undefined") {
          if (!window.sentMessageIds) {
            window.sentMessageIds = new Set();
          }

          // Lưu cả ID và nội dung để kiểm tra chặt chẽ hơn
          const messageKey = `${result.message.id}|${result.message.content.text}|${result.message.senderId}`;
          window.sentMessageIds.add(messageKey);
          console.log(`[chatStore] Added message to tracking: ${messageKey}`);

          // Xóa ID sau 10 giây để tránh trường hợp người dùng gửi cùng nội dung nhiều lần
          setTimeout(() => {
            if (window.sentMessageIds) {
              window.sentMessageIds.delete(messageKey);
              console.log(
                `[chatStore] Removed message from tracking: ${messageKey}`,
              );
            }
          }, 10000);
        }

        // Replace temporary message with real one from server
        // Chúng ta sẽ chỉ thay thế tin nhắn tạm thời, không thêm tin nhắn mới
        // Vì tin nhắn thật sẽ được nhận qua socket
        set((state) => {
          // Kiểm tra xem tin nhắn tạm thời có tồn tại không
          const tempMessageExists = state.messages.some(
            (msg) => msg.id === tempMessage.id,
          );

          if (tempMessageExists) {
            console.log(
              `[chatStore] Replacing temporary message ${tempMessage.id} with real message ${result.message.id}`,
            );
            return {
              messages: state.messages.map((msg) =>
                msg.id === tempMessage.id ? result.message : msg,
              ),
            };
          } else {
            // Nếu không tìm thấy tin nhắn tạm thời, không thay đổi gì
            console.log(
              `[chatStore] Temporary message ${tempMessage.id} not found, not adding real message to avoid duplication`,
            );
            return state;
          }
        });

        // Update conversation list with real message
        const conversationsStore = useConversationsStore.getState();

        if (currentChatType === "USER" && selectedContact) {
          // Update user conversation
          conversationsStore.updateLastMessage(
            selectedContact.id,
            result.message,
          );
        } else if (currentChatType === "GROUP" && selectedGroup) {
          // Update group conversation
          // For groups, we need to use updateConversation with the group ID
          const existingConversation = conversationsStore.conversations.find(
            (conv) =>
              conv.type === "GROUP" && conv.group?.id === selectedGroup.id,
          );

          if (existingConversation) {
            conversationsStore.updateConversation(selectedGroup.id, {
              lastMessage: result.message,
              lastActivity: new Date(result.message.createdAt),
            });
          } else {
            // Create new group conversation if it doesn't exist
            // We need a placeholder contact since the Conversation type requires it
            const placeholderContact: User & { userInfo: UserInfo } = {
              id: currentUser.id,
              email: currentUser.email || "",
              phoneNumber: currentUser.phoneNumber || "",
              passwordHash: currentUser.passwordHash,
              createdAt: new Date(),
              updatedAt: new Date(),
              userInfo: currentUser.userInfo || {
                id: currentUser.id,
                fullName: "Group Member",
                profilePictureUrl: null,
                statusMessage: "",
                blockStrangers: false,
                createdAt: new Date(),
                updatedAt: new Date(),
                userAuth: currentUser,
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

            conversationsStore.addConversation({
              contact: placeholderContact,
              group: {
                id: selectedGroup.id,
                name: selectedGroup.name,
                avatarUrl: selectedGroup.avatarUrl,
                createdAt: selectedGroup.createdAt,
              },
              lastMessage: result.message,
              unreadCount: 0,
              lastActivity: new Date(result.message.createdAt),
              type: "GROUP",
            });
          }
        }
      } else {
        // If sending failed, mark the message as failed
        console.error("Failed to send message:", result.error);
        // You could add error handling here, like marking the message as failed
      }
    } catch (error) {
      console.error("Error sending message:", error);
    }
  },

  searchMessages: async (searchText) => {
    const { selectedContact, selectedGroup, currentChatType } = get();
    if (!searchText.trim() || !currentChatType) return;

    const id =
      currentChatType === "USER" ? selectedContact?.id : selectedGroup?.id;

    if (!id) return;

    set({ isSearching: true });

    try {
      let result;
      if (currentChatType === "USER") {
        result = await searchMessagesWithUser(id, searchText);
      } else {
        result = await searchGroupMessages(id, searchText);
      }

      if (result.success && result.messages) {
        // Sort messages chronologically
        const sortedMessages = [...result.messages].sort((a, b) => {
          return (
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          );
        });

        set({ searchResults: sortedMessages });
      } else {
        set({ searchResults: [] });
      }
    } catch (error) {
      console.error("Error searching messages:", error);
      set({ searchResults: [] });
    } finally {
      set({ isSearching: false });
    }
  },

  setSearchText: (text) => {
    set({ searchText: text });
    if (!text) {
      set({ searchResults: [] });
    }
  },

  clearSearch: () => {
    set({ searchText: "", searchResults: [] });
  },

  setReplyingTo: (message) => {
    set({ replyingTo: message });
  },

  setSelectedMessage: (message) => {
    set({ selectedMessage: message });
  },

  setIsDialogOpen: (isOpen) => {
    set({ isDialogOpen: isOpen });
  },

  recallMessageById: async (messageId) => {
    try {
      console.log(`[chatStore] Recalling message with ID: ${messageId}`);
      const result = await recallMessage(messageId);

      if (result.success && result.message) {
        console.log(`[chatStore] Successfully recalled message: ${messageId}`);

        // Update in chat store
        set((state) => {
          console.log(`[chatStore] Updating message in chat store`);
          return {
            messages: state.messages.map((msg) =>
              msg.id === messageId ? { ...msg, recalled: true } : msg,
            ),
          };
        });

        // Update in conversations store if this is the last message
        const conversationsStore = useConversationsStore.getState();
        const affectedConversation = conversationsStore.conversations.find(
          (conv) => conv.lastMessage?.id === messageId,
        );

        if (affectedConversation) {
          console.log(`[chatStore] Updating recalled message in conversation`);

          if (affectedConversation.type === "USER") {
            // Update last message in user conversation
            const updatedMessage = {
              ...affectedConversation.lastMessage,
              recalled: true,
            };
            conversationsStore.updateLastMessage(
              affectedConversation.contact.id,
              updatedMessage,
            );
          } else if (
            affectedConversation.type === "GROUP" &&
            affectedConversation.group
          ) {
            // Update last message in group conversation
            const updatedMessage = {
              ...affectedConversation.lastMessage,
              recalled: true,
            };
            conversationsStore.updateConversation(
              affectedConversation.group.id,
              {
                lastMessage: updatedMessage,
              },
            );
          }
        }

        return true;
      } else {
        console.error("[chatStore] Failed to recall message:", result.error);
        return false;
      }
    } catch (error) {
      console.error("[chatStore] Error recalling message:", error);
      return false;
    }
  },

  deleteMessageById: async (messageId) => {
    try {
      const result = await deleteMessageForSelf(messageId);
      if (result.success) {
        set((state) => ({
          messages: state.messages.filter((msg) => msg.id !== messageId),
        }));
      }
    } catch (error) {
      console.error("Error deleting message:", error);
    }
  },

  forwardMessageToRecipients: async (messageId, recipients) => {
    set({ isLoading: true });
    try {
      const result = await forwardMessage(messageId, recipients);
      set({ isForwarding: false });
      return result.success;
    } catch (error) {
      console.error("Error forwarding message:", error);
      return false;
    } finally {
      set({ isLoading: false });
    }
  },

  setIsForwarding: (isForwarding) => {
    set({ isForwarding });
  },

  addMessage: (message) => {
    set((state) => {
      // Kiểm tra xem tin nhắn đã tồn tại trong danh sách chưa
      const messageExists = state.messages.some((msg) => {
        // Kiểm tra ID
        if (msg.id === message.id) {
          console.log(
            `[chatStore] Message with ID ${message.id} already exists, skipping`,
          );
          return true;
        }

        // Kiểm tra nội dung, người gửi và thời gian gửi gần nhau
        if (
          msg.senderId === message.senderId &&
          msg.content.text === message.content.text &&
          Math.abs(
            new Date(msg.createdAt).getTime() -
              new Date(message.createdAt).getTime(),
          ) < 2000
        ) {
          console.log(
            `[chatStore] Duplicate message content detected, skipping`,
          );
          return true;
        }

        return false;
      });

      // Kiểm tra xem tin nhắn có phải là tin nhắn vừa gửi từ người dùng hiện tại không
      const currentUser = useAuthStore.getState().user;
      if (message.senderId === currentUser?.id) {
        // Tạo khóa tin nhắn để kiểm tra
        const messageKey = `${message.id}|${message.content.text}|${message.senderId}`;

        // Kiểm tra xem tin nhắn này có trong danh sách đã gửi không
        if (typeof window !== "undefined" && window.sentMessageIds) {
          // Kiểm tra theo ID chính xác
          if (
            window.sentMessageIds.has(messageKey) ||
            window.sentMessageIds.has(message.id)
          ) {
            console.log(
              `[chatStore] Message was just sent by current user, skipping`,
            );
            return state;
          }
        }
      }

      if (messageExists) {
        console.log(
          `[chatStore] Message ${message.id} already exists or is duplicate, skipping`,
        );
        return state; // Không thay đổi state nếu tin nhắn đã tồn tại
      }

      console.log(`[chatStore] Adding new message ${message.id} to chat`);

      // Cập nhật cache cho cuộc trò chuyện hiện tại
      const { currentChatType, selectedContact, selectedGroup } = state;
      let cacheKey = "";

      if (currentChatType === "USER" && selectedContact) {
        cacheKey = `USER_${selectedContact.id}`;
      } else if (currentChatType === "GROUP" && selectedGroup) {
        cacheKey = `GROUP_${selectedGroup.id}`;
      }

      if (cacheKey && state.messageCache[cacheKey]) {
        // Cập nhật cache
        const updatedCache = {
          ...state.messageCache,
          [cacheKey]: {
            messages: [...state.messageCache[cacheKey].messages, message],
            lastFetched: new Date(),
          },
        };

        return {
          messages: [...state.messages, message],
          messageCache: updatedCache,
        };
      }

      return { messages: [...state.messages, message] };
    });
  },

  updateMessage: (messageId, updatedMessage) => {
    set((state) => {
      console.log(
        `[chatStore] Updating message ${messageId} with:`,
        updatedMessage,
      );

      // Kiểm tra xem tin nhắn có tồn tại trong danh sách không
      const messageExists = state.messages.some((msg) => msg.id === messageId);

      if (!messageExists) {
        console.log(
          `[chatStore] Message ${messageId} not found in current chat, skipping update`,
        );
        return state; // Không thay đổi state nếu tin nhắn không tồn tại
      }

      // Nếu đang cập nhật tin nhắn tạm thời bằng tin nhắn thật
      if (
        messageId.startsWith("temp-") &&
        "id" in updatedMessage &&
        typeof updatedMessage.id === "string"
      ) {
        console.log(
          `[chatStore] Replacing temporary message with real message ID: ${updatedMessage.id}`,
        );

        // Kiểm tra xem tin nhắn thật đã tồn tại trong danh sách chưa
        const realMessageExists = state.messages.some(
          (msg) => msg.id === updatedMessage.id,
        );

        if (realMessageExists) {
          console.log(
            `[chatStore] Real message ${updatedMessage.id} already exists, removing temporary message`,
          );
          // Nếu tin nhắn thật đã tồn tại, chỉ xóa tin nhắn tạm thời
          return {
            messages: state.messages.filter((msg) => msg.id !== messageId),
          };
        }

        // Thay thế tin nhắn tạm thời bằng tin nhắn thật
        return {
          messages: state.messages.map((msg) =>
            msg.id === messageId ? updatedMessage : msg,
          ),
        };
      }

      // Cập nhật thông thường
      const updatedMessages = state.messages.map((msg) =>
        msg.id === messageId ? { ...msg, ...updatedMessage } : msg,
      );

      // Cập nhật cache cho cuộc trò chuyện hiện tại
      const { currentChatType, selectedContact, selectedGroup } = state;
      let cacheKey = "";

      if (currentChatType === "USER" && selectedContact) {
        cacheKey = `USER_${selectedContact.id}`;
      } else if (currentChatType === "GROUP" && selectedGroup) {
        cacheKey = `GROUP_${selectedGroup.id}`;
      }

      if (cacheKey && state.messageCache[cacheKey]) {
        // Cập nhật cache
        const updatedCache = {
          ...state.messageCache,
          [cacheKey]: {
            messages: state.messageCache[cacheKey].messages.map((msg) =>
              msg.id === messageId ? { ...msg, ...updatedMessage } : msg,
            ),
            lastFetched: new Date(),
          },
        };

        return {
          messages: updatedMessages,
          messageCache: updatedCache,
        };
      }

      return { messages: updatedMessages };
    });
  },

  removeMessage: (messageId) => {
    set((state) => {
      // Cập nhật cache cho cuộc trò chuyện hiện tại
      const { currentChatType, selectedContact, selectedGroup } = state;
      let cacheKey = "";

      if (currentChatType === "USER" && selectedContact) {
        cacheKey = `USER_${selectedContact.id}`;
      } else if (currentChatType === "GROUP" && selectedGroup) {
        cacheKey = `GROUP_${selectedGroup.id}`;
      }

      if (cacheKey && state.messageCache[cacheKey]) {
        // Cập nhật cache
        const updatedCache = {
          ...state.messageCache,
          [cacheKey]: {
            messages: state.messageCache[cacheKey].messages.filter(
              (msg) => msg.id !== messageId,
            ),
            lastFetched: new Date(),
          },
        };

        return {
          messages: state.messages.filter((msg) => msg.id !== messageId),
          messageCache: updatedCache,
        };
      }

      return { messages: state.messages.filter((msg) => msg.id !== messageId) };
    });
  },

  clearChat: () => {
    set((state) => {
      // Lưu cache hiện tại trước khi xóa
      const { currentChatType, selectedContact, selectedGroup, messageCache } =
        state;
      let cacheKey = "";

      if (currentChatType === "USER" && selectedContact) {
        cacheKey = `USER_${selectedContact.id}`;
      } else if (currentChatType === "GROUP" && selectedGroup) {
        cacheKey = `GROUP_${selectedGroup.id}`;
      }

      return {
        messages: [],
        selectedContact: null,
        selectedGroup: null,
        currentChatType: null,
        replyingTo: null,
        selectedMessage: null,
        isDialogOpen: false,
        // Giữ lại cache để sử dụng sau này
        messageCache: messageCache,
      };
    });
  },

  addReactionToMessageById: async (messageId, reaction) => {
    try {
      const result = await addReactionToMessage(messageId, reaction);
      if (result.success && result.message) {
        // Update in chat store
        set((state) => ({
          messages: state.messages.map((msg) =>
            msg.id === messageId ? result.message : msg,
          ),
        }));

        // Update in conversations store if this is the last message
        const conversationsStore = useConversationsStore.getState();
        const affectedConversation = conversationsStore.conversations.find(
          (conv) => conv.lastMessage?.id === messageId,
        );

        if (affectedConversation) {
          if (affectedConversation.type === "USER") {
            // Update last message in user conversation
            conversationsStore.updateLastMessage(
              affectedConversation.contact.id,
              result.message,
            );
          } else if (
            affectedConversation.type === "GROUP" &&
            affectedConversation.group
          ) {
            // Update last message in group conversation
            conversationsStore.updateConversation(
              affectedConversation.group.id,
              {
                lastMessage: result.message,
              },
            );
          }
        }
      }
      return result.success;
    } catch (error) {
      console.error("Error adding reaction to message:", error);
      return false;
    }
  },

  removeReactionFromMessageById: async (messageId) => {
    try {
      const result = await removeReactionFromMessage(messageId);
      if (result.success && result.message) {
        // Update in chat store
        set((state) => ({
          messages: state.messages.map((msg) =>
            msg.id === messageId ? result.message : msg,
          ),
        }));

        // Update in conversations store if this is the last message
        const conversationsStore = useConversationsStore.getState();
        const affectedConversation = conversationsStore.conversations.find(
          (conv) => conv.lastMessage?.id === messageId,
        );

        if (affectedConversation) {
          if (affectedConversation.type === "USER") {
            // Update last message in user conversation
            conversationsStore.updateLastMessage(
              affectedConversation.contact.id,
              result.message,
            );
          } else if (
            affectedConversation.type === "GROUP" &&
            affectedConversation.group
          ) {
            // Update last message in group conversation
            conversationsStore.updateConversation(
              affectedConversation.group.id,
              {
                lastMessage: result.message,
              },
            );
          }
        }
      }
      return result.success;
    } catch (error) {
      console.error("Error removing reaction from message:", error);
      return false;
    }
  },

  markMessageAsReadById: async (messageId) => {
    try {
      // Kiểm tra xem tin nhắn đã được đọc chưa trước khi gọi API
      const currentUser = useAuthStore.getState().user;
      if (!currentUser) return false;

      const state = get();
      const message = state.messages.find((msg) => msg.id === messageId);

      // Nếu không tìm thấy tin nhắn hoặc tin nhắn đã được đọc rồi, không cần gọi API
      if (
        !message ||
        (Array.isArray(message.readBy) &&
          message.readBy.includes(currentUser.id))
      ) {
        console.log(
          `[chatStore] Message ${messageId} already read or not found, skipping API call`,
        );
        return true;
      }

      const result = await markMessageAsRead(messageId);
      if (result.success && result.message) {
        // Update in chat store
        set((state) => ({
          messages: state.messages.map((msg) =>
            msg.id === messageId ? result.message : msg,
          ),
        }));

        // Update in conversations store if this is the last message
        const conversationsStore = useConversationsStore.getState();
        const affectedConversation = conversationsStore.conversations.find(
          (conv) => conv.lastMessage?.id === messageId,
        );

        if (affectedConversation) {
          if (affectedConversation.type === "USER") {
            // Update last message in user conversation
            conversationsStore.updateLastMessage(
              affectedConversation.contact.id,
              result.message,
            );
            // Mark conversation as read
            conversationsStore.markAsRead(affectedConversation.contact.id);
          } else if (
            affectedConversation.type === "GROUP" &&
            affectedConversation.group
          ) {
            // Update last message in group conversation
            conversationsStore.updateConversation(
              affectedConversation.group.id,
              {
                lastMessage: result.message,
                unreadCount: 0, // Mark as read
              },
            );
          }
        }
      }
      return result.success;
    } catch (error) {
      console.error("Error marking message as read:", error);
      return false;
    }
  },

  markMessageAsUnreadById: async (messageId) => {
    try {
      const result = await markMessageAsUnread(messageId);
      if (result.success && result.message) {
        // Update in chat store
        set((state) => ({
          messages: state.messages.map((msg) =>
            msg.id === messageId ? result.message : msg,
          ),
        }));

        // Update in conversations store if this is the last message
        const conversationsStore = useConversationsStore.getState();
        const affectedConversation = conversationsStore.conversations.find(
          (conv) => conv.lastMessage?.id === messageId,
        );

        if (affectedConversation) {
          if (affectedConversation.type === "USER") {
            // Update last message in user conversation
            conversationsStore.updateLastMessage(
              affectedConversation.contact.id,
              result.message,
            );
            // Mark conversation as unread
            conversationsStore.incrementUnread(affectedConversation.contact.id);
          } else if (
            affectedConversation.type === "GROUP" &&
            affectedConversation.group
          ) {
            // Update last message in group conversation
            conversationsStore.updateConversation(
              affectedConversation.group.id,
              {
                lastMessage: result.message,
                unreadCount: affectedConversation.unreadCount + 1, // Increment unread count
              },
            );
          }
        }
      }
      return result.success;
    } catch (error) {
      console.error("Error marking message as unread:", error);
      return false;
    }
  },

  // Send typing indicator to the server
  sendTypingIndicator: (isTyping) => {
    // Get the current state
    const state = get();

    // Lấy socket từ SocketProvider
    const socket = typeof window !== "undefined" ? window.messageSocket : null;

    if (!socket) {
      console.log(
        "[chatStore] Cannot send typing indicator: No socket connection",
      );
      return;
    }

    // Determine the event to emit
    const event = isTyping ? "typing" : "stopTyping";

    // Prepare the data to send
    const data: { receiverId?: string; groupId?: string } = {};

    if (state.currentChatType === "USER" && state.selectedContact) {
      data.receiverId = state.selectedContact.id;
      console.log(
        `[chatStore] Sending ${event} event to user ${state.selectedContact.id}`,
      );
    } else if (state.currentChatType === "GROUP" && state.selectedGroup) {
      data.groupId = state.selectedGroup.id;
      console.log(
        `[chatStore] Sending ${event} event to group ${state.selectedGroup.id}`,
      );
    } else {
      console.log(
        "[chatStore] Cannot send typing indicator: No valid recipient",
      );
      return; // No valid recipient
    }

    // Emit the event
    socket.emit(event, data);
  },

  openChat: async (userId) => {
    try {
      // Fetch user data
      const result = await getUserDataById(userId);

      if (result.success && result.user) {
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

        // Set the selected contact
        get().setSelectedContact(user as User & { userInfo: UserInfo });

        // Get the conversations store
        const conversationsStore = useConversationsStore.getState();

        // Check if conversation exists
        const existingConversation = conversationsStore.conversations.find(
          (conv) => conv.contact.id === userId,
        );

        // If conversation doesn't exist, create it
        if (!existingConversation) {
          conversationsStore.addConversation({
            contact: user as User & { userInfo: UserInfo },
            lastMessage: undefined,
            unreadCount: 0,
            lastActivity: new Date(),
            type: "USER",
          });
        }

        return true;
      }
      return false;
    } catch (error) {
      console.error("Error opening chat:", error);
      return false;
    }
  },

  // Kiểm soát việc fetch dữ liệu từ API
  setShouldFetchMessages: (shouldFetch) => {
    set({ shouldFetchMessages: shouldFetch });
  },

  // Xóa cache của một cuộc trò chuyện cụ thể
  clearChatCache: (type, id) => {
    set((state) => {
      const cacheKey = `${type}_${id}`;
      const newCache = { ...state.messageCache };
      delete newCache[cacheKey];

      return { messageCache: newCache };
    });
  },

  // Xóa toàn bộ cache
  clearAllCache: () => {
    set({ messageCache: {} });
  },

  // Cập nhật ID của tin nhắn đang mở reaction picker
  setActiveReactionPickerMessageId: (messageId: string | null) => {
    set({ activeReactionPickerMessageId: messageId });
  },
}));
