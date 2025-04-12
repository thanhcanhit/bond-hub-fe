"use server";
import axios from "axios";
import axiosInstance from "@/lib/axios";

// Create a server-side axios instance
const createServerAxiosInstance = (token?: string) => {
  const instance = axios.create({
    baseURL: process.env.NEXT_PUBLIC_BACKEND_URL,
    headers: { "Content-Type": "application/json" },
  });

  if (token) {
    instance.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  }

  return instance;
};

// Define types based on the API response
interface UserInfo {
  fullName: string;
  profilePictureUrl: string;
  statusMessage: string;
  lastSeen: string;
}

interface FriendInfo {
  id: string;
  email: string;
  phoneNumber: string;
  userInfo: UserInfo;
}

interface FriendshipResponse {
  friendshipId: string;
  friend: FriendInfo;
  since: string;
}

interface FriendRequest {
  id: string;
  senderId: string;
  receiverId: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  sender: FriendInfo;
  receiver: FriendInfo;
}

// Simplified Friend type for UI components
export interface SimpleFriend {
  id: string;
  fullName: string;
  profilePictureUrl: string;
  statusMessage?: string;
  lastSeen?: string;
  email?: string;
  phoneNumber?: string;
}

// Lấy danh sách bạn bè của người dùng hiện tại
export async function getFriendsList(token?: string) {
  try {
    const serverAxios = createServerAxiosInstance(token);
    const response = await serverAxios.get("/friends/list");
    const friendships: FriendshipResponse[] = response.data;

    // Transform the API response to the format expected by UI components
    const friends: SimpleFriend[] = friendships.map((friendship) => ({
      id: friendship.friend.id,
      fullName: friendship.friend.userInfo.fullName,
      profilePictureUrl: friendship.friend.userInfo.profilePictureUrl,
      statusMessage: friendship.friend.userInfo.statusMessage,
      lastSeen: friendship.friend.userInfo.lastSeen,
      email: friendship.friend.email,
      phoneNumber: friendship.friend.phoneNumber,
    }));

    return { success: true, friends };
  } catch (error) {
    console.error("Get friends list failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Lấy danh sách lời mời kết bạn đã nhận
export async function getReceivedFriendRequests(token?: string) {
  try {
    const serverAxios = createServerAxiosInstance(token);
    const response = await serverAxios.get("/friends/requests/received");

    // Transform the API response to the format expected by UI components
    const requests = response.data.map((request: FriendRequest) => ({
      id: request.id,
      fullName: request.sender.userInfo.fullName,
      profilePictureUrl: request.sender.userInfo.profilePictureUrl,
      // Add default values for UI compatibility
      message: "",
      timeAgo: new Date(request.createdAt).toLocaleDateString(),
    }));

    return { success: true, requests };
  } catch (error) {
    console.error("Get received friend requests failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Lấy danh sách lời mời kết bạn đã gửi
export async function getSentFriendRequests(token?: string) {
  try {
    const serverAxios = createServerAxiosInstance(token);
    const response = await serverAxios.get("/friends/requests/sent");

    // Transform the API response to the format expected by UI components
    const requests = response.data.map((request: FriendRequest) => ({
      id: request.id,
      fullName: request.receiver.userInfo.fullName,
      profilePictureUrl: request.receiver.userInfo.profilePictureUrl,
      timeAgo: new Date(request.createdAt).toLocaleDateString(),
    }));

    return { success: true, requests };
  } catch (error) {
    console.error("Get sent friend requests failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Gửi lời mời kết bạn
export async function sendFriendRequest(userId: string, token?: string) {
  try {
    const serverAxios = createServerAxiosInstance(token);
    const response = await serverAxios.post("/friends/request", { userId });
    return { success: true, data: response.data };
  } catch (error) {
    console.error("Send friend request failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Phản hồi lời mời kết bạn (chấp nhận, từ chối, block)
export async function respondToFriendRequest(
  requestId: string,
  status: "ACCEPTED" | "DECLINED" | "BLOCKED",
  token?: string,
) {
  try {
    const serverAxios = createServerAxiosInstance(token);
    const response = await serverAxios.put("/friends/respond", {
      requestId,
      status,
    });
    return { success: true, data: response.data };
  } catch (error) {
    console.error("Respond to friend request failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Chấp nhận lời mời kết bạn (wrapper function for backward compatibility)
export async function acceptFriendRequest(requestId: string, token?: string) {
  return respondToFriendRequest(requestId, "ACCEPTED", token);
}

// Từ chối lời mời kết bạn (wrapper function for backward compatibility)
export async function rejectFriendRequest(requestId: string, token?: string) {
  return respondToFriendRequest(requestId, "DECLINED", token);
}

// Xóa bạn bè
export async function removeFriend(friendId: string, token?: string) {
  try {
    const serverAxios = createServerAxiosInstance(token);
    const response = await serverAxios.delete(`/friends/${friendId}`);
    return { success: true, data: response.data };
  } catch (error) {
    console.error("Remove friend failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Hủy lời mời kết bạn đã gửi
export async function cancelFriendRequest(requestId: string, token?: string) {
  try {
    const serverAxios = createServerAxiosInstance(token);
    const response = await serverAxios.delete(`/friends/request/${requestId}`);
    return { success: true, data: response.data };
  } catch (error) {
    console.error("Cancel friend request failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Chặn người dùng
export async function blockUser(userId: string, token?: string) {
  try {
    const serverAxios = createServerAxiosInstance(token);
    const response = await serverAxios.post(`/friends/block/${userId}`);
    return { success: true, data: response.data };
  } catch (error) {
    console.error("Block user failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Bỏ chặn người dùng
export async function unblockUser(userId: string, token?: string) {
  try {
    const serverAxios = createServerAxiosInstance(token);
    const response = await serverAxios.delete(`/friends/block/${userId}`);
    return { success: true, data: response.data };
  } catch (error) {
    console.error("Unblock user failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Define type for blocked user response
interface BlockedUserResponse {
  id: string;
  senderId: string;
  receiverId: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  receiver: FriendInfo;
}

// Lấy danh sách người dùng đã chặn
export async function getBlockedUsers(token?: string) {
  try {
    const serverAxios = createServerAxiosInstance(token);
    const response = await serverAxios.get("/friends/blocked");

    // Transform the API response to the format expected by UI components
    const users: SimpleFriend[] = response.data.map(
      (item: BlockedUserResponse) => ({
        id: item.receiver.id,
        fullName: item.receiver.userInfo.fullName,
        profilePictureUrl: item.receiver.userInfo.profilePictureUrl,
        email: item.receiver.email,
        phoneNumber: item.receiver.phoneNumber,
      }),
    );

    return { success: true, users };
  } catch (error) {
    console.error("Get blocked users failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Lấy mối quan hệ với một người dùng cụ thể
export async function getRelationship(targetId: string) {
  try {
    const response = await axiosInstance.get(
      `/friends/relationship/${targetId}`,
    );
    return { success: true, data: response.data };
  } catch (error) {
    console.error("Get relationship failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
