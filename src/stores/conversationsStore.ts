import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import {
  User,
  UserInfo,
  Message,
  Media,
  MessageType,
  GroupRole,
} from "@/types/base";
import { getAllUsers, getUserDataById } from "@/actions/user.action";
import { getConversations } from "@/actions/message.action";
import { useAuthStore } from "./authStore";

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
    memberIds?: string[];
    memberUsers?: Array<{
      id: string;
      fullName: string;
      profilePictureUrl?: string | null;
      role: GroupRole;
    }>;
    members?: Array<{
      id: string;
      userId: string;
      role: GroupRole;
      user: {
        id: string;
        userInfo: {
          id: string;
          fullName: string;
          profilePictureUrl?: string | null;
          createdAt: Date;
          updatedAt: Date;
          blockStrangers: boolean;
          userAuth: { id: string };
        };
      };
    }>;
  };
  lastMessage?: Message;
  unreadCount: number;
  lastActivity: Date;
  type: "USER" | "GROUP";
  isTyping?: boolean;
  typingTimestamp?: Date;
  // Thêm thông tin người đang nhập cho nhóm
  typingUsers?: Array<{
    userId: string;
    fullName: string;
    profilePictureUrl?: string | null;
    timestamp: Date;
  }>;
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
    members?: {
      id: string;
      userId: string;
      role: string;
      fullName: string;
      profilePictureUrl?: string | null;
      addedBy?: {
        id: string;
        fullName: string;
      };
    }[];
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

// Utility types for handling messages
interface MessageHandlingOptions {
  incrementUnreadCount?: boolean;
  markAsRead?: boolean;
  updateLastActivity?: boolean;
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
  setGroupTypingStatus: (
    groupId: string,
    userId: string,
    isTyping: boolean,
  ) => void;
  forceUpdate: () => void; // Force UI update
  checkAndRemoveGroups: (groupId: string, groupName?: string) => boolean; // Check and remove groups

  // New utility functions for better message handling
  processNewMessage: (
    message: Message,
    options?: MessageHandlingOptions,
  ) => void;
  findConversationByMessage: (message: Message) => Conversation | undefined;
  ensureConversationExists: (message: Message) => void;
  isMessageNewerThanLastMessage: (
    conversation: Conversation,
    message: Message,
  ) => boolean;
}

// Add TypeScript declaration for window property
declare global {
  interface Window {
    _conversationsForceUpdateTimeout: NodeJS.Timeout | null;
  }
}

// Helper function to create a placeholder user with all required fields
const createPlaceholderUserLocal = (
  userId: string,
): User & { userInfo: UserInfo } => {
  return {
    id: userId,
    email: null,
    phoneNumber: null,
    passwordHash: "",
    createdAt: new Date(),
    updatedAt: new Date(),
    userInfo: {
      id: userId,
      fullName: `Người dùng ${userId.slice(-4)}`, // Use last 4 chars of ID for uniqueness
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
};

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

                // Create a message object from the API response
                const createMessageFromApi = (
                  apiMessage:
                    | {
                        id: string;
                        content: {
                          text?: string;
                          media?: Media[];
                        };
                        senderId: string;
                        senderName: string;
                        createdAt: string;
                        recalled: boolean;
                        isRead: boolean;
                      }
                    | undefined,
                ): Message | undefined => {
                  if (!apiMessage) return undefined;

                  // Tìm thông tin người gửi từ danh sách thành viên nhóm nếu là tin nhắn nhóm
                  let senderInfo: Pick<
                    UserInfo,
                    "id" | "fullName" | "profilePictureUrl"
                  > | null = null;
                  if (!isUserConversation && conv.group?.members) {
                    const memberInfo = conv.group.members.find(
                      (m) => m.userId === apiMessage.senderId,
                    );
                    if (memberInfo) {
                      senderInfo = {
                        id: memberInfo.userId,
                        fullName: memberInfo.fullName,
                        profilePictureUrl: memberInfo.profilePictureUrl,
                      };
                    }
                  }

                  return {
                    id: apiMessage.id,
                    content: {
                      text: apiMessage.content.text,
                      media: apiMessage.content.media || [],
                    },
                    senderId: apiMessage.senderId,
                    sender: {
                      id: apiMessage.senderId,
                      userInfo: {
                        id: apiMessage.senderId,
                        fullName: senderInfo?.fullName || apiMessage.senderName,
                        profilePictureUrl:
                          senderInfo?.profilePictureUrl || null,
                        createdAt: new Date(),
                        updatedAt: new Date(),
                        blockStrangers: false,
                        userAuth: { id: apiMessage.senderId },
                      },
                    } as User,
                    recalled: apiMessage.recalled,
                    readBy: apiMessage.isRead ? [currentUserId] : [],
                    deletedBy: [],
                    reactions: [],
                    createdAt: new Date(apiMessage.createdAt),
                    updatedAt: new Date(apiMessage.createdAt),
                    messageType: isUserConversation
                      ? MessageType.USER
                      : MessageType.GROUP,
                    groupId: !isUserConversation ? conv.id : undefined,
                  } as Message;
                };

                if (isUserConversation && conv.user) {
                  // Handle user conversation
                  // Determine online status based on lastSeen
                  const isOnline = conv.user.lastSeen
                    ? new Date().getTime() -
                        new Date(conv.user.lastSeen).getTime() <
                      5 * 60 * 1000
                    : false;

                  const userContact = {
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
                    // Add online status based on lastSeen (consider online if active in last 5 minutes)
                    online: isOnline,
                  } as User & { userInfo: UserInfo; online?: boolean };

                  return {
                    contact: userContact,
                    user: userContact, // Store the user object in the new field
                    lastMessage: createMessageFromApi(conv.lastMessage),
                    unreadCount: conv.unreadCount || 0,
                    lastActivity: new Date(conv.updatedAt),
                    type: conv.type,
                  };
                } else if (!isUserConversation && conv.group) {
                  // Handle group conversation
                  // Create a proper Group object from the API response
                  const groupMembers =
                    conv.group?.members?.map((member) => ({
                      id: member.id,
                      groupId: conv.group?.id || "",
                      userId: member.userId,
                      role: member.role as GroupRole,
                      joinedAt: new Date(),
                      user: {
                        id: member.userId,
                        userInfo: {
                          id: member.userId,
                          fullName: member.fullName,
                          profilePictureUrl: member.profilePictureUrl,
                          createdAt: new Date(),
                          updatedAt: new Date(),
                          blockStrangers: false,
                          userAuth: { id: member.userId },
                        },
                      } as User,
                      addedBy: {
                        id: member.addedBy?.id || "",
                        userInfo: {
                          id: member.addedBy?.id || "",
                          fullName: member.addedBy?.fullName || "Unknown",
                          createdAt: new Date(),
                          updatedAt: new Date(),
                          blockStrangers: false,
                          userAuth: { id: member.addedBy?.id || "" },
                        },
                      } as User,
                      addedById: member.addedBy?.id || "",
                    })) || [];

                  // Create a simplified Group object without circular references
                  const group = {
                    id: conv.group?.id || "",
                    name: conv.group?.name || "Nhóm chat",
                    creatorId:
                      groupMembers?.find((m) => m.role === GroupRole.LEADER)
                        ?.userId || "",
                    avatarUrl: conv.group?.avatarUrl || null,
                    createdAt: new Date(),
                    // Store only member IDs to avoid circular references
                    memberIds: groupMembers?.map((m) => m.id) || [],
                    // Store member information directly from API response
                    memberUsers:
                      conv.group?.members?.map((member) => ({
                        id: member.userId,
                        fullName: member.fullName || "",
                        profilePictureUrl: member.profilePictureUrl,
                        role: member.role as GroupRole,
                        // Add additional fields that might be useful
                        addedById: member.addedBy?.id,
                        addedByName: member.addedBy?.fullName,
                      })) || [],
                    messages: [],
                  };

                  // Create a contact representation for the group
                  const groupContact = {
                    id: conv.group?.id || "",
                    userInfo: {
                      id: conv.group?.id || "",
                      fullName: conv.group?.name || "Nhóm chat",
                      profilePictureUrl: conv.group?.avatarUrl,
                      statusMessage: null,
                      blockStrangers: false,
                      createdAt: new Date(),
                      updatedAt: new Date(),
                      userAuth: { id: conv.group.id },
                    },
                  } as User & { userInfo: UserInfo };

                  return {
                    contact: groupContact,
                    group: {
                      id: group.id,
                      name: group.name,
                      avatarUrl: group.avatarUrl,
                      createdAt: group.createdAt,
                      memberIds: group.memberIds,
                      memberUsers: group.memberUsers,
                    },
                    lastMessage: createMessageFromApi(conv.lastMessage),
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
              const initialConversations: Conversation[] = filteredUsers.map(
                (user) => ({
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
                }),
              );

              // Sort conversations by lastActivity
              const sortedConversations =
                sortConversationsByActivity(initialConversations);
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
                // Use type assertion to help TypeScript understand the structure
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                const { lastMessage, ...otherUpdates } = updates as {
                  lastMessage: Message;
                } & Partial<Conversation>;
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
          (conv) =>
            (conv.type === "USER" &&
              conversation.type === "USER" &&
              conv.contact.id === conversation.contact.id) ||
            (conv.type === "GROUP" &&
              conversation.type === "GROUP" &&
              conv.group?.id === conversation.group?.id),
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
        console.log(
          `[conversationsStore] Removing conversation with ID: ${contactId}`,
        );

        set((state) => {
          // Log current conversations for debugging
          console.log(
            `[conversationsStore] Current conversations before removal:`,
            state.conversations.map((c) => ({
              id: c.type === "GROUP" ? c.group?.id : c.contact.id,
              type: c.type,
              name:
                c.type === "GROUP"
                  ? c.group?.name
                  : c.contact.userInfo?.fullName,
            })),
          );

          // Filter out the conversation
          const filteredConversations = state.conversations.filter(
            (conv) =>
              conv.contact.id !== contactId &&
              (conv.type !== "GROUP" || conv.group?.id !== contactId),
          );

          console.log(
            `[conversationsStore] Conversations after removal: ${filteredConversations.length}`,
          );

          return { conversations: filteredConversations };
        });

        // Force UI update by notifying subscribers with a new object reference
        // This ensures React detects the state change and re-renders components
        setTimeout(() => {
          console.log(
            `[conversationsStore] Forcing UI update after removing conversation ${contactId}`,
          );
          get().forceUpdate();
        }, 0);
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
        // First check if there's anything to mark as read
        const state = get();
        const conversation = state.conversations.find(
          (conv) =>
            conv.contact.id === contactId ||
            (conv.type === "GROUP" && conv.group?.id === contactId),
        );

        // Only update if the conversation exists and has unread messages
        if (conversation && conversation.unreadCount > 0) {
          console.log(
            `[conversationsStore] Marking conversation with ${contactId} as read (unread: ${conversation.unreadCount})`,
          );

          set((state) => {
            const updatedConversations = state.conversations.map((conv) =>
              conv.contact.id === contactId ||
              (conv.type === "GROUP" && conv.group?.id === contactId)
                ? { ...conv, unreadCount: 0 }
                : conv,
            );

            // Keep the same sorting order
            return { conversations: updatedConversations };
          });
        } else {
          console.log(
            `[conversationsStore] Conversation with ${contactId} already read or not found, skipping`,
          );
        }
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
          const query = searchQuery.toLowerCase();

          if (conv.type === "GROUP" && conv.group) {
            // Tìm kiếm trong tên nhóm
            const groupName = conv.group.name?.toLowerCase() || "";
            return groupName.includes(query);
          } else {
            // Tìm kiếm trong thông tin liên hệ
            const fullName =
              conv.contact.userInfo?.fullName?.toLowerCase() || "";
            const email = conv.contact.email?.toLowerCase() || "";
            const phone = conv.contact.phoneNumber?.toLowerCase() || "";

            return (
              fullName.includes(query) ||
              email.includes(query) ||
              phone.includes(query)
            );
          }
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

      setGroupTypingStatus: (groupId, userId, isTyping) => {
        set((state) => {
          // Tìm conversation nhóm dựa trên groupId
          const updatedConversations = state.conversations.map((conv) => {
            // Chỉ xử lý nếu là nhóm và đúng groupId
            if (conv.type !== "GROUP" || conv.group?.id !== groupId)
              return conv;

            // Tìm thông tin người dùng đang nhập từ danh sách thành viên nhóm
            const typingUserInfo = conv.group?.memberUsers?.find(
              (member) => member.id === userId,
            );

            // Đảm bảo có tên người dùng hợp lệ
            const userFullName =
              typingUserInfo?.fullName && typingUserInfo.fullName.trim()
                ? typingUserInfo.fullName
                : "Thành viên nhóm";

            console.log(
              `[conversationsStore] Group typing: User ${userId} (${userFullName}) is ${isTyping ? "typing" : "stopped typing"} in group ${groupId}`,
            );

            // Nếu đang nhập, thêm vào danh sách người đang nhập
            if (isTyping) {
              // Tạo một danh sách người đang nhập mới hoặc sử dụng danh sách hiện tại
              const currentTypingUsers = conv.typingUsers || [];

              // Kiểm tra xem người dùng đã có trong danh sách chưa
              const userIndex = currentTypingUsers.findIndex(
                (u) => u.userId === userId,
              );

              let updatedTypingUsers: Array<{
                userId: string;
                fullName: string;
                profilePictureUrl?: string | null;
                timestamp: Date;
              }>;
              if (userIndex >= 0) {
                // Cập nhật thời gian và thông tin người dùng nếu người dùng đã có trong danh sách
                updatedTypingUsers = [...currentTypingUsers];
                updatedTypingUsers[userIndex] = {
                  ...updatedTypingUsers[userIndex],
                  fullName: userFullName, // Cập nhật tên người dùng
                  profilePictureUrl: typingUserInfo?.profilePictureUrl || null,
                  timestamp: new Date(),
                };
              } else {
                // Thêm người dùng mới vào danh sách
                updatedTypingUsers = [
                  ...currentTypingUsers,
                  {
                    userId,
                    fullName: userFullName,
                    profilePictureUrl:
                      typingUserInfo?.profilePictureUrl || null,
                    timestamp: new Date(),
                  },
                ];
              }

              return {
                ...conv,
                isTyping: true,
                typingTimestamp: new Date(),
                typingUsers: updatedTypingUsers,
              };
            }
            // Nếu dừng nhập, xóa người dùng khỏi danh sách người đang nhập
            else {
              // Lọc người dùng ra khỏi danh sách
              const updatedTypingUsers = (conv.typingUsers || []).filter(
                (u) => u.userId !== userId,
              );

              return {
                ...conv,
                // Chỉ đặt isTyping = false nếu không còn ai đang nhập
                isTyping: updatedTypingUsers.length > 0,
                typingTimestamp:
                  updatedTypingUsers.length > 0 ? new Date() : undefined,
                typingUsers: updatedTypingUsers,
              };
            }
          });

          return { conversations: updatedConversations };
        });
      },

      // Utility function to find a conversation based on a message
      findConversationByMessage: (message) => {
        const { conversations } = get();
        const currentUser = useAuthStore.getState().user;

        if (!currentUser) return undefined;

        // Đảm bảo tin nhắn có messageType được đặt chính xác
        const processedMessage = { ...message };

        // Nếu không có messageType, hãy xác định dựa trên các trường khác
        if (!processedMessage.messageType) {
          if (processedMessage.groupId) {
            processedMessage.messageType = MessageType.GROUP;
            console.log(
              `[conversationsStore] Set messageType to GROUP for message ${processedMessage.id}`,
            );
          } else if (processedMessage.receiverId) {
            processedMessage.messageType = MessageType.USER;
            console.log(
              `[conversationsStore] Set messageType to USER for message ${processedMessage.id}`,
            );
          }
        }

        // Xác định rõ ràng loại tin nhắn dựa trên messageType và các trường khác
        const isGroupMessage =
          processedMessage.messageType === MessageType.GROUP;
        const isUserMessage = processedMessage.messageType === MessageType.USER;

        console.log(
          `[conversationsStore] Finding conversation for message ${processedMessage.id}, type: ${processedMessage.messageType}`,
        );

        // Xử lý tin nhắn nhóm
        if (isGroupMessage && processedMessage.groupId) {
          // Tìm cuộc trò chuyện nhóm
          const groupConversation = conversations.find(
            (conv) =>
              conv.type === "GROUP" &&
              conv.group?.id === processedMessage.groupId,
          );

          if (groupConversation) {
            console.log(
              `[conversationsStore] Found group conversation for message ${processedMessage.id}: ${processedMessage.groupId}`,
            );
          } else {
            console.log(
              `[conversationsStore] Group conversation not found for message ${processedMessage.id}: ${processedMessage.groupId}`,
            );
          }

          return groupConversation;
        }
        // Xử lý tin nhắn trực tiếp
        else if (
          isUserMessage ||
          (!isGroupMessage && !processedMessage.groupId)
        ) {
          // Đối với tin nhắn trực tiếp, tìm cuộc trò chuyện với người dùng khác
          const otherUserId =
            processedMessage.senderId === currentUser.id
              ? processedMessage.receiverId
              : processedMessage.senderId;

          if (!otherUserId) {
            console.log(
              `[conversationsStore] Cannot determine other user ID for message ${processedMessage.id}`,
            );
            return undefined;
          }

          const userConversation = conversations.find(
            (conv) => conv.type === "USER" && conv.contact.id === otherUserId,
          );

          if (userConversation) {
            console.log(
              `[conversationsStore] Found user conversation for message ${processedMessage.id} with user ${otherUserId}`,
            );
          } else {
            console.log(
              `[conversationsStore] User conversation not found for message ${processedMessage.id} with user ${otherUserId}`,
            );
          }

          return userConversation;
        }

        // Nếu không thể xác định loại cuộc trò chuyện, ghi log và trả về undefined
        console.log(
          `[conversationsStore] Could not determine conversation type for message:`,
          processedMessage,
        );
        return undefined;
      },

      // Utility function to check if a message is newer than the last message in a conversation
      isMessageNewerThanLastMessage: (conversation, message) => {
        if (!conversation.lastMessage) return true;

        return (
          new Date(message.createdAt).getTime() >=
          new Date(conversation.lastMessage.createdAt).getTime()
        );
      },

      // Utility function to ensure a conversation exists for a message
      ensureConversationExists: (message) => {
        const { conversations, addConversation } = get();
        const currentUser = useAuthStore.getState().user;

        if (!currentUser) return;

        // Đảm bảo tin nhắn có messageType được đặt chính xác
        const processedMessage = { ...message };

        // Nếu không có messageType, hãy xác định dựa trên các trường khác
        if (!processedMessage.messageType) {
          if (processedMessage.groupId) {
            processedMessage.messageType = MessageType.GROUP;
            console.log(
              `[conversationsStore] Set messageType to GROUP for message ${processedMessage.id}`,
            );
          } else if (processedMessage.receiverId) {
            processedMessage.messageType = MessageType.USER;
            console.log(
              `[conversationsStore] Set messageType to USER for message ${processedMessage.id}`,
            );
          }
        }

        // Xác định rõ ràng loại tin nhắn dựa trên messageType và các trường khác
        const isGroupMessage =
          processedMessage.messageType === MessageType.GROUP;
        const isUserMessage = processedMessage.messageType === MessageType.USER;

        if (
          isGroupMessage &&
          processedMessage.groupId &&
          processedMessage.group
        ) {
          // Kiểm tra xem cuộc trò chuyện nhóm đã tồn tại chưa
          const existingConversation = conversations.find(
            (conv) =>
              conv.type === "GROUP" &&
              conv.group?.id === processedMessage.groupId,
          );

          if (!existingConversation) {
            console.log(
              `[conversationsStore] Creating new group conversation with ${processedMessage.groupId}`,
            );

            // Tạo placeholder contact cho cuộc trò chuyện nhóm
            const placeholderContact: User & { userInfo: UserInfo } = {
              id: processedMessage.senderId || "unknown",
              email: "",
              phoneNumber: "",
              passwordHash: "",
              createdAt: new Date(),
              updatedAt: new Date(),
              userInfo: {
                id: processedMessage.senderId || "unknown",
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

            // Add new group conversation
            addConversation({
              contact: placeholderContact,
              group: {
                id: processedMessage.group.id,
                name: processedMessage.group.name,
                avatarUrl: processedMessage.group.avatarUrl,
                createdAt: processedMessage.group.createdAt,
              },
              lastMessage: processedMessage,
              unreadCount: processedMessage.senderId !== currentUser.id ? 1 : 0,
              lastActivity: new Date(processedMessage.createdAt),
              type: "GROUP",
            });
          }
        } else if (
          isUserMessage ||
          (!isGroupMessage && !processedMessage.groupId)
        ) {
          // Chỉ tạo cuộc trò chuyện trực tiếp nếu đây không phải là tin nhắn nhóm
          // Xử lý cuộc trò chuyện trực tiếp
          const contactId =
            processedMessage.senderId === currentUser.id
              ? processedMessage.receiverId
              : processedMessage.senderId;

          if (!contactId) return;

          // Check if user conversation exists
          const existingConversation = conversations.find(
            (conv) => conv.type === "USER" && conv.contact.id === contactId,
          );

          if (!existingConversation) {
            console.log(
              `[conversationsStore] Creating new user conversation with ${contactId}`,
            );

            // Nếu tin nhắn từ người dùng hiện tại, sử dụng người nhận làm liên hệ
            if (
              processedMessage.senderId === currentUser.id &&
              processedMessage.receiver
            ) {
              addConversation({
                contact: processedMessage.receiver as User & {
                  userInfo: UserInfo;
                },
                lastMessage: processedMessage,
                unreadCount: 0, // Tin nhắn từ chính mình, nên unreadCount = 0
                lastActivity: new Date(processedMessage.createdAt),
                type: "USER",
              });
            }
            // Nếu tin nhắn từ người dùng khác, sử dụng người gửi làm liên hệ
            else if (
              processedMessage.sender &&
              processedMessage.sender.userInfo
            ) {
              addConversation({
                contact: processedMessage.sender as User & {
                  userInfo: UserInfo;
                },
                lastMessage: processedMessage,
                unreadCount: 1, // Tin nhắn từ người khác, nên unreadCount = 1
                lastActivity: new Date(processedMessage.createdAt),
                type: "USER",
              });
            }
            // If no sender/receiver info, fetch from API
            else {
              console.log(
                `[conversationsStore] Fetching user data for new conversation: ${contactId}`,
              );
              getUserDataById(contactId)
                .then((result) => {
                  if (result.success && result.user) {
                    // Ensure userInfo exists with proper fallback
                    if (!result.user.userInfo) {
                      result.user.userInfo = {
                        id: result.user.id,
                        fullName:
                          result.user.email ||
                          result.user.phoneNumber ||
                          "Người dùng",
                        profilePictureUrl: null,
                        statusMessage: "No status",
                        blockStrangers: false,
                        createdAt: new Date(),
                        updatedAt: new Date(),
                        userAuth: result.user,
                      };
                    } else if (
                      !result.user.userInfo.fullName ||
                      result.user.userInfo.fullName === "Unknown"
                    ) {
                      // Improve the display name if it's "Unknown"
                      let betterName = "Người dùng";
                      if (result.user.email) {
                        const emailParts = result.user.email.split("@");
                        if (emailParts[0]) {
                          if (
                            emailParts[0].includes(".") ||
                            emailParts[0].includes("_")
                          ) {
                            betterName = emailParts[0]
                              .split(/[._]/)
                              .map(
                                (part) =>
                                  part.charAt(0).toUpperCase() + part.slice(1),
                              )
                              .join(" ");
                          } else {
                            betterName =
                              emailParts[0].charAt(0).toUpperCase() +
                              emailParts[0].slice(1);
                          }
                        }
                      } else if (result.user.phoneNumber) {
                        betterName = result.user.phoneNumber;
                      }
                      result.user.userInfo.fullName = betterName;
                    }

                    addConversation({
                      contact: result.user as User & { userInfo: UserInfo },
                      lastMessage: processedMessage,
                      unreadCount:
                        processedMessage.senderId !== currentUser.id ? 1 : 0,
                      lastActivity: new Date(processedMessage.createdAt),
                      type: "USER",
                    });
                  } else {
                    console.warn(
                      `[conversationsStore] Failed to fetch user data for ${contactId}, creating placeholder`,
                    );
                    // Create a placeholder conversation with better fallback
                    const placeholderUser =
                      createPlaceholderUserLocal(contactId);

                    addConversation({
                      contact: placeholderUser,
                      lastMessage: processedMessage,
                      unreadCount:
                        processedMessage.senderId !== currentUser.id ? 1 : 0,
                      lastActivity: new Date(processedMessage.createdAt),
                      type: "USER",
                    });
                  }
                })
                .catch((error) => {
                  console.error(
                    `[conversationsStore] Error fetching user data for ${contactId}:`,
                    error,
                  );
                  // Create a placeholder conversation even on error
                  const placeholderUser = createPlaceholderUserLocal(contactId);

                  addConversation({
                    contact: placeholderUser,
                    lastMessage: processedMessage,
                    unreadCount:
                      processedMessage.senderId !== currentUser.id ? 1 : 0,
                    lastActivity: new Date(processedMessage.createdAt),
                    type: "USER",
                  });
                });
            }
          }
        }
      },

      // Main function to process new messages
      // Force UI update by creating a new reference to the conversations array
      // Optimized to prevent infinite update loops
      forceUpdate: () => {
        console.log("[conversationsStore] Forcing UI update");

        // Use a debounced version to prevent multiple calls in quick succession
        if (typeof window !== "undefined") {
          // Clear any existing timeout
          if (window._conversationsForceUpdateTimeout) {
            clearTimeout(window._conversationsForceUpdateTimeout);
          }

          // Set a new timeout
          window._conversationsForceUpdateTimeout = setTimeout(() => {
            set((state) => ({
              ...state,
              conversations: [...state.conversations],
            }));
            window._conversationsForceUpdateTimeout = null;
          }, 50); // Small delay to batch multiple calls
        } else {
          // Fallback for SSR
          set((state) => ({
            ...state,
            conversations: [...state.conversations],
          }));
        }
      },

      // Check and remove groups that the user has been removed from
      checkAndRemoveGroups: (groupId: string, groupName?: string) => {
        if (!groupId) {
          console.error(
            `[conversationsStore] Invalid groupId provided to checkAndRemoveGroups`,
          );
          return false;
        }

        const groupNameLog = groupName ? ` (${groupName})` : "";
        console.log(
          `[conversationsStore] Checking if user has been removed from group ${groupId}${groupNameLog}`,
        );

        try {
          const conversations = get().conversations;
          const groupConversation = conversations.find(
            (conv) => conv.type === "GROUP" && conv.group?.id === groupId,
          );

          if (groupConversation) {
            const displayName =
              groupName || groupConversation.group?.name || groupId;
            console.log(
              `[conversationsStore] Found group ${displayName} (${groupId}) in conversations, removing it`,
            );

            // Remove the group from conversations
            get().removeConversation(groupId);
            console.log(
              `[conversationsStore] Removed group ${displayName} (${groupId}) from conversations`,
            );

            // Force UI update immediately
            setTimeout(() => {
              get().forceUpdate();
              console.log(
                `[conversationsStore] Forced UI update after removal from group ${displayName} (${groupId})`,
              );
            }, 0);

            return true;
          } else {
            const displayName = groupName || groupId;
            console.log(
              `[conversationsStore] Group ${displayName} (${groupId}) not found in conversations, no action needed`,
            );
            return false;
          }
        } catch (error) {
          console.error(
            `[conversationsStore] Error in checkAndRemoveGroups:`,
            error,
          );
          return false;
        }
      },

      processNewMessage: (message, options = {}) => {
        const {
          incrementUnreadCount = true,
          markAsRead = false,
          updateLastActivity = true,
        } = options;

        const currentUser = useAuthStore.getState().user;
        if (!currentUser) return;

        // First ensure the conversation exists
        get().ensureConversationExists(message);

        // Find the conversation for this message
        const conversation = get().findConversationByMessage(message);
        if (!conversation) return;

        // Check if this message is newer than the current last message
        const isNewer = get().isMessageNewerThanLastMessage(
          conversation,
          message,
        );

        if (isNewer) {
          console.log(
            `[conversationsStore] Processing new message ${message.id} for conversation`,
          );

          // Update based on conversation type
          if (conversation.type === "USER") {
            // Update last message for user conversation
            get().updateLastMessage(conversation.contact.id, message);

            // Increment unread count if needed
            if (incrementUnreadCount && message.senderId !== currentUser.id) {
              get().incrementUnread(conversation.contact.id);
            }

            // Mark as read if needed
            if (markAsRead) {
              get().markAsRead(conversation.contact.id);
            }
          } else if (conversation.type === "GROUP" && conversation.group) {
            // Update group conversation
            const updates: Partial<Conversation> = {
              lastMessage: message,
            };

            if (updateLastActivity) {
              updates.lastActivity = new Date(message.createdAt);
            }

            if (incrementUnreadCount && message.senderId !== currentUser.id) {
              updates.unreadCount = (conversation.unreadCount || 0) + 1;
            }

            if (markAsRead) {
              updates.unreadCount = 0;
            }

            get().updateConversation(conversation.group.id, updates);
          }
        } else {
          console.log(
            `[conversationsStore] Message ${message.id} is older than current last message, skipping update`,
          );
        }
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
