import { create } from "zustand";
import {
  Group,
  GroupMember,
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

// Utility functions for creating minimal objects
const createMinimalUser = (id: string): User => ({
  id,
  passwordHash: "",
  createdAt: new Date(),
  updatedAt: new Date(),
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
});

const createMinimalUserInfo = (
  id: string,
  fullName: string,
  profilePictureUrl: string | null = null,
): UserInfo => ({
  id,
  fullName,
  profilePictureUrl,
  statusMessage: "No status",
  blockStrangers: false,
  createdAt: new Date(),
  updatedAt: new Date(),
  userAuth: createMinimalUser(id),
});

// Constants
const DUPLICATE_MESSAGE_THRESHOLD = 2000; // 2 seconds
const CACHE_VALIDITY_DURATION = 5 * 60 * 1000; // 5 minutes
const API_CALL_THROTTLE = 2000; // 2 seconds
const GROUP_REFRESH_THROTTLE = 5000; // 5 seconds
const GROUP_CACHE_VALIDITY = 30000; // 30 seconds

// Helper function to check for duplicate messages
const isDuplicateMessage = (
  message: Message,
  existingMessages: Message[],
): boolean => {
  // Check exact ID match
  const exactMessageExists = existingMessages.some(
    (msg) => msg.id === message.id,
  );
  if (exactMessageExists) {
    console.log(`[chatStore] Message with ID ${message.id} already exists`);
    return true;
  }

  // Check content, sender and time for non-temporary messages
  if (!message.id.startsWith("temp-")) {
    const similarMessageExists = existingMessages.some(
      (msg) =>
        !msg.id.startsWith("temp-") &&
        msg.senderId === message.senderId &&
        msg.content.text === message.content.text &&
        Math.abs(
          new Date(msg.createdAt).getTime() -
            new Date(message.createdAt).getTime(),
        ) < DUPLICATE_MESSAGE_THRESHOLD,
    );

    if (similarMessageExists) {
      console.log(`[chatStore] Similar message content detected`);
      return true;
    }
  }

  return false;
};

// Helper function to create a complete group object
const createCompleteGroup = (group: Partial<Group>): Group => ({
  id: group.id || "",
  name: group.name || "",
  creatorId: group.creatorId || "",
  avatarUrl: group.avatarUrl ?? null,
  createdAt: group.createdAt || new Date(),
  members: Array.isArray(group.members) ? group.members : [],
  messages: Array.isArray(group.messages) ? group.messages : [],
  memberUsers: Array.isArray(group.memberUsers) ? group.memberUsers : [],
});

// Helper function to ensure message has correct type
const ensureMessageType = (message: Message): Message => {
  if (!message.messageType) {
    if (message.groupId) {
      return { ...message, messageType: MessageType.GROUP };
    } else if (message.receiverId) {
      return { ...message, messageType: MessageType.USER };
    }
  }
  return message;
};

// Helper function to deduplicate readBy array
const deduplicateReadBy = (readBy: string[] | undefined): string[] => {
  if (!readBy) return [];
  return Array.isArray(readBy) ? [...new Set(readBy)] : [];
};

// Helper function to validate message
const validateMessage = (message: Message): boolean => {
  if (!message.id) {
    console.error("[chatStore] Message validation failed: Missing ID");
    return false;
  }
  if (!message.senderId) {
    console.error("[chatStore] Message validation failed: Missing senderId");
    return false;
  }
  if (!message.content) {
    console.error("[chatStore] Message validation failed: Missing content");
    return false;
  }
  return true;
};

// Helper function to check if message belongs to current chat
const isMessageForCurrentChat = (
  message: Message,
  currentChatType: "USER" | "GROUP" | null,
  selectedContact: (User & { userInfo: UserInfo }) | null,
  selectedGroup: Group | null,
): boolean => {
  if (!currentChatType) return false;

  if (currentChatType === "USER" && selectedContact) {
    return (
      message.messageType === MessageType.USER &&
      (message.senderId === selectedContact.id ||
        message.receiverId === selectedContact.id)
    );
  }

  if (currentChatType === "GROUP" && selectedGroup) {
    return (
      message.messageType === MessageType.GROUP &&
      message.groupId === selectedGroup.id
    );
  }

  return false;
};

// Helper function to validate cache key
const validateCacheKey = (key: string): boolean => {
  if (!key) {
    console.error("[chatStore] Invalid cache key: Empty key");
    return false;
  }
  if (!key.includes("_")) {
    console.error("[chatStore] Invalid cache key: Missing type separator");
    return false;
  }
  const [type, id] = key.split("_");
  if (!type || !id) {
    console.error("[chatStore] Invalid cache key: Missing type or ID");
    return false;
  }
  if (type !== "USER" && type !== "GROUP") {
    console.error("[chatStore] Invalid cache key: Invalid type");
    return false;
  }
  return true;
};

// Helper function to get cache key from message
const getCacheKeyFromMessage = (message: Message): string | null => {
  if (message.groupId) {
    return `GROUP_${message.groupId}`;
  }
  if (message.receiverId) {
    return `USER_${message.receiverId}`;
  }
  return null;
};

export interface ChatState {
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

  // Loading state flags
  isLoadingMessages: boolean;
  hasLoadedMessages: boolean;

  // Cache for messages
  messageCache: Record<
    string,
    {
      messages: Message[];
      lastFetched: Date;
    }
  >;

  // Cache for group data
  groupCache: Record<
    string,
    {
      group: Group;
      lastFetched: Date;
    }
  >;

  // Cache control flags
  shouldFetchMessages: boolean;
  shouldFetchGroupData: boolean;

  // Internal tracking
  emptyMessageGroups: Record<string, boolean>;
  lastMessageLoadTime: Record<string, number>;
  _lastApiCallTime: Record<string, number>;

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
  setShouldFetchGroupData: (shouldFetch: boolean) => void;
  clearChatCache: (type: "USER" | "GROUP", id: string) => void;
  clearAllCache: () => void;
  openChat: (id: string, type: "USER" | "GROUP") => Promise<boolean>;
  reloadConversationMessages: (
    id: string,
    type: "USER" | "GROUP",
  ) => Promise<void>;
  refreshSelectedGroup: () => Promise<void>;

  // Handle group dissolved event
  handleGroupDissolved: (groupId: string) => void;

  // Handle member removed event
  handleMemberRemoved: (groupId: string) => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  // Utility functions
  isDuplicateMessage: (message: Message): boolean => {
    return isDuplicateMessage(message, get().messages);
  },

  updateMessageCache: (
    message: Message,
    action: "add" | "update" | "remove",
  ): void => {
    const cacheKey = getCacheKeyFromMessage(message);
    if (!cacheKey || !validateCacheKey(cacheKey)) {
      console.error(
        "[chatStore] Cannot update message cache: Invalid cache key",
      );
      return;
    }

    set((state) => {
      const cache = state.messageCache[cacheKey] || {
        messages: [],
        lastFetched: new Date(),
      };

      let messages = [...cache.messages];
      let hasChanges = false;

      switch (action) {
        case "add":
          if (!messages.some((m) => m.id === message.id)) {
            messages = [...messages, message];
            hasChanges = true;
          }
          break;
        case "update":
          const index = messages.findIndex((m) => m.id === message.id);
          if (index !== -1) {
            messages[index] = message;
            hasChanges = true;
          }
          break;
        case "remove":
          const newMessages = messages.filter((m) => m.id !== message.id);
          if (newMessages.length !== messages.length) {
            messages = newMessages;
            hasChanges = true;
          }
          break;
      }

      if (!hasChanges) {
        return state;
      }

      // Sort messages by creation time
      messages.sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      );

      return {
        messageCache: {
          ...state.messageCache,
          [cacheKey]: {
            messages,
            lastFetched: new Date(),
          },
        },
      };
    });
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

    // Validate message
    if (!validateMessage(message)) {
      console.error(
        "[chatStore] Invalid message received, skipping processing",
      );
      return;
    }

    // Duplicate check
    if (!skipDuplicateCheck && get().isDuplicateMessage(message)) {
      console.log(`[chatStore] Message ${message.id} is duplicate, skipping`);
      return;
    }

    // Group message handling
    if (message.groupId && message.messageType === MessageType.GROUP) {
      set((state) => {
        const groupId = message.groupId!;
        if (state.emptyMessageGroups[groupId]) {
          console.log(
            `[chatStore] Removing group ${groupId} from emptyMessageGroups as new message received`,
          );
          const newEmptyMessageGroups = { ...state.emptyMessageGroups };
          delete newEmptyMessageGroups[groupId];
          return { emptyMessageGroups: newEmptyMessageGroups };
        }
        return state;
      });
    }

    // Message type handling
    const processedMessage = ensureMessageType(message);
    const { currentChatType, selectedContact, selectedGroup } = get();

    // Check if message belongs to current chat
    const isForCurrentChat = isMessageForCurrentChat(
      processedMessage,
      currentChatType,
      selectedContact,
      selectedGroup,
    );

    if (!isForCurrentChat && currentChatType !== null) {
      console.log(
        `[chatStore] Message ${processedMessage.id} is not for current chat, only syncing with conversation store`,
      );
      if (notifyConversationStore) {
        get().syncWithConversationStore(processedMessage);
      }
      return;
    }

    // Deduplicate readBy array
    processedMessage.readBy = deduplicateReadBy(processedMessage.readBy);

    // Add message to list
    set((state) => {
      // Ensure messages are sorted by creation time
      const newMessages = [...state.messages, processedMessage].sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      );
      return { messages: newMessages };
    });

    // Update cache if needed
    if (updateCache) {
      get().updateMessageCache(processedMessage, "add");
    }

    // Sync with conversationsStore if needed
    if (notifyConversationStore) {
      get().syncWithConversationStore(processedMessage);
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
  isLoadingMessages: false,
  hasLoadedMessages: false,

  // Initialize caches
  messageCache: {},
  groupCache: {},
  emptyMessageGroups: {},
  lastMessageLoadTime: {},
  _lastApiCallTime: {},

  // By default, fetch data from API
  shouldFetchMessages: true,
  shouldFetchGroupData: true,

  // Actions
  setSelectedContact: (contact) => {
    console.log(`[chatStore] Setting selected contact: ${contact?.id}`);

    // First, update state but don't clear messages immediately to avoid flickering
    set({
      selectedContact: contact,
      selectedGroup: null,
      currentChatType: contact ? "USER" : null,
      // Don't clear messages immediately to avoid flickering
      // messages: [],
      // Don't set loading state immediately to avoid flickering
      // isLoading: contact ? true : false,
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

  setSelectedGroup: (group: Group | null) => {
    if (!group) {
      set({
        selectedGroup: null,
        currentChatType: null,
        messages: [],
        isLoading: false,
      });
      return;
    }

    // Ensure all required Group properties are present
    const completeGroup: Group = {
      id: group.id,
      name: group.name,
      creatorId: group.creatorId || "",
      avatarUrl: group.avatarUrl ?? null,
      createdAt: group.createdAt || new Date(),
      members: Array.isArray(group.members) ? group.members : [],
      messages: Array.isArray(group.messages) ? group.messages : [],
      memberUsers: Array.isArray(group.memberUsers) ? group.memberUsers : [],
    };

    // Only update cache if id is a valid string
    if (typeof completeGroup.id === "string" && completeGroup.id) {
      set((state) => ({
        selectedGroup: completeGroup,
        currentChatType: "GROUP",
        messages: [],
        isLoading: false,
        groupCache: {
          ...state.groupCache,
          [completeGroup.id]: {
            group: completeGroup,
            lastFetched: new Date(),
          },
        },
      }));
    } else {
      set({
        selectedGroup: null,
        currentChatType: null,
        messages: [],
        isLoading: false,
      });
    }
  },

  loadMessages: async (id, type) => {
    console.log(`[chatStore] Loading messages for ${type} ${id}`);

    // Kiểm tra thời gian gọi API cuối cùng
    const now = Date.now();
    const lastCallTime = get()._lastApiCallTime[`${type}_${id}_messages`] || 0;
    const timeSinceLastCall = now - lastCallTime;

    // Nếu đã gọi API trong vòng 2 giây, bỏ qua
    if (timeSinceLastCall < 2000) {
      console.log(
        `[chatStore] Skipping message load, last call was ${timeSinceLastCall}ms ago`,
      );
      return;
    }

    // Cập nhật thời gian gọi API cuối cùng
    get()._lastApiCallTime[`${type}_${id}_messages`] = now;

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

    // Kiểm tra xem nhóm này đã được xác định là không có tin nhắn chưa
    const cacheKey = `${type}_${id}`;
    if (type === "GROUP" && get().emptyMessageGroups[id]) {
      console.log(
        `[chatStore] Group ${id} is known to have no messages, skipping API fetch`,
      );

      // Cập nhật cache với mảng rỗng
      set((state) => ({
        messages: [],
        hasMoreMessages: false,
        isLoading: false,
        messageCache: {
          ...state.messageCache,
          [cacheKey]: {
            messages: [],
            lastFetched: new Date(),
          },
        },
      }));
      return;
    }

    // Set loading state but don't clear messages immediately to avoid flickering
    // Only set isLoading if we don't already have messages for this conversation
    const shouldShowLoading = currentState.messages.length === 0;
    set({
      currentPage: 1,
      hasMoreMessages: true,
      isLoading: shouldShowLoading,
    });

    try {
      console.log(`[chatStore] Making API call for ${type} ${id}`);
      let result: { success: boolean; messages?: Message[]; error?: string };
      if (type === "USER") {
        result = await getMessagesBetweenUsers(id, 1);
      } else {
        result = await getGroupMessages(id, 1);
      }
      console.log(`[chatStore] API call completed for ${type} ${id}`);

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

        // Nếu là nhóm và không có tin nhắn, đánh dấu nhóm này là không có tin nhắn
        if (type === "GROUP" && sortedMessages.length === 0) {
          console.log(
            `[chatStore] Group ${id} has no messages, marking as empty`,
          );
          set((state) => ({
            emptyMessageGroups: {
              ...state.emptyMessageGroups,
              [id]: true,
            },
          }));
        }

        // Update cache
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
        console.log(
          `[chatStore] Updated cache for ${type} ${id} with ${sortedMessages.length} messages`,
        );
      } else {
        // Nếu là nhóm và không có tin nhắn, đánh dấu nhóm này là không có tin nhắn
        if (type === "GROUP") {
          console.log(
            `[chatStore] Group ${id} has no messages, marking as empty`,
          );
          set((state) => ({
            emptyMessageGroups: {
              ...state.emptyMessageGroups,
              [id]: true,
            },
          }));
        }

        set({ messages: [], hasMoreMessages: false });
        console.log(`[chatStore] No messages found for ${type} ${id}`);
      }
    } catch (error) {
      console.error(
        `[chatStore] Error fetching messages for ${type} ${id}:`,
        error,
      );
      set({ messages: [], hasMoreMessages: false });
    } finally {
      // Only update loading state if this is still the selected conversation
      const finalState = get();
      const isStillSelectedFinal =
        (type === "USER" && finalState.selectedContact?.id === id) ||
        (type === "GROUP" && finalState.selectedGroup?.id === id);

      if (isStillSelectedFinal) {
        set({
          isLoading: false,
        });
        console.log(`[chatStore] Completed loading messages for ${type} ${id}`);
      } else {
        console.log(
          `[chatStore] Completed loading messages for ${type} ${id}, but it's no longer selected`,
        );
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

      let result: { success: boolean; messages?: Message[]; error?: string };
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
      let result: { success: boolean; message?: Message; error?: string };
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

          if (tempMessageExists && result.message) {
            console.log(
              `[chatStore] Replacing temporary message ${tempMessage.id} with real message ${result.message.id}`,
            );
            return {
              messages: state.messages.map((msg) =>
                msg.id === tempMessage.id ? result.message : msg,
              ),
            } as Partial<ChatState>;
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
      let result: { success: boolean; messages?: Message[]; error?: string };
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
      let updatedMessageObject = { ...existingMessage, ...updatedMessage };

      // Đảm bảo readBy không chứa trùng lặp
      if (updatedMessageObject.readBy) {
        // Convert to array if it's not already
        const readByArray = Array.isArray(updatedMessageObject.readBy)
          ? updatedMessageObject.readBy
          : [];

        // Use Set to remove duplicates
        updatedMessageObject = {
          ...updatedMessageObject,
          readBy: [...new Set(readByArray)],
        };
      }

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

      // Nếu không tìm thấy tin nhắn, không cần gọi API
      if (!message) {
        console.log(
          `[chatStore] Message ${messageId} not found, skipping API call`,
        );
        return true;
      }

      // Kiểm tra xem tin nhắn đã được đọc bởi người dùng hiện tại chưa
      if (
        Array.isArray(message.readBy) &&
        message.readBy.includes(currentUser.id)
      ) {
        console.log(
          `[chatStore] Message ${messageId} already read by current user, skipping API call`,
        );
        return true;
      }

      // Optimistically update the message in the local state before API call
      // This ensures we don't have duplicate readBy entries even if the API doesn't handle it
      const optimisticReadBy = Array.isArray(message.readBy)
        ? [...message.readBy]
        : [];
      if (!optimisticReadBy.includes(currentUser.id)) {
        optimisticReadBy.push(currentUser.id);
      }

      // Update the message in the local state with the optimistic readBy array
      set((state) => ({
        messages: state.messages.map((msg) =>
          msg.id === messageId ? { ...msg, readBy: optimisticReadBy } : msg,
        ),
      }));

      // Call the API to mark the message as read
      const result = await markMessageAsRead(messageId);
      if (result.success && result.message) {
        // Ensure readBy array doesn't contain duplicates
        const uniqueReadBy = Array.isArray(result.message.readBy)
          ? [...new Set(result.message.readBy)]
          : result.message.readBy || [];

        const updatedMessage = {
          ...result.message,
          readBy: uniqueReadBy,
        };

        // Update in chat store with the response from the API
        set((state) => ({
          messages: state.messages.map((msg) =>
            msg.id === messageId ? updatedMessage : msg,
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
              updatedMessage,
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
                lastMessage: updatedMessage,
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
        // Ensure readBy array doesn't contain duplicates
        const uniqueReadBy = Array.isArray(result.message.readBy)
          ? [...new Set(result.message.readBy)]
          : result.message.readBy || [];

        const updatedMessage = {
          ...result.message,
          readBy: uniqueReadBy,
        };

        // Update in chat store
        set((state) => ({
          messages: state.messages.map((msg) =>
            msg.id === messageId ? updatedMessage : msg,
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
              updatedMessage,
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
                lastMessage: updatedMessage,
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

  // Xóa cache của một cuộc trò chuyện cụ thể
  clearChatCache: (type, id) => {
    set((state) => {
      const cacheKey = `${type}_${id}`;
      const newMessageCache = { ...state.messageCache };
      delete newMessageCache[cacheKey];

      // Nếu là nhóm, xóa cả trạng thái emptyMessageGroups và lastMessageLoadTime
      if (type === "GROUP") {
        const newEmptyMessageGroups = { ...state.emptyMessageGroups };
        delete newEmptyMessageGroups[id];

        const newLastMessageLoadTime = { ...state.lastMessageLoadTime };
        delete newLastMessageLoadTime[id];

        return {
          messageCache: newMessageCache,
          emptyMessageGroups: newEmptyMessageGroups,
          lastMessageLoadTime: newLastMessageLoadTime,
        };
      }

      return { messageCache: newMessageCache };
    });
  },

  // Xóa cache của một nhóm cụ thể
  clearGroupCache: (groupId: string) => {
    set((state) => {
      const newGroupCache = { ...state.groupCache };
      delete newGroupCache[groupId];

      return { groupCache: newGroupCache };
    });
  },

  // Force reload messages for a conversation
  reloadConversationMessages: async (id: string, type: "USER" | "GROUP") => {
    console.log(`[chatStore] Force reloading messages for ${type} ${id}`);

    // Kiểm tra thời gian gọi API cuối cùng
    const now = Date.now();
    const lastCallTime = get()._lastApiCallTime[`${type}_${id}_reload`] || 0;
    const timeSinceLastCall = now - lastCallTime;

    // Nếu đã gọi API trong vòng 2 giây, bỏ qua
    if (timeSinceLastCall < 2000) {
      console.log(
        `[chatStore] Skipping reload, last call was ${timeSinceLastCall}ms ago`,
      );
      return;
    }

    // Cập nhật thời gian gọi API cuối cùng
    get()._lastApiCallTime[`${type}_${id}_reload`] = now;

    // Clear cache for this conversation
    get().clearChatCache(type, id);

    // Don't clear messages immediately to avoid flickering
    // Only set loading state if we don't have messages
    const currentState = get();
    const shouldShowLoading = currentState.messages.length === 0;

    if (shouldShowLoading) {
      set({ isLoading: true });
    }

    try {
      // Load messages
      console.log(`[chatStore] Starting to load messages for ${type} ${id}`);
      await get().loadMessages(id, type);
      console.log(`[chatStore] Finished loading messages for ${type} ${id}`);
    } catch (error) {
      console.error(
        `[chatStore] Error reloading messages for ${type} ${id}:`,
        error,
      );
    } finally {
      console.log(`[chatStore] Completed reloading messages for ${type} ${id}`);
    }
  },

  // Xóa toàn bộ cache
  clearAllCache: () => {
    set({
      messageCache: {},
      groupCache: {},
      emptyMessageGroups: {},
      lastMessageLoadTime: {},
    });
    // Xóa thời gian gọi API cuối cùng
    get()._lastApiCallTime = {};
  },

  // Refresh the selected group data
  refreshSelectedGroup: async (): Promise<void> => {
    console.log(`[chatStore] Refreshing selected group data`);
    const { selectedGroup } = get();

    if (!selectedGroup || !selectedGroup.id) {
      console.log(`[chatStore] No selected group to refresh`);
      return;
    }

    const groupId = selectedGroup.id;

    // Kiểm tra thời gian gọi API cuối cùng
    const now = Date.now();
    const lastCallTime =
      get()._lastApiCallTime[`GROUP_${groupId}_refresh`] || 0;
    const timeSinceLastCall = now - lastCallTime;

    // Nếu đã gọi API trong vòng 5 giây, bỏ qua
    if (timeSinceLastCall < GROUP_REFRESH_THROTTLE) {
      console.log(
        `[chatStore] Skipping refresh, last call was ${timeSinceLastCall}ms ago`,
      );
      return;
    }

    // Cập nhật thời gian gọi API
    set((state) => ({
      _lastApiCallTime: {
        ...state._lastApiCallTime,
        [`GROUP_${groupId}_refresh`]: now,
      },
    }));

    try {
      // Trước tiên, kiểm tra xem có thông tin nhóm trong conversationsStore không
      const conversationsStore = useConversationsStore.getState();
      const groupConversation = conversationsStore.conversations.find(
        (conv) => conv.type === "GROUP" && conv.group?.id === groupId,
      );

      // Nếu có thông tin nhóm trong conversationsStore và đã được cập nhật gần đây, sử dụng nó
      if (groupConversation?.group) {
        const lastFetched = get().groupCache[groupId]?.lastFetched;
        if (lastFetched) {
          const timeSinceLastFetch = now - lastFetched.getTime();
          if (timeSinceLastFetch < GROUP_CACHE_VALIDITY) {
            console.log(
              `[chatStore] Using recent group data from conversationsStore for ${groupId}`,
            );

            // Update the selected group with data from conversationsStore
            const completeGroup = createCompleteGroup(groupConversation.group);
            set({ selectedGroup: completeGroup });

            // Update the cache
            set((state) => ({
              groupCache: {
                ...state.groupCache,
                [groupId]: {
                  group: completeGroup,
                  lastFetched: new Date(),
                },
              },
            }));

            return;
          }
        }
      }

      // Fetch updated group data
      console.log(`[chatStore] Fetching fresh group data for ${groupId}`);
      const result = await getGroupById(groupId);

      if (result.success && result.group) {
        console.log(
          `[chatStore] Group data refreshed successfully for ${groupId}`,
        );
        console.log(
          `[chatStore] New members count: ${result.group.members?.length || 0}`,
        );

        const completeGroup = createCompleteGroup(result.group);

        // Update the cache
        set((state) => ({
          groupCache: {
            ...state.groupCache,
            [groupId]: {
              group: completeGroup,
              lastFetched: new Date(),
            },
          },
        }));

        // Update the selected group with new data
        set({ selectedGroup: completeGroup });

        // Update the group in the conversations store as well
        conversationsStore.updateConversation(groupId, {
          group: completeGroup,
        });

        // Force UI update
        setTimeout(() => {
          conversationsStore.forceUpdate();
        }, 0);
      } else {
        console.log(`[chatStore] Failed to refresh group data for ${groupId}`);
      }
    } catch (error) {
      console.error("Error refreshing group data:", error);
    }
  },

  // Handle group dissolved event
  handleGroupDissolved: (groupId: string) => {
    set((state) => {
      if (state.selectedGroup?.id === groupId) {
        state.setSelectedGroup(null);
      }
      state.clearChatCache("GROUP", groupId);
      return state;
    });
  },

  // Handle member removed event
  handleMemberRemoved: (groupId: string) => {
    set((state) => {
      if (state.selectedGroup?.id === groupId) {
        state.setSelectedGroup(null);
      }
      state.clearChatCache("GROUP", groupId);
      return state;
    });
  },

  setShouldFetchMessages: (shouldFetch: boolean) => {
    set({ shouldFetchMessages: shouldFetch });
  },

  setShouldFetchGroupData: (shouldFetch: boolean) => {
    set({ shouldFetchGroupData: shouldFetch });
  },

  openChat: async (id: string, type: "USER" | "GROUP"): Promise<boolean> => {
    try {
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
        const result = await getUserDataById(id);
        if (result.success && result.user) {
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

          get().setSelectedContact(user as User & { userInfo: UserInfo });
          await get().loadMessages(id, "USER");
          return get().messages.length > 0;
        }
        return false;
      } else if (type === "GROUP") {
        const result = await getGroupById(id);
        if (result.success && result.group) {
          const group = result.group;
          // Ensure the group has all required properties
          const completeGroup: Group = {
            id: group.id,
            name: group.name,
            creatorId: group.creatorId || "",
            avatarUrl: group.avatarUrl ?? null,
            createdAt: group.createdAt || new Date(),
            members: group.members ?? [],
            messages: group.messages ?? [],
            memberUsers: group.memberUsers ?? [],
          };
          get().setSelectedGroup(completeGroup);
          await get().loadMessages(id, "GROUP");
          return true;
        }
        return false;
      }

      return false;
    } catch (error) {
      console.error(
        `[chatStore] Error opening chat with ${type} ID: ${id}:`,
        error,
      );
      return false;
    }
  },

  // Add missing syncWithConversationStore function
  syncWithConversationStore: (message: Message): void => {
    const conversationsStore = useConversationsStore.getState();
    conversationsStore.processNewMessage(message);
  },
}));
