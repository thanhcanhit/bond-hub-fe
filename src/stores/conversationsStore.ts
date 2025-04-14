import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { User, UserInfo, Message, Media } from "@/types/base";
import { getAllUsers, getUserDataById } from "@/actions/user.action";
import { getConversations } from "@/actions/message.action";

// Helper function to sort conversations by lastActivity (newest first)
const sortConversationsByActivity = (conversations: Conversation[]) => {
  return [...conversations].sort((a, b) => {
    return (
      new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime()
    );
  });
};

// Helper function to extract a name from an email address
const extractNameFromEmail = (email?: string | null): string => {
  if (!email) return "";

  // Extract the part before @ symbol
  const namePart = email.split("@")[0];

  // Convert to title case and replace dots/underscores with spaces
  return namePart
    .replace(/[._]/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

// Define a conversation type that includes the last message
export interface Conversation {
  contact: User & {
    userInfo: UserInfo;
    online?: boolean;
    lastSeen?: Date;
  };
  group?: {
    id: string;
    name: string;
    avatarUrl?: string | null;
    createdAt?: Date;
  };
  lastMessage?: Message;
  unreadCount: number;
  lastActivity: Date;
  type: "USER" | "GROUP";
  isTyping?: boolean;
  typingTimestamp?: Date;
}

// Define the API conversation interface
interface ApiConversation {
  id: string;
  type: "USER" | "GROUP";
  user?: {
    id: string;
    fullName: string;
    profilePictureUrl?: string | null;
    statusMessage?: string | null;
    lastSeen?: string | null;
  };
  group?: {
    id: string;
    name: string;
    avatarUrl?: string | null;
    createdAt?: string;
  };
  lastMessage?: {
    id: string;
    content: {
      text?: string;
      media?: Media[]; // Using Media type from base.ts
    };
    senderId: string;
    senderName: string;
    createdAt: string;
    recalled: boolean;
    isRead: boolean;
  };
  unreadCount: number;
  updatedAt: string;
}

interface ConversationsState {
  // State
  conversations: Conversation[];
  isLoading: boolean;
  searchQuery: string;

  // Actions
  loadConversations: (currentUserId: string) => Promise<void>;
  updateConversation: (
    contactId: string,
    updates: Partial<Conversation>,
  ) => void;
  addConversation: (conversation: Conversation) => void;
  removeConversation: (contactId: string) => void;
  updateLastMessage: (contactId: string, message: Message) => void;
  markAsRead: (contactId: string) => void;
  incrementUnread: (contactId: string) => void;
  setSearchQuery: (query: string) => void;
  getFilteredConversations: () => Conversation[];
  clearConversations: () => void;
  setTypingStatus: (contactId: string, isTyping: boolean) => void;
}

// Custom storage that handles SSR
const storage = {
  getItem: (name: string): string | null => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(name);
  },
  setItem: (name: string, value: string): void => {
    if (typeof window === "undefined") return;
    localStorage.setItem(name, value);
  },
  removeItem: (name: string): void => {
    if (typeof window === "undefined") return;
    localStorage.removeItem(name);
  },
};

export const useConversationsStore = create<ConversationsState>()(
  persist(
    (set, get) => ({
      // Initial state
      conversations: [],
      isLoading: false,
      searchQuery: "",

      // Actions
      loadConversations: async (currentUserId) => {
        set({ isLoading: true });
        try {
          // Use the new API endpoint to get conversations
          const result = await getConversations(1, 50);

          if (result.success && result.conversations) {
            // Format conversations from API response
            const formattedConversations = result.conversations
              .map((conv: ApiConversation) => {
                const isUserConversation = conv.type === "USER";

                if (isUserConversation && conv.user) {
                  return {
                    contact: {
                      id: conv.user.id,
                      userInfo: {
                        id: conv.user.id,
                        fullName: conv.user.fullName || "Unknown",
                        profilePictureUrl: conv.user.profilePictureUrl || null,
                        statusMessage: conv.user.statusMessage || null,
                        lastSeen: conv.user.lastSeen
                          ? new Date(conv.user.lastSeen)
                          : null,
                        blockStrangers: false,
                        createdAt: new Date(),
                        updatedAt: new Date(),
                        userAuth: { id: conv.user.id },
                      },
                    } as User & { userInfo: UserInfo },
                    // Convert the simplified lastMessage to our Message format
                    lastMessage: conv.lastMessage
                      ? ({
                          id: conv.lastMessage.id,
                          content: {
                            text: conv.lastMessage.content.text,
                            media: conv.lastMessage.content.media,
                          },
                          senderId: conv.lastMessage.senderId,
                          sender: {
                            id: conv.lastMessage.senderId,
                            userInfo: {
                              id: conv.lastMessage.senderId,
                              fullName: conv.lastMessage.senderName,
                              createdAt: new Date(),
                              updatedAt: new Date(),
                              blockStrangers: false,
                              userAuth: { id: conv.lastMessage.senderId },
                            },
                          } as User,
                          recalled: conv.lastMessage.recalled,
                          readBy: conv.lastMessage.isRead
                            ? [currentUserId]
                            : [],
                          deletedBy: [],
                          reactions: [],
                          createdAt: new Date(conv.lastMessage.createdAt),
                          updatedAt: new Date(conv.lastMessage.createdAt),
                        } as Message)
                      : undefined,
                    unreadCount: conv.unreadCount || 0,
                    lastActivity: new Date(conv.updatedAt),
                    type: conv.type,
                  };
                } else if (!isUserConversation && conv.group) {
                  return {
                    contact: {
                      id: conv.group.id,
                      userInfo: {
                        id: conv.group.id,
                        fullName: conv.group.name,
                        profilePictureUrl: conv.group.avatarUrl,
                        statusMessage: null,
                        blockStrangers: false,
                        createdAt: conv.group.createdAt
                          ? new Date(conv.group.createdAt)
                          : new Date(),
                        updatedAt: new Date(),
                        userAuth: { id: conv.group.id },
                      },
                    } as User & { userInfo: UserInfo },
                    lastMessage: conv.lastMessage
                      ? ({
                          id: conv.lastMessage.id,
                          content: {
                            text: conv.lastMessage.content.text,
                            media: conv.lastMessage.content.media,
                          },
                          senderId: conv.lastMessage.senderId,
                          sender: {
                            id: conv.lastMessage.senderId,
                            userInfo: {
                              id: conv.lastMessage.senderId,
                              fullName: conv.lastMessage.senderName,
                              createdAt: new Date(),
                              updatedAt: new Date(),
                              blockStrangers: false,
                              userAuth: { id: conv.lastMessage.senderId },
                            },
                          } as User,
                          recalled: conv.lastMessage.recalled,
                          readBy: conv.lastMessage.isRead
                            ? [currentUserId]
                            : [],
                          deletedBy: [],
                          reactions: [],
                          createdAt: new Date(conv.lastMessage.createdAt),
                          updatedAt: new Date(conv.lastMessage.createdAt),
                        } as Message)
                      : undefined,
                    unreadCount: conv.unreadCount || 0,
                    lastActivity: new Date(conv.updatedAt),
                    type: conv.type,
                  };
                } else {
                  // This shouldn't happen with valid data, but provide a fallback
                  return null;
                }
              })
              .filter(Boolean) as Conversation[]; // Filter out any null values

            set({
              conversations: sortConversationsByActivity(
                formattedConversations,
              ),
              isLoading: false,
            });
          } else {
            // Fallback to old method if the new API fails
            const result = await getAllUsers();
            if (result.success && result.users) {
              // Filter out current user
              const filteredUsers = result.users.filter(
                (user) => user.id !== currentUserId,
              );

              // Create initial conversations with basic info
              const conversations = filteredUsers.map((user) => ({
                contact: {
                  ...user,
                  userInfo: user.userInfo
                    ? {
                        ...user.userInfo,
                        // Ensure fullName is set properly
                        fullName:
                          user.userInfo.fullName ||
                          extractNameFromEmail(user.email) ||
                          user.phoneNumber ||
                          "Unknown",
                      }
                    : {
                        id: user.id,
                        fullName:
                          extractNameFromEmail(user.email) ||
                          user.phoneNumber ||
                          "Unknown",
                        profilePictureUrl: null,
                        statusMessage: "No status",
                        blockStrangers: false,
                        createdAt: new Date(),
                        updatedAt: new Date(),
                        userAuth: user,
                      },
                },
                lastMessage: undefined,
                unreadCount: 0,
                lastActivity: new Date(),
                type: "USER",
              }));

              // Sort conversations by lastActivity
              const sortedConversations =
                sortConversationsByActivity(conversations);
              set({ conversations: sortedConversations });

              // Fetch detailed user info for each contact in the background
              filteredUsers.forEach(async (user) => {
                try {
                  const userResult = await getUserDataById(user.id);
                  if (userResult.success && userResult.user) {
                    // Update the conversation with complete user data
                    const updatedUser = userResult.user;

                    // Ensure userInfo exists
                    if (!updatedUser.userInfo) {
                      updatedUser.userInfo = {
                        id: updatedUser.id,
                        fullName:
                          extractNameFromEmail(updatedUser.email) ||
                          updatedUser.phoneNumber ||
                          "Unknown",
                        profilePictureUrl: null,
                        statusMessage: "No status",
                        blockStrangers: false,
                        createdAt: new Date(),
                        updatedAt: new Date(),
                        userAuth: updatedUser,
                      };
                    }

                    // Update the conversation with the complete user data
                    set((state) => {
                      const updatedConversations = state.conversations.map(
                        (conv) =>
                          conv.contact.id === updatedUser.id
                            ? {
                                ...conv,
                                contact: updatedUser as User & {
                                  userInfo: UserInfo;
                                },
                              }
                            : conv,
                      );
                      return { conversations: updatedConversations };
                    });
                  }
                } catch (error) {
                  console.error(
                    `Error fetching detailed info for user ${user.id}:`,
                    error,
                  );
                }
              });
            }
          }
        } catch (error) {
          console.error("Error loading conversations:", error);
        } finally {
          set({ isLoading: false });
        }
      },

      updateConversation: (contactId, updates) => {
        set((state) => {
          // Tìm conversation dựa trên contactId hoặc groupId
          const updatedConversations = state.conversations.map((conv) => {
            // Kiểm tra nếu là conversation cần cập nhật
            const isTargetConversation =
              conv.contact.id === contactId || // User conversation
              (conv.type === "GROUP" && conv.group?.id === contactId); // Group conversation

            if (!isTargetConversation) return conv;

            // Nếu cập nhật bao gồm lastMessage, kiểm tra xem có cần cập nhật không
            if (
              updates.lastMessage &&
              conv.lastMessage &&
              updates.lastMessage.id === conv.lastMessage.id
            ) {
              console.log(
                `[conversationsStore] Message ${updates.lastMessage.id} is already the last message for ${contactId}, checking for updates`,
              );

              // So sánh các trường quan trọng để xem có thay đổi không
              const hasChanges =
                conv.lastMessage.recalled !== updates.lastMessage.recalled ||
                JSON.stringify(conv.lastMessage.readBy) !==
                  JSON.stringify(updates.lastMessage.readBy) ||
                JSON.stringify(conv.lastMessage.reactions) !==
                  JSON.stringify(updates.lastMessage.reactions);

              if (!hasChanges) {
                console.log(
                  `[conversationsStore] No changes detected for message ${updates.lastMessage.id}, skipping lastMessage update`,
                );
                // Cập nhật các trường khác nhưng giữ nguyên lastMessage
                const { lastMessage, ...otherUpdates } = updates;
                return { ...conv, ...otherUpdates };
              }

              console.log(
                `[conversationsStore] Changes detected for message ${updates.lastMessage.id}, updating`,
              );
            } else if (updates.lastMessage) {
              console.log(
                `[conversationsStore] Updating last message to ${updates.lastMessage.id} for ${contactId}`,
              );
            }

            return { ...conv, ...updates };
          });

          // If lastActivity was updated, sort conversations
          if (updates.lastActivity) {
            return {
              conversations: sortConversationsByActivity(updatedConversations),
            };
          }

          return { conversations: updatedConversations };
        });
      },

      addConversation: (conversation) => {
        // Check if conversation already exists
        const exists = get().conversations.some(
          (conv) => conv.contact.id === conversation.contact.id,
        );

        if (!exists) {
          set((state) => {
            const newConversations = [...state.conversations, conversation];
            return {
              conversations: sortConversationsByActivity(newConversations),
            };
          });
        }
      },

      removeConversation: (contactId) => {
        set((state) => ({
          conversations: state.conversations.filter(
            (conv) => conv.contact.id !== contactId,
          ),
        }));
      },

      updateLastMessage: (contactId, message) => {
        set((state) => {
          // Find the conversation
          const conversationIndex = state.conversations.findIndex(
            (conv) => conv.contact.id === contactId,
          );

          if (conversationIndex === -1) return state;

          // Kiểm tra xem tin nhắn đã là tin nhắn cuối cùng chưa
          const currentLastMessage =
            state.conversations[conversationIndex].lastMessage;
          if (currentLastMessage && currentLastMessage.id === message.id) {
            // Nếu tin nhắn đã là tin nhắn cuối cùng, chỉ cập nhật nếu có thay đổi
            console.log(
              `[conversationsStore] Message ${message.id} is already the last message, checking for updates`,
            );

            // So sánh các trường quan trọng để xem có thay đổi không
            const hasChanges =
              currentLastMessage.recalled !== message.recalled ||
              JSON.stringify(currentLastMessage.readBy) !==
                JSON.stringify(message.readBy) ||
              JSON.stringify(currentLastMessage.reactions) !==
                JSON.stringify(message.reactions);

            if (!hasChanges) {
              console.log(
                `[conversationsStore] No changes detected for message ${message.id}, skipping update`,
              );
              return state;
            }

            console.log(
              `[conversationsStore] Changes detected for message ${message.id}, updating`,
            );
          } else {
            console.log(
              `[conversationsStore] Updating last message to ${message.id} for contact ${contactId}`,
            );
          }

          // Create a new array with the updated conversation
          const updatedConversations = [...state.conversations];
          updatedConversations[conversationIndex] = {
            ...updatedConversations[conversationIndex],
            lastMessage: message,
            lastActivity: new Date(message.createdAt),
          };

          // Sort conversations by lastActivity (newest first)
          return {
            conversations: sortConversationsByActivity(updatedConversations),
          };
        });
      },

      markAsRead: (contactId) => {
        set((state) => {
          const updatedConversations = state.conversations.map((conv) =>
            conv.contact.id === contactId ? { ...conv, unreadCount: 0 } : conv,
          );

          // Keep the same sorting order
          return { conversations: updatedConversations };
        });
      },

      incrementUnread: (contactId) => {
        set((state) => {
          const updatedConversations = state.conversations.map((conv) =>
            conv.contact.id === contactId
              ? {
                  ...conv,
                  unreadCount: conv.unreadCount + 1,
                  lastActivity: new Date(), // Update lastActivity when incrementing unread count
                }
              : conv,
          );

          // Sort conversations to bring the one with new messages to the top
          return {
            conversations: sortConversationsByActivity(updatedConversations),
          };
        });
      },

      setSearchQuery: (query) => {
        set({ searchQuery: query });
      },

      getFilteredConversations: () => {
        const { conversations, searchQuery } = get();
        if (!searchQuery.trim()) return conversations;

        return conversations.filter((conv) => {
          const fullName = conv.contact.userInfo?.fullName?.toLowerCase() || "";
          const email = conv.contact.email?.toLowerCase() || "";
          const phone = conv.contact.phoneNumber?.toLowerCase() || "";
          const query = searchQuery.toLowerCase();

          return (
            fullName.includes(query) ||
            email.includes(query) ||
            phone.includes(query)
          );
        });
      },

      clearConversations: () => {
        set({ conversations: [], searchQuery: "" });
      },

      setTypingStatus: (contactId, isTyping) => {
        set((state) => {
          // Tìm conversation dựa trên contactId hoặc groupId
          const updatedConversations = state.conversations.map((conv) => {
            const isTargetConversation =
              conv.contact.id === contactId || // User conversation
              (conv.type === "GROUP" && conv.group?.id === contactId); // Group conversation

            if (!isTargetConversation) return conv;

            // Nếu đang nhập, cập nhật trạng thái và thời gian
            if (isTyping) {
              return {
                ...conv,
                isTyping: true,
                typingTimestamp: new Date(),
              };
            }
            // Nếu dừng nhập, xóa trạng thái
            else {
              return {
                ...conv,
                isTyping: false,
                typingTimestamp: undefined,
              };
            }
          });

          return { conversations: updatedConversations };
        });
      },
    }),
    {
      name: "conversations-storage",
      storage: createJSONStorage(() => storage),
      partialize: (state) => ({
        conversations: state.conversations,
      }),
    },
  ),
);
