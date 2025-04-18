import { create } from "zustand";
import {
  Group,
  Message,
  MessageType,
  ReactionType,
  User,
  UserInfo,
} from "@/types/base";
import { Socket } from "socket.io-client";

// Ensure window object has the right types
declare global {
  interface Window {
    messageSocket: Socket | null;
  }
}
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
import { getGroupById } from "@/actions/group.action";
import { useConversationsStore } from "./conversationsStore";
import { useAuthStore } from "./authStore";

// Utility types for message handling
interface MessageHandlingOptions {
  updateCache?: boolean;
  notifyConversationStore?: boolean;
  skipDuplicateCheck?: boolean;
}

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
  isLoadingOlder: boolean;
  isForwarding: boolean;
  searchText: string;
  searchResults: Message[];
  isSearching: boolean;
  currentPage: number;
  hasMoreMessages: boolean;
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

  // Actions
  setSelectedContact: (contact: (User & { userInfo: UserInfo }) | null) => void;
  setSelectedGroup: (group: Group | null) => void;
  loadMessages: (id: string, type: "USER" | "GROUP") => Promise<void>;
  loadOlderMessages: () => Promise<boolean>;
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
  addMessage: (message: Message, options?: MessageHandlingOptions) => void;
  updateMessage: (
    messageId: string,
    updatedMessage: Partial<Message>,
    options?: MessageHandlingOptions,
  ) => void;
  removeMessage: (messageId: string, options?: MessageHandlingOptions) => void;
  clearChat: () => void;
  addReactionToMessageById: (
    messageId: string,
    reaction: ReactionType,
  ) => Promise<boolean>;

  // New utility functions
  processNewMessage: (
    message: Message,
    options?: MessageHandlingOptions,
  ) => void;
  isDuplicateMessage: (message: Message) => boolean;
  updateMessageCache: (
    message: Message,
    action: "add" | "update" | "remove",
  ) => void;
  syncWithConversationStore: (message: Message) => void;
  markMessageAsReadById: (messageId: string) => Promise<boolean>;
  removeReactionFromMessageById: (messageId: string) => Promise<boolean>;
  markMessageAsUnreadById: (messageId: string) => Promise<boolean>;

  // Cache control methods
  setShouldFetchMessages: (shouldFetch: boolean) => void;
  clearChatCache: (type: "USER" | "GROUP", id: string) => void;
  clearAllCache: () => void;
  openChat: (contactId: string) => Promise<boolean>;
  reloadConversationMessages: (
    id: string,
    type: "USER" | "GROUP",
  ) => Promise<void>;
}

export const useChatStore = create<ChatState>((set, get) => ({
  // Utility functions
  isDuplicateMessage: (message: Message): boolean => {
    const { messages } = get();

    // Kiểm tra ID chính xác - đây là cách chắc chắn nhất để xác định trùng lặp
    const exactMessageExists = messages.some((msg) => msg.id === message.id);
    if (exactMessageExists) {
      console.log(`[chatStore] Message with ID ${message.id} already exists`);
      return true;
    }

    // Kiểm tra nội dung, người gửi và thời gian gửi gần nhau cho tin nhắn không phải tạm thời
    // Chỉ áp dụng cho tin nhắn không phải tạm thời và không phải từ người dùng hiện tại
    if (!message.id.startsWith("temp-")) {
      const similarMessageExists = messages.some(
        (msg) =>
          !msg.id.startsWith("temp-") && // Không phải tin nhắn tạm thời
          msg.senderId === message.senderId &&
          msg.content.text === message.content.text &&
          Math.abs(
            new Date(msg.createdAt).getTime() -
              new Date(message.createdAt).getTime(),
          ) < 2000, // 2 giây
      );

      if (similarMessageExists) {
        console.log(`[chatStore] Similar message content detected`);
        return true;
      }
    }

    return false;
  },

  updateMessageCache: (
    message: Message,
    action: "add" | "update" | "remove",
  ): void => {
    set((state) => {
      const { currentChatType, selectedContact, selectedGroup } = state;
      let cacheKey = "";

      if (currentChatType === "USER" && selectedContact) {
        cacheKey = `USER_${selectedContact.id}`;
      } else if (currentChatType === "GROUP" && selectedGroup) {
        cacheKey = `GROUP_${selectedGroup.id}`;
      }

      if (!cacheKey || !state.messageCache[cacheKey]) {
        return state; // Không có cache để cập nhật
      }

      let updatedCache;

      switch (action) {
        case "add":
          updatedCache = {
            ...state.messageCache,
            [cacheKey]: {
              messages: [...state.messageCache[cacheKey].messages, message],
              lastFetched: new Date(),
            },
          };
          break;

        case "update":
          updatedCache = {
            ...state.messageCache,
            [cacheKey]: {
              messages: state.messageCache[cacheKey].messages.map((msg) =>
                msg.id === message.id ? message : msg,
              ),
              lastFetched: new Date(),
            },
          };
          break;

        case "remove":
          updatedCache = {
            ...state.messageCache,
            [cacheKey]: {
              messages: state.messageCache[cacheKey].messages.filter(
                (msg) => msg.id !== message.id,
              ),
              lastFetched: new Date(),
            },
          };
          break;
      }

      return { messageCache: updatedCache };
    });
  },

  syncWithConversationStore: (message: Message): void => {
    const conversationsStore = useConversationsStore.getState();
    conversationsStore.processNewMessage(message);
  },

  processNewMessage: (
    message: Message,
    options: MessageHandlingOptions = {},
  ): void => {
    const {
      updateCache = true,
      notifyConversationStore = true,
      skipDuplicateCheck = false,
    } = options;

    // Kiểm tra trùng lặp nếu không bỏ qua
    if (!skipDuplicateCheck && get().isDuplicateMessage(message)) {
      console.log(`[chatStore] Message ${message.id} is duplicate, skipping`);
      return;
    }

    console.log(`[chatStore] Processing new message ${message.id}`);

    // Thêm tin nhắn vào danh sách
    set((state) => ({ messages: [...state.messages, message] }));

    // Cập nhật cache nếu cần
    if (updateCache) {
      get().updateMessageCache(message, "add");
    }

    // Đồng bộ với conversationsStore nếu cần
    if (notifyConversationStore) {
      get().syncWithConversationStore(message);
    }
  },
  // Initial state
  messages: [],
  selectedContact: null,
  selectedGroup: null,
  currentChatType: null,
  replyingTo: null,
  selectedMessage: null,
  isDialogOpen: false,
  isLoading: false,
  isLoadingOlder: false,
  isForwarding: false,
  searchText: "",
  searchResults: [],
  isSearching: false,
  currentPage: 1,
  hasMoreMessages: true,

  // Initialize cache
  messageCache: {},

  // By default, fetch messages from API
  shouldFetchMessages: true,

  // Actions
  setSelectedContact: (contact) => {
    console.log(`[chatStore] Setting selected contact: ${contact?.id}`);

    // First, clear messages and set loading state
    set({
      selectedContact: contact,
      selectedGroup: null,
      currentChatType: contact ? "USER" : null,
      messages: [], // Clear messages immediately
      isLoading: contact ? true : false, // Set loading state if we're selecting a contact
      currentPage: 1, // Reset page number
      hasMoreMessages: true, // Reset hasMoreMessages flag
      replyingTo: null, // Clear any reply state
      searchText: "", // Clear search text
      searchResults: [], // Clear search results
      isSearching: false, // Reset search state
    });

    if (contact) {
      // Create cache key for this conversation
      const cacheKey = `USER_${contact.id}`;
      const cachedData = get().messageCache[cacheKey];
      const currentTime = new Date();

      // Check if we have valid cache data (less than 5 minutes old)
      const isCacheValid =
        cachedData &&
        currentTime.getTime() - cachedData.lastFetched.getTime() <
          5 * 60 * 1000;

      if (isCacheValid && cachedData.messages.length > 0) {
        console.log(`[chatStore] Using cached messages for user ${contact.id}`);
        // Use cached data
        set({
          messages: cachedData.messages,
          isLoading: false,
        });
      } else {
        // If no cache or old cache, load messages from API
        console.log(
          `[chatStore] No valid cache for user ${contact.id}, fetching from API`,
        );
        // Use setTimeout to ensure state updates are processed before loading messages
        setTimeout(() => {
          get().loadMessages(contact.id, "USER");
        }, 0);
      }
    }
  },

  setSelectedGroup: (group) => {
    console.log(`[chatStore] Setting selected group: ${group?.id}`);

    // First, clear messages and set loading state
    set({
      selectedGroup: group,
      selectedContact: null,
      currentChatType: group ? "GROUP" : null,
      messages: [], // Clear messages immediately
      isLoading: group ? true : false, // Set loading state if we're selecting a group
      currentPage: 1, // Reset page number
      hasMoreMessages: true, // Reset hasMoreMessages flag
      replyingTo: null, // Clear any reply state
      searchText: "", // Clear search text
      searchResults: [], // Clear search results
      isSearching: false, // Reset search state
    });

    if (group) {
      // Create cache key for this group
      const cacheKey = `GROUP_${group.id}`;
      const cachedData = get().messageCache[cacheKey];
      const currentTime = new Date();

      // Check if we have valid cache data (less than 5 minutes old)
      const isCacheValid =
        cachedData &&
        currentTime.getTime() - cachedData.lastFetched.getTime() <
          5 * 60 * 1000;

      if (isCacheValid && cachedData.messages.length > 0) {
        console.log(`[chatStore] Using cached messages for group ${group.id}`);
        // Use cached data
        set({
          messages: cachedData.messages,
          isLoading: false,
        });
      } else {
        // If no cache or old cache, load messages from API
        console.log(
          `[chatStore] No valid cache for group ${group.id}, fetching from API`,
        );
        // Use setTimeout to ensure state updates are processed before loading messages
        setTimeout(() => {
          get().loadMessages(group.id, "GROUP");
        }, 0);
      }
    }
  },

  loadMessages: async (id, type) => {
    console.log(`[chatStore] Loading messages for ${type} ${id}`);

    // Check if we should fetch messages from API
    if (!get().shouldFetchMessages) {
      console.log(
        `[chatStore] Skipping API fetch as shouldFetchMessages is false`,
      );
      return;
    }

    // Verify that the selected contact/group hasn't changed since the request was made
    const currentState = get();
    const isStillSelected =
      (type === "USER" && currentState.selectedContact?.id === id) ||
      (type === "GROUP" && currentState.selectedGroup?.id === id);

    if (!isStillSelected) {
      console.log(
        `[chatStore] Selected ${type} changed before API call completed, aborting`,
      );
      return;
    }

    set({ isLoading: true, currentPage: 1, hasMoreMessages: true });
    try {
      let result;
      if (type === "USER") {
        result = await getMessagesBetweenUsers(id, 1);
      } else {
        result = await getGroupMessages(id, 1);
      }

      // Check again if the selected contact/group is still the same after API call
      const stateAfterCall = get();
      const isStillSelectedAfterCall =
        (type === "USER" && stateAfterCall.selectedContact?.id === id) ||
        (type === "GROUP" && stateAfterCall.selectedGroup?.id === id);

      if (!isStillSelectedAfterCall) {
        console.log(
          `[chatStore] Selected ${type} changed while API call was in progress, discarding results`,
        );
        return;
      }

      if (result.success && result.messages) {
        // Sort messages chronologically
        const sortedMessages = [...result.messages].sort((a, b) => {
          return (
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          );
        });

        // Check if we have more messages to load
        const hasMore = result.messages.length === 30; // PAGE_SIZE from backend

        // Update cache
        const cacheKey = `${type}_${id}`;
        set((state) => ({
          messages: sortedMessages,
          hasMoreMessages: hasMore,
          messageCache: {
            ...state.messageCache,
            [cacheKey]: {
              messages: sortedMessages,
              lastFetched: new Date(),
            },
          },
        }));
      } else {
        set({ messages: [], hasMoreMessages: false });
      }
    } catch (error) {
      console.error("Error fetching messages:", error);
      set({ messages: [], hasMoreMessages: false });
    } finally {
      // Only update loading state if this is still the selected conversation
      const finalState = get();
      const isStillSelectedFinal =
        (type === "USER" && finalState.selectedContact?.id === id) ||
        (type === "GROUP" && finalState.selectedGroup?.id === id);

      if (isStillSelectedFinal) {
        set({ isLoading: false });
      }
    }
  },

  loadOlderMessages: async (): Promise<boolean> => {
    console.log(`[chatStore] Loading older messages`);

    const {
      currentChatType,
      selectedContact,
      selectedGroup,
      currentPage,
      messages,
    } = get();

    if (
      !currentChatType ||
      (!selectedContact && !selectedGroup) ||
      !get().hasMoreMessages
    ) {
      console.log(
        `[chatStore] Cannot load older messages: No conversation selected or no more messages`,
      );
      return false; // Return false if we can't load more
    }

    const nextPage = currentPage + 1;
    const id =
      currentChatType === "USER" ? selectedContact!.id : selectedGroup!.id;

    // Store the current contact/group ID to verify it doesn't change during loading
    const currentId = id;
    const currentType = currentChatType;

    set({ isLoadingOlder: true });

    try {
      // Verify that the selected contact/group hasn't changed since the request was made
      const stateBeforeCall = get();
      const isStillSelected =
        (currentType === "USER" &&
          stateBeforeCall.selectedContact?.id === currentId) ||
        (currentType === "GROUP" &&
          stateBeforeCall.selectedGroup?.id === currentId);

      if (!isStillSelected) {
        console.log(
          `[chatStore] Selected ${currentType} changed before API call completed, aborting`,
        );
        return false;
      }

      let result;
      if (currentType === "USER") {
        result = await getMessagesBetweenUsers(id, nextPage);
      } else {
        result = await getGroupMessages(id, nextPage);
      }

      // Check again if the selected contact/group is still the same after API call
      const stateAfterCall = get();
      const isStillSelectedAfterCall =
        (currentType === "USER" &&
          stateAfterCall.selectedContact?.id === currentId) ||
        (currentType === "GROUP" &&
          stateAfterCall.selectedGroup?.id === currentId);

      if (!isStillSelectedAfterCall) {
        console.log(
          `[chatStore] Selected ${currentType} changed while API call was in progress, discarding results`,
        );
        return false;
      }

      if (result.success && result.messages && result.messages.length > 0) {
        // Sort messages chronologically
        const sortedNewMessages = [...result.messages].sort((a, b) => {
          return (
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          );
        });

        // Check for duplicates and merge with existing messages
        const existingMessageIds = new Set(messages.map((msg) => msg.id));
        const uniqueNewMessages = sortedNewMessages.filter(
          (msg) => !existingMessageIds.has(msg.id),
        );

        // If we got no new unique messages, we've reached the end
        if (uniqueNewMessages.length === 0) {
          console.log(
            `[chatStore] No new unique messages found, reached the end`,
          );
          set({
            hasMoreMessages: false,
            currentPage: nextPage,
            isLoadingOlder: false,
          });
          return true; // Still return true as we completed the request
        }

        console.log(
          `[chatStore] Loaded ${uniqueNewMessages.length} older messages`,
        );

        // Merge messages and update state - add older messages to the beginning
        const allMessages = [...uniqueNewMessages, ...messages];

        // Sort all messages by date to ensure correct order
        const sortedAllMessages = allMessages.sort((a, b) => {
          return (
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          );
        });

        // Check if we have more messages to load (if we got less than PAGE_SIZE, we're at the end)
        const hasMore = result.messages.length === 30; // PAGE_SIZE from backend

        // Update cache
        const cacheKey = `${currentType}_${id}`;
        set((state) => ({
          messages: sortedAllMessages,
          currentPage: nextPage,
          hasMoreMessages: hasMore,
          messageCache: {
            ...state.messageCache,
            [cacheKey]: {
              messages: sortedAllMessages,
              lastFetched: new Date(),
            },
          },
        }));

        return true;
      } else {
        // No more messages to load
        console.log(`[chatStore] No more messages to load`);
        set({ hasMoreMessages: false });
        return true; // Still return true as we completed the request
      }
    } catch (error) {
      console.error("Error fetching older messages:", error);
      return false; // Return false if there was an error
    } finally {
      // Only update loading state if this is still the selected conversation
      const finalState = get();
      const isStillSelectedFinal =
        (currentType === "USER" &&
          finalState.selectedContact?.id === currentId) ||
        (currentType === "GROUP" && finalState.selectedGroup?.id === currentId);

      if (isStillSelectedFinal) {
        set({ isLoadingOlder: false });
      }
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
      // Get the repliedTo message ID if replying
      const repliedToId = get().replyingTo?.id;

      // Send message to API
      let result;
      if (currentChatType === "USER") {
        if (files && files.length > 0) {
          // Use sendMediaMessage if we have files
          result = await sendMediaMessage(
            recipientId,
            text,
            files,
            repliedToId,
          );
        } else {
          // Use sendTextMessage if we only have text
          result = await sendTextMessage(recipientId, text, repliedToId);
        }
      } else {
        if (files && files.length > 0) {
          // Use sendGroupMediaMessage if we have files for group
          result = await sendGroupMediaMessage(
            recipientId,
            text,
            files,
            repliedToId,
          );
        } else {
          // Use sendGroupTextMessage if we only have text for group
          result = await sendGroupTextMessage(recipientId, text, repliedToId);
        }
      }

      if (result.success && result.message) {
        console.log(
          `[chatStore] Message sent successfully, received real message with ID: ${result.message.id}`,
        );

        // Ghi log tin nhắn đã gửi thành công
        console.log(
          `[chatStore] Message sent successfully with ID: ${result.message.id}`,
        );

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

  recallMessageById: async (messageId: string): Promise<void> => {
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

          if (
            affectedConversation.type === "USER" &&
            affectedConversation.lastMessage
          ) {
            // Update last message in user conversation
            const updatedMessage: Message = {
              ...affectedConversation.lastMessage,
              recalled: true,
            };
            conversationsStore.updateLastMessage(
              affectedConversation.contact.id,
              updatedMessage,
            );
          } else if (
            affectedConversation.type === "GROUP" &&
            affectedConversation.group &&
            affectedConversation.lastMessage
          ) {
            // Update last message in group conversation
            const updatedMessage: Message = {
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
      } else {
        console.error("[chatStore] Failed to recall message:", result.error);
      }
    } catch (error) {
      console.error("[chatStore] Error recalling message:", error);
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

  addMessage: (message, options = {}) => {
    const {
      updateCache = true,
      notifyConversationStore = true,
      skipDuplicateCheck = false,
    } = options;

    // Sử dụng hàm processNewMessage để xử lý tin nhắn mới
    get().processNewMessage(message, {
      updateCache,
      notifyConversationStore,
      skipDuplicateCheck,
    });
  },

  updateMessage: (
    messageId: string,
    updatedMessage: Partial<Message>,
    options: MessageHandlingOptions = {},
  ) => {
    const { updateCache = true, notifyConversationStore = true } = options;

    console.log(`[chatStore] Updating message ${messageId}`);

    set((state) => {
      // Kiểm tra xem tin nhắn có tồn tại trong danh sách không
      const existingMessage = state.messages.find(
        (msg) => msg.id === messageId,
      );

      if (!existingMessage) {
        console.log(
          `[chatStore] Message ${messageId} not found in current chat, skipping update`,
        );
        return state;
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

          // Cập nhật cache nếu cần
          if (updateCache) {
            get().updateMessageCache(existingMessage, "remove");
          }

          return {
            messages: state.messages.filter((msg) => msg.id !== messageId),
          };
        }

        // Thay thế tin nhắn tạm thời bằng tin nhắn thật
        const completeMessage = updatedMessage as Message;

        // Cập nhật cache nếu cần
        if (updateCache) {
          get().updateMessageCache(completeMessage, "update");
        }

        // Đồng bộ với conversationsStore nếu cần
        if (notifyConversationStore) {
          get().syncWithConversationStore(completeMessage);
        }

        return {
          messages: state.messages.map((msg) =>
            msg.id === messageId ? completeMessage : msg,
          ),
        };
      }

      // Cập nhật thông thường
      const updatedMessageObject = { ...existingMessage, ...updatedMessage };

      // Cập nhật cache nếu cần
      if (updateCache) {
        get().updateMessageCache(updatedMessageObject, "update");
      }

      // Đồng bộ với conversationsStore nếu cần
      if (notifyConversationStore) {
        get().syncWithConversationStore(updatedMessageObject);
      }

      return {
        messages: state.messages.map((msg) =>
          msg.id === messageId ? updatedMessageObject : msg,
        ),
      };
    });
  },

  removeMessage: (messageId, options: MessageHandlingOptions = {}) => {
    const { updateCache = true, notifyConversationStore = true } = options;

    console.log(`[chatStore] Removing message ${messageId}`);

    set((state) => {
      // Tìm tin nhắn cần xóa
      const messageToRemove = state.messages.find(
        (msg) => msg.id === messageId,
      );

      if (!messageToRemove) {
        console.log(
          `[chatStore] Message ${messageId} not found in current chat, skipping removal`,
        );
        return state;
      }

      // Cập nhật cache nếu cần
      if (updateCache) {
        get().updateMessageCache(messageToRemove, "remove");
      }

      // Đồng bộ với conversationsStore nếu cần
      // Lưu ý: Đối với xóa tin nhắn, chúng ta cần xử lý đặc biệt trong conversationsStore
      // nếu tin nhắn này là tin nhắn cuối cùng của cuộc trò chuyện
      if (notifyConversationStore) {
        const conversationsStore = useConversationsStore.getState();
        const conversation =
          conversationsStore.findConversationByMessage(messageToRemove);

        if (conversation && conversation.lastMessage?.id === messageId) {
          // Tìm tin nhắn mới nhất khác để cập nhật làm tin nhắn cuối cùng
          const newLastMessage = state.messages
            .filter((msg) => msg.id !== messageId)
            .sort(
              (a, b) =>
                new Date(b.createdAt).getTime() -
                new Date(a.createdAt).getTime(),
            )[0];

          if (newLastMessage) {
            conversationsStore.processNewMessage(newLastMessage, {
              incrementUnreadCount: false,
              markAsRead: false,
              updateLastActivity: true,
            });
          }
        }
      }

      return {
        messages: state.messages.filter((msg) => msg.id !== messageId),
      };
    });
  },

  clearChat: () => {
    set((state) => {
      // Lưu cache hiện tại trước khi xóa
      const { messageCache } = state;

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
  sendTypingIndicator: (isTyping: boolean) => {
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

  openChat: async (id: string, type: "USER" | "GROUP") => {
    try {
      console.log(`[chatStore] Opening chat with ${type} ID: ${id}`);

      // Reset any existing state to ensure clean start
      set({
        searchText: "",
        searchResults: [],
        isSearching: false,
        replyingTo: null,
        selectedMessage: null,
        isDialogOpen: false,
        isForwarding: false,
      });

      if (type === "USER") {
        // Fetch user data
        const result = await getUserDataById(id);

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

          console.log(`[chatStore] User data fetched successfully for ${id}`);

          // Set the selected contact
          get().setSelectedContact(user as User & { userInfo: UserInfo });

          // Get the conversations store
          const conversationsStore = useConversationsStore.getState();

          // Check if conversation exists
          const existingConversation = conversationsStore.conversations.find(
            (conv) => conv.type === "USER" && conv.contact.id === id,
          );

          // If conversation doesn't exist, create it
          if (!existingConversation) {
            console.log(
              `[chatStore] Creating new conversation for user ${userId}`,
            );
            conversationsStore.addConversation({
              contact: user as User & { userInfo: UserInfo },
              lastMessage: undefined,
              unreadCount: 0,
              lastActivity: new Date(),
              type: "USER",
            });
          } else {
            console.log(
              `[chatStore] Using existing conversation for user ${userId}`,
            );
          }

          // Load messages for this conversation
          await get().loadMessages(userId, "USER");

          return true;
        }
        console.log(`[chatStore] Failed to fetch user data for ${id}`);
        return false;
      } else if (type === "GROUP") {
        // Fetch group data
        const result = await getGroupById(id);

        if (result.success && result.group) {
          const group = result.group;
          console.log(`[chatStore] Group data fetched successfully for ${id}`);

          // Set the selected group
          get().setSelectedGroup(group);

          // Get the conversations store
          const conversationsStore = useConversationsStore.getState();
          const currentUser = useAuthStore.getState().user;

          // Check if group conversation exists
          const existingConversation = conversationsStore.conversations.find(
            (conv) => conv.type === "GROUP" && conv.group?.id === id,
          );

          // If group conversation doesn't exist, create it
          if (!existingConversation && currentUser) {
            console.log(
              `[chatStore] Creating new conversation for group ${id}`,
            );

            // Tạo placeholder contact vì Conversation type yêu cầu
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
                id: group.id,
                name: group.name,
                avatarUrl: group.avatarUrl,
                createdAt: group.createdAt,
              },
              lastMessage: undefined,
              unreadCount: 0,
              lastActivity: new Date(),
              type: "GROUP",
            });
          } else {
            console.log(
              `[chatStore] Using existing conversation for group ${id}`,
            );
          }

          return true;
        }
        console.log(`[chatStore] Failed to fetch group data for ${id}`);
        return false;
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

  // Force reload messages for a conversation
  reloadConversationMessages: async (id: string, type: "USER" | "GROUP") => {
    console.log(`[chatStore] Force reloading messages for ${type} ${id}`);

    // Clear cache for this conversation
    get().clearChatCache(type, id);

    // Load messages
    return get().loadMessages(id, type);
  },

  // Xóa toàn bộ cache
  clearAllCache: () => {
    set({ messageCache: {} });
  },
}));
