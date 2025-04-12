"use server";
import axiosInstance from "@/lib/axios";
import { useAuthStore } from "@/stores/authStore";

// Tìm kiếm tin nhắn dựa trên từ khóa
export async function searchMessages(keyword: string) {
  try {
    const response = await axiosInstance.get(
      `/messages/search?keyword=${encodeURIComponent(keyword)}`,
    );
    return { success: true, messages: response.data };
  } catch (error) {
    console.error("Search messages failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      messages: [],
    };
  }
}

// Lấy danh sách tin nhắn của một cuộc trò chuyện
export async function getMessages(
  conversationId: string,
  page: number = 1,
  limit: number = 20,
) {
  try {
    const response = await axiosInstance.get(
      `/messages/${conversationId}?page=${page}&limit=${limit}`,
    );
    return {
      success: true,
      messages: response.data.messages,
      hasMore: response.data.hasMore,
    };
  } catch (error) {
    console.error("Get messages failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      messages: [],
      hasMore: false,
    };
  }
}

// Gửi tin nhắn mới
export async function sendMessage(
  conversationId: string,
  content: string,
  attachments: string[] = [],
) {
  try {
    const response = await axiosInstance.post(`/messages`, {
      conversationId,
      content,
      attachments,
    });
    return { success: true, message: response.data };
  } catch (error) {
    console.error("Send message failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Xóa tin nhắn
export async function deleteMessage(messageId: string) {
  try {
    await axiosInstance.delete(`/messages/${messageId}`);
    return { success: true };
  } catch (error) {
    console.error("Delete message failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Chỉnh sửa tin nhắn
export async function editMessage(messageId: string, content: string) {
  try {
    const response = await axiosInstance.put(`/messages/${messageId}`, {
      content,
    });
    return { success: true, message: response.data };
  } catch (error) {
    console.error("Edit message failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
