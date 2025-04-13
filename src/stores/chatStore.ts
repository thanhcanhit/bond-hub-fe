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

  // Actions
  setSelectedContact: (contact) => {
    set({
      selectedContact: contact,
      selectedGroup: null,
      currentChatType: contact ? "USER" : null,
    });
    if (contact) {
      get().loadMessages(contact.id, "USER");
    } else {
      set({ messages: [] });
    }
  },

  setSelectedGroup: (group) => {
    set({
      selectedGroup: group,
      selectedContact: null,
      currentChatType: group ? "GROUP" : null,
    });
    if (group) {
      get().loadMessages(group.id, "GROUP");
    } else {
      set({ messages: [] });
    }
  },

  loadMessages: async (id, type) => {
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

        set({ messages: sortedMessages });
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

    // Add temporary message to UI
    set((state) => ({
      messages: [...state.messages, tempMessage],
      replyingTo: null, // Clear reply state after sending
    }));

    // Update conversation list with temporary message
    if (currentChatType === "USER" && selectedContact) {
      // Get the conversations store
      const conversationsStore = useConversationsStore.getState();

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
        // Replace temporary message with real one from server
        set((state) => ({
          messages: state.messages.map((msg) =>
            msg.id === tempMessage.id ? result.message : msg,
          ),
        }));

        // Update conversation list with real message
        if (currentChatType === "USER" && selectedContact) {
          useConversationsStore
            .getState()
            .updateLastMessage(selectedContact.id, result.message);
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
      const result = await recallMessage(messageId);
      if (result.success && result.message) {
        set((state) => ({
          messages: state.messages.map((msg) =>
            msg.id === messageId ? result.message : msg,
          ),
        }));
      }
    } catch (error) {
      console.error("Error recalling message:", error);
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
    set((state) => ({ messages: [...state.messages, message] }));
  },

  updateMessage: (messageId, updatedMessage) => {
    set((state) => ({
      messages: state.messages.map((msg) =>
        msg.id === messageId ? { ...msg, ...updatedMessage } : msg,
      ),
    }));
  },

  removeMessage: (messageId) => {
    set((state) => ({
      messages: state.messages.filter((msg) => msg.id !== messageId),
    }));
  },

  clearChat: () => {
    set({
      messages: [],
      selectedContact: null,
      selectedGroup: null,
      currentChatType: null,
      replyingTo: null,
      selectedMessage: null,
      isDialogOpen: false,
    });
  },

  addReactionToMessageById: async (messageId, reaction) => {
    try {
      const result = await addReactionToMessage(messageId, reaction);
      if (result.success && result.message) {
        set((state) => ({
          messages: state.messages.map((msg) =>
            msg.id === messageId ? result.message : msg,
          ),
        }));
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
        set((state) => ({
          messages: state.messages.map((msg) =>
            msg.id === messageId ? result.message : msg,
          ),
        }));
      }
      return result.success;
    } catch (error) {
      console.error("Error removing reaction from message:", error);
      return false;
    }
  },

  markMessageAsReadById: async (messageId) => {
    try {
      const result = await markMessageAsRead(messageId);
      if (result.success && result.message) {
        set((state) => ({
          messages: state.messages.map((msg) =>
            msg.id === messageId ? result.message : msg,
          ),
        }));
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
        set((state) => ({
          messages: state.messages.map((msg) =>
            msg.id === messageId ? result.message : msg,
          ),
        }));
      }
      return result.success;
    } catch (error) {
      console.error("Error marking message as unread:", error);
      return false;
    }
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
}));
