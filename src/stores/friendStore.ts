import { create } from "zustand";
import {
  getFriendsList,
  getReceivedFriendRequests,
  getSentFriendRequests,
  acceptFriendRequest,
  rejectFriendRequest,
  cancelFriendRequest,
  blockUser,
  unblockUser,
  getBlockedUsers,
  SimpleFriend,
} from "@/actions/friend.action";
import { useAuthStore } from "@/stores/authStore";

// Define types for friend requests
interface FriendRequest {
  id: string;
  fullName: string;
  profilePictureUrl: string;
  message: string;
  timeAgo: string;
}

interface SentRequest {
  id: string;
  fullName: string;
  profilePictureUrl: string;
  timeAgo: string;
}

interface FriendStore {
  // State
  friends: SimpleFriend[];
  receivedRequests: FriendRequest[];
  sentRequests: SentRequest[];
  blockedUsers: SimpleFriend[];
  isLoading: {
    friends: boolean;
    receivedRequests: boolean;
    sentRequests: boolean;
    blockedUsers: boolean;
  };
  error: {
    friends: string | null;
    receivedRequests: string | null;
    sentRequests: string | null;
    blockedUsers: string | null;
  };

  // Actions
  fetchFriends: () => Promise<void>;
  fetchReceivedRequests: () => Promise<void>;
  fetchSentRequests: () => Promise<void>;
  fetchBlockedUsers: () => Promise<void>;
  acceptRequest: (requestId: string) => Promise<boolean>;
  rejectRequest: (requestId: string) => Promise<boolean>;
  cancelRequest: (requestId: string) => Promise<boolean>;
  blockFriend: (userId: string) => Promise<boolean>;
  unblockFriend: (userId: string) => Promise<boolean>;
}

export const useFriendStore = create<FriendStore>((set, get) => ({
  friends: [],
  receivedRequests: [],
  sentRequests: [],
  blockedUsers: [],
  isLoading: {
    friends: false,
    receivedRequests: false,
    sentRequests: false,
    blockedUsers: false,
  },
  error: {
    friends: null,
    receivedRequests: null,
    sentRequests: null,
    blockedUsers: null,
  },

  // Fetch friends list
  fetchFriends: async () => {
    set((state) => ({
      isLoading: {
        ...state.isLoading,
        friends: true,
      },
      error: {
        ...state.error,
        friends: null,
      },
    }));

    try {
      const token = useAuthStore.getState().accessToken || undefined;
      const response = await getFriendsList(token);
      if (response.success) {
        set((state) => ({
          friends: response.friends,
          isLoading: {
            ...state.isLoading,
            friends: false,
          },
        }));
      } else {
        set((state) => ({
          error: {
            ...state.error,
            friends: response.error || "Failed to fetch friends",
          },
          isLoading: {
            ...state.isLoading,
            friends: false,
          },
        }));
      }
    } catch {
      set((state) => ({
        error: {
          ...state.error,
          friends: "Failed to fetch friends",
        },
        isLoading: {
          ...state.isLoading,
          friends: false,
        },
      }));
    }
  },

  // Fetch received friend requests
  fetchReceivedRequests: async () => {
    set((state) => ({
      isLoading: {
        ...state.isLoading,
        receivedRequests: true,
      },
      error: {
        ...state.error,
        receivedRequests: null,
      },
    }));

    try {
      const token = useAuthStore.getState().accessToken || undefined;
      const response = await getReceivedFriendRequests(token);
      if (response.success) {
        set((state) => ({
          receivedRequests: response.requests,
          isLoading: {
            ...state.isLoading,
            receivedRequests: false,
          },
        }));
      } else {
        set((state) => ({
          error: {
            ...state.error,
            receivedRequests:
              response.error || "Failed to fetch friend requests",
          },
          isLoading: {
            ...state.isLoading,
            receivedRequests: false,
          },
        }));
      }
    } catch {
      set((state) => ({
        error: {
          ...state.error,
          receivedRequests: "Failed to fetch friend requests",
        },
        isLoading: {
          ...state.isLoading,
          receivedRequests: false,
        },
      }));
    }
  },

  // Fetch sent friend requests
  fetchSentRequests: async () => {
    set((state) => ({
      isLoading: {
        ...state.isLoading,
        sentRequests: true,
      },
      error: {
        ...state.error,
        sentRequests: null,
      },
    }));

    try {
      const token = useAuthStore.getState().accessToken || undefined;
      const response = await getSentFriendRequests(token);
      if (response.success) {
        set((state) => ({
          sentRequests: response.requests,
          isLoading: {
            ...state.isLoading,
            sentRequests: false,
          },
        }));
      } else {
        set((state) => ({
          error: {
            ...state.error,
            sentRequests: response.error || "Failed to fetch sent requests",
          },
          isLoading: {
            ...state.isLoading,
            sentRequests: false,
          },
        }));
      }
    } catch {
      set((state) => ({
        error: {
          ...state.error,
          sentRequests: "Failed to fetch sent requests",
        },
        isLoading: {
          ...state.isLoading,
          sentRequests: false,
        },
      }));
    }
  },

  // Fetch blocked users
  fetchBlockedUsers: async () => {
    set((state) => ({
      isLoading: {
        ...state.isLoading,
        blockedUsers: true,
      },
      error: {
        ...state.error,
        blockedUsers: null,
      },
    }));

    try {
      const token = useAuthStore.getState().accessToken || undefined;
      const response = await getBlockedUsers(token);
      if (response.success) {
        set((state) => ({
          blockedUsers: response.users,
          isLoading: {
            ...state.isLoading,
            blockedUsers: false,
          },
        }));
      } else {
        set((state) => ({
          error: {
            ...state.error,
            blockedUsers: response.error || "Failed to fetch blocked users",
          },
          isLoading: {
            ...state.isLoading,
            blockedUsers: false,
          },
        }));
      }
    } catch {
      set((state) => ({
        error: {
          ...state.error,
          blockedUsers: "Failed to fetch blocked users",
        },
        isLoading: {
          ...state.isLoading,
          blockedUsers: false,
        },
      }));
    }
  },

  // Accept a friend request
  acceptRequest: async (requestId: string) => {
    try {
      const token = useAuthStore.getState().accessToken || undefined;
      const response = await acceptFriendRequest(requestId, token);
      if (response.success) {
        // Remove from received requests and refresh friends list
        set((state) => ({
          receivedRequests: state.receivedRequests.filter(
            (req) => req.id !== requestId,
          ),
        }));
        await get().fetchFriends();
        return true;
      }
      return false;
    } catch (error) {
      console.error("Failed to accept friend request:", error);
      return false;
    }
  },

  // Reject a friend request
  rejectRequest: async (requestId: string) => {
    try {
      const token = useAuthStore.getState().accessToken || undefined;
      const response = await rejectFriendRequest(requestId, token);
      if (response.success) {
        // Remove from received requests
        set((state) => ({
          receivedRequests: state.receivedRequests.filter(
            (req) => req.id !== requestId,
          ),
        }));
        return true;
      }
      return false;
    } catch (error) {
      console.error("Failed to reject friend request:", error);
      return false;
    }
  },

  // Cancel a sent friend request
  cancelRequest: async (requestId: string) => {
    try {
      const token = useAuthStore.getState().accessToken || undefined;
      const response = await cancelFriendRequest(requestId, token);
      if (response.success) {
        // Remove from sent requests
        set((state) => ({
          sentRequests: state.sentRequests.filter(
            (req) => req.id !== requestId,
          ),
        }));
        return true;
      }
      return false;
    } catch (error) {
      console.error("Failed to cancel friend request:", error);
      return false;
    }
  },

  // Block a user
  blockFriend: async (userId: string) => {
    try {
      const token = useAuthStore.getState().accessToken || undefined;
      const response = await blockUser(userId, token);
      if (response.success) {
        // Refresh friends list and blocked users
        await get().fetchFriends();
        await get().fetchBlockedUsers();
        return true;
      }
      return false;
    } catch (error) {
      console.error("Failed to block user:", error);
      return false;
    }
  },

  // Unblock a user
  unblockFriend: async (userId: string) => {
    try {
      const token = useAuthStore.getState().accessToken || undefined;
      const response = await unblockUser(userId, token);
      if (response.success) {
        // Refresh blocked users
        await get().fetchBlockedUsers();
        return true;
      }
      return false;
    } catch (error) {
      console.error("Failed to unblock user:", error);
      return false;
    }
  },
}));
