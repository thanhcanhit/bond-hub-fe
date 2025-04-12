import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { User, UserInfo, Message } from "@/types/base";
import { getAllUsers, getUserDataById } from "@/actions/user.action";

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
  contact: User & { userInfo: UserInfo };
  lastMessage?: Message;
  unreadCount: number;
  lastActivity: Date;
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
        } catch (error) {
          console.error("Error loading conversations:", error);
        } finally {
          set({ isLoading: false });
        }
      },

      updateConversation: (contactId, updates) => {
        set((state) => {
          const updatedConversations = state.conversations.map((conv) =>
            conv.contact.id === contactId ? { ...conv, ...updates } : conv,
          );

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
