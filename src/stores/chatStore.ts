import { create } from "zustand";
import { Message, MessageType, User, UserInfo } from "@/types/base";
import {
  getMessagesBetweenUsers,
  sendTextMessage,
  sendMediaMessage,
  recallMessage,
  deleteMessageForSelf,
} from "@/actions/message.action";

interface ChatState {
  // Current chat state
  messages: Message[];
  selectedContact: (User & { userInfo: UserInfo }) | null;
  replyingTo: Message | null;
  selectedMessage: Message | null;
  isDialogOpen: boolean;
  isLoading: boolean;

  // Actions
  setSelectedContact: (contact: (User & { userInfo: UserInfo }) | null) => void;
  loadMessages: (contactId: string) => Promise<void>;
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
  addMessage: (message: Message) => void;
  updateMessage: (messageId: string, updatedMessage: Partial<Message>) => void;
  removeMessage: (messageId: string) => void;
  clearChat: () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  // Initial state
  messages: [],
  selectedContact: null,
  replyingTo: null,
  selectedMessage: null,
  isDialogOpen: false,
  isLoading: false,

  // Actions
  setSelectedContact: (contact) => {
    set({ selectedContact: contact });
    if (contact) {
      get().loadMessages(contact.id);
    } else {
      set({ messages: [] });
    }
  },

  loadMessages: async (contactId) => {
    set({ isLoading: true });
    try {
      const result = await getMessagesBetweenUsers(contactId);
      if (result.success && result.messages) {
        // Get current state
        const { selectedContact } = get();
        const currentUser = selectedContact;

        // Process messages to ensure sender and receiver have userInfo
        const processedMessages = result.messages.map((message) => {
          // Create a copy of the message to avoid mutating the original
          const processedMessage = { ...message };

          // Ensure sender has userInfo
          if (processedMessage.sender) {
            // If sender is current user, always use current user's data
            if (processedMessage.senderId === currentUser?.id) {
              processedMessage.sender = { ...currentUser };
            }
            // If sender is selected contact, always use selected contact's data
            else if (
              selectedContact &&
              processedMessage.senderId === selectedContact.id
            ) {
              processedMessage.sender = { ...selectedContact };
            }
            // If sender doesn't have userInfo
            else if (!processedMessage.sender.userInfo) {
              // Create a fallback userInfo
              processedMessage.sender.userInfo = {
                id: processedMessage.sender.id,
                fullName:
                  processedMessage.sender.email ||
                  processedMessage.sender.phoneNumber ||
                  "Unknown",
                profilePictureUrl: null,
                statusMessage: "No status",
                blockStrangers: false,
                createdAt: new Date(),
                updatedAt: new Date(),
                userAuth: processedMessage.sender,
              };
            }
          }

          // Ensure receiver has userInfo if it exists
          if (
            processedMessage.receiver &&
            !processedMessage.receiver.userInfo
          ) {
            // If receiver is current user
            if (
              processedMessage.receiverId === currentUser?.id &&
              currentUser?.userInfo
            ) {
              processedMessage.receiver.userInfo = currentUser.userInfo;
            }
            // If receiver is selected contact
            else if (
              processedMessage.receiverId === selectedContact?.id &&
              selectedContact?.userInfo
            ) {
              processedMessage.receiver.userInfo = selectedContact.userInfo;
            }
            // Otherwise create a fallback userInfo
            else {
              processedMessage.receiver.userInfo = {
                id: processedMessage.receiver.id,
                fullName:
                  processedMessage.receiver.email ||
                  processedMessage.receiver.phoneNumber ||
                  "Unknown",
                profilePictureUrl: null,
                statusMessage: "No status",
                blockStrangers: false,
                createdAt: new Date(),
                updatedAt: new Date(),
                userAuth: processedMessage.receiver,
              };
            }
          }

          return processedMessage;
        });

        // Sắp xếp tin nhắn theo thời gian tạo, từ cũ đến mới
        const sortedMessages = [...processedMessages].sort((a, b) => {
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
    const { selectedContact } = get();

    if (
      !selectedContact ||
      (!text.trim() && !files?.length) ||
      !currentUser ||
      !currentUser.id
    ) {
      console.error(
        "Cannot send message: Missing contact, message text, or current user",
      );
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
      repliedTo: get().replyingTo?.id,
    };

    // Add temporary message to UI
    set((state) => ({
      messages: [...state.messages, tempMessage],
      replyingTo: null, // Clear reply state after sending
    }));

    try {
      // Send message to API
      let result;
      if (files && files.length > 0) {
        // Use sendMediaMessage if we have files
        result = await sendMediaMessage(selectedContact.id, text, files);
      } else {
        // Use sendTextMessage if we only have text
        result = await sendTextMessage(selectedContact.id, text);
      }

      if (result.success && result.message) {
        // Replace temporary message with real one from server
        set((state) => ({
          messages: state.messages.map((msg) =>
            msg.id === tempMessage.id ? result.message : msg,
          ),
        }));
      } else {
        // If sending failed, mark the message as failed
        console.error("Failed to send message:", result.error);
        // You could add error handling here, like marking the message as failed
      }
    } catch (error) {
      console.error("Error sending message:", error);
    }
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
      replyingTo: null,
      selectedMessage: null,
      isDialogOpen: false,
    });
  },
}));
