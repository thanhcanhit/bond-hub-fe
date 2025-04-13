"use server";
import axios from "axios";

// Create a server-side axios instance
const createServerAxiosInstance = (token?: string) => {
  const instance = axios.create({
    baseURL: process.env.NEXT_PUBLIC_BACKEND_URL,
    headers: { "Content-Type": "application/json" },
    timeout: 10000, // 10 seconds timeout
  });

  if (token) {
    instance.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  }

  // Add response interceptor to handle network errors
  instance.interceptors.response.use(
    (response) => response,
    (error) => {
      // Handle network errors
      if (error.code === "ECONNABORTED") {
        console.error("Request timeout:", error);
        return Promise.reject(new Error("Request timeout. Please try again."));
      }

      if (!error.response) {
        console.error("Network error:", error);
        return Promise.reject(
          new Error("Network error. Please check your connection."),
        );
      }

      return Promise.reject(error);
    },
  );

  return instance;
};

// Define types based on the API response
interface UserInfo {
  fullName: string;
  profilePictureUrl: string;
  statusMessage?: string;
  lastSeen?: string;
  gender?: string;
  bio?: string;
  dateOfBirth?: string;
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
  introduce?: string;
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
  gender?: string;
  bio?: string;
  dateOfBirth?: string;
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
      gender: friendship.friend.userInfo.gender,
      bio: friendship.friend.userInfo.bio,
      dateOfBirth: friendship.friend.userInfo.dateOfBirth,
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
      // Get the introduce message from the API response
      message: request.introduce || "",
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
export async function sendFriendRequest(
  userId: string,
  introduce?: string,
  token?: string,
) {
  try {
    console.log(
      `Sending friend request to user ${userId} with token: ${!!token}`,
    );
    const serverAxios = createServerAxiosInstance(token);

    // Tạo payload theo đúng format API yêu cầu
    const payload: { receiverId: string; introduce?: string } = {
      receiverId: userId,
    };

    // Thêm introduce nếu có
    if (introduce && introduce.trim()) {
      payload.introduce = introduce.trim();
    }

    console.log("Friend request payload:", payload);
    const response = await serverAxios.post("/friends/request", payload);
    console.log("Friend request response:", response.data);
    return { success: true, data: response.data };
  } catch (error) {
    console.error("Send friend request failed:", error);

    // Log chi tiết hơn về lỗi
    if (axios.isAxiosError(error) && error.response) {
      console.error("Error response:", {
        status: error.response.status,
        data: error.response.data,
        headers: error.response.headers,
      });

      // Return specific error message based on status code
      if (error.response.status === 401) {
        return {
          success: false,
          error: "Bạn cần đăng nhập để thực hiện hành động này",
        };
      }

      if (error.response.status === 403) {
        return {
          success: false,
          error: "Bạn không có quyền thực hiện hành động này",
        };
      }

      if (error.response.status === 404) {
        return {
          success: false,
          error: "Không tìm thấy người dùng",
        };
      }

      if (error.response.data?.message) {
        return {
          success: false,
          error: error.response.data.message,
        };
      }
    }

    // Network errors or other errors
    if (error instanceof Error) {
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: false,
      error: "Unknown error",
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
    console.log(
      `respondToFriendRequest: requestId=${requestId}, status=${status}, hasToken=${!!token}`,
    );
    const serverAxios = createServerAxiosInstance(token);
    const payload = {
      requestId,
      status,
    };
    console.log("Request payload:", payload);
    const response = await serverAxios.put("/friends/respond", payload);
    console.log("API response:", response.data);
    return { success: true, data: response.data };
  } catch (error) {
    console.error("Respond to friend request failed:", error);

    // Log chi tiết hơn về lỗi
    if (axios.isAxiosError(error) && error.response) {
      console.error("Error response:", {
        status: error.response.status,
        data: error.response.data,
        headers: error.response.headers,
      });

      // Return specific error message based on status code
      if (error.response.status === 401) {
        return {
          success: false,
          error: "Bạn cần đăng nhập để thực hiện hành động này",
        };
      }

      if (error.response.status === 403) {
        return {
          success: false,
          error: "Bạn không có quyền thực hiện hành động này",
        };
      }

      if (error.response.status === 404) {
        return {
          success: false,
          error: "Không tìm thấy lời mời kết bạn",
        };
      }

      if (error.response.data?.message) {
        return {
          success: false,
          error: error.response.data.message,
        };
      }
    }

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
  console.log(
    "rejectFriendRequest called with requestId:",
    requestId,
    "and token:",
    !!token,
  );
  const result = await respondToFriendRequest(requestId, "DECLINED", token);
  console.log("respondToFriendRequest result:", result);
  return result;
}

// Xóa bạn bè
export async function removeFriend(friendId: string, token?: string) {
  try {
    const serverAxios = createServerAxiosInstance(token);
    const response = await serverAxios.delete(`/friends/${friendId}`);
    return { success: true, data: response.data };
  } catch (error) {
    console.error("Remove friend failed:", error);

    // Log chi tiết hơn về lỗi
    if (axios.isAxiosError(error) && error.response) {
      console.error("Error response:", {
        status: error.response.status,
        data: error.response.data,
        headers: error.response.headers,
      });

      // Return specific error message based on status code
      if (error.response.status === 401) {
        return {
          success: false,
          error: "Bạn cần đăng nhập để thực hiện hành động này",
        };
      }

      if (error.response.status === 403) {
        return {
          success: false,
          error: "Bạn không có quyền thực hiện hành động này",
        };
      }

      if (error.response.status === 404) {
        return {
          success: false,
          error: "Không tìm thấy người dùng",
        };
      }

      if (error.response.data?.message) {
        return {
          success: false,
          error: error.response.data.message,
        };
      }
    }

    // Network errors or other errors
    if (error instanceof Error) {
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: false,
      error: "Unknown error",
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
    // TEMPORARY MOCK FOR TESTING - Assume all users in contact list are friends
    // This is a temporary solution until the API is fixed
    console.log("MOCK: Returning FRIEND relationship for user ID:", targetId);
    return {
      success: true,
      data: {
        status: "FRIEND",
        message: "Bạn bè từ 2023",
        relationship: {
          id: "mock-relationship-id",
          senderId: "sender-id",
          receiverId: targetId,
          status: "ACCEPTED",
          introduce: "Xin chào",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          sender: {
            id: "sender-id",
            email: "sender@example.com",
            phoneNumber: "0123456789",
            userInfo: {
              fullName: "Người gửi",
              profilePictureUrl: "https://i.pravatar.cc/150?img=1",
            },
          },
          receiver: {
            id: targetId,
            email: "receiver@example.com",
            phoneNumber: "0987654321",
            userInfo: {
              fullName: "Người nhận",
              profilePictureUrl: "https://i.pravatar.cc/150?img=2",
            },
          },
        },
        targetUser: {
          id: targetId,
          email: "target@example.com",
          phoneNumber: "0123456789",
          userInfo: {
            fullName: "Người dùng",
            profilePictureUrl: "https://i.pravatar.cc/150?img=3",
          },
        },
      },
    };

    // ORIGINAL CODE - Uncomment when API is fixed
    /*
    // Sử dụng serverAxios để gửi token xác thực
    const serverAxios = createServerAxiosInstance(token);
    const response = await serverAxios.get(`/friends/relationship/${targetId}`);
    console.log("Relationship response:", response.data);
    return { success: true, data: response.data };
    */
  } catch (error) {
    console.error("Get relationship failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
