"use server";
import axiosInstance from "@/lib/axios";
import { Friend } from "@/types/base";
// import { useAuthStore } from "@/stores/authStore";

// Lấy danh sách bạn bè của người dùng hiện tại
export async function getFriendsList() {
  try {
    const response = await axiosInstance.get("/friends");
    const friends: Friend[] = response.data;
    return { success: true, friends };
  } catch (error) {
    console.error("Get friends list failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Lấy danh sách lời mời kết bạn
export async function getFriendRequests() {
  try {
    const response = await axiosInstance.get("/friends/requests");
    const requests: Friend[] = response.data;
    return { success: true, requests };
  } catch (error) {
    console.error("Get friend requests failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Gửi lời mời kết bạn
export async function sendFriendRequest(userId: string) {
  try {
    const response = await axiosInstance.post("/friends/request", { userId });
    return { success: true, data: response.data };
  } catch (error) {
    console.error("Send friend request failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Chấp nhận lời mời kết bạn
export async function acceptFriendRequest(requestId: string) {
  try {
    const response = await axiosInstance.post(`/friends/accept/${requestId}`);
    return { success: true, data: response.data };
  } catch (error) {
    console.error("Accept friend request failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Từ chối lời mời kết bạn
export async function rejectFriendRequest(requestId: string) {
  try {
    const response = await axiosInstance.post(`/friends/reject/${requestId}`);
    return { success: true, data: response.data };
  } catch (error) {
    console.error("Reject friend request failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Xóa bạn bè
export async function removeFriend(friendId: string) {
  try {
    const response = await axiosInstance.delete(`/friends/${friendId}`);
    return { success: true, data: response.data };
  } catch (error) {
    console.error("Remove friend failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Hàm giả lập để lấy danh sách bạn bè (sử dụng khi chưa có API thực)
export function getMockFriendsList() {
  // Danh sách bạn bè giả lập
  const mockFriends = [
    {
      id: "1",
      fullName: "Anh Trung",
      profilePictureUrl: "https://i.pravatar.cc/150?img=1",
      status: "online",
    },
    {
      id: "2",
      fullName: "Anh Tý",
      profilePictureUrl: "https://i.pravatar.cc/150?img=2",
      status: "offline",
    },
    {
      id: "3",
      fullName: "Anny Kim",
      profilePictureUrl: "https://i.pravatar.cc/150?img=3",
      status: "online",
    },
    {
      id: "4",
      fullName: "Ba",
      profilePictureUrl: "https://i.pravatar.cc/150?img=4",
      status: "offline",
    },
    {
      id: "5",
      fullName: "Bá Ngọc",
      profilePictureUrl: "https://i.pravatar.cc/150?img=5",
      status: "online",
    },
    {
      id: "6",
      fullName: "Cường",
      profilePictureUrl: "https://i.pravatar.cc/150?img=6",
      status: "offline",
    },
    {
      id: "7",
      fullName: "Dũng",
      profilePictureUrl: "https://i.pravatar.cc/150?img=7",
      status: "online",
    },
    {
      id: "8",
      fullName: "Đạt",
      profilePictureUrl: "https://i.pravatar.cc/150?img=8",
      status: "offline",
    },
    {
      id: "9",
      fullName: "Hà",
      profilePictureUrl: "https://i.pravatar.cc/150?img=9",
      status: "online",
    },
    {
      id: "10",
      fullName: "Hùng",
      profilePictureUrl: "https://i.pravatar.cc/150?img=10",
      status: "offline",
    },
    {
      id: "11",
      fullName: "Khánh",
      profilePictureUrl: "https://i.pravatar.cc/150?img=11",
      status: "online",
    },
    {
      id: "12",
      fullName: "Linh",
      profilePictureUrl: "https://i.pravatar.cc/150?img=12",
      status: "offline",
    },
  ];

  return { success: true, friends: mockFriends };
}

// Hàm giả lập để lấy danh sách lời mời kết bạn
export function getMockFriendRequests() {
  const mockRequests = [
    {
      id: "101",
      fullName: "Minh",
      profilePictureUrl: "https://i.pravatar.cc/150?img=20",
      status: "pending",
    },
    {
      id: "102",
      fullName: "Nam",
      profilePictureUrl: "https://i.pravatar.cc/150?img=21",
      status: "pending",
    },
  ];

  return { success: true, requests: mockRequests };
}
