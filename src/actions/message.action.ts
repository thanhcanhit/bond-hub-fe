import axiosInstance from "@/lib/axios";
import { Message, ReactionType } from "@/types/base";
import { AxiosError } from "axios";

/**
 * Gửi tin nhắn văn bản đến người dùng
 * @param receiverId ID của người nhận tin nhắn
 * @param content Nội dung tin nhắn (text)
 * @param repliedTo ID của tin nhắn được trả lời (nếu có)
 * @returns Thông tin tin nhắn đã gửi
 */
export async function sendTextMessage(
  receiverId: string,
  text: string,
  repliedTo?: string,
) {
  try {
    // Check if we have a valid token

    // Log the request details
    console.log("Message request payload:", {
      receiverId,
      content: {
        text: text.substring(0, 20) + (text.length > 20 ? "..." : ""),
      },
      repliedTo: repliedTo || null,
    });

    const response = await axiosInstance.post("/messages/user", {
      receiverId,
      content: { text },
      repliedTo,
    });

    console.log("Message sent successfully:", { messageId: response.data?.id });
    const message = response.data as Message;
    return { success: true, message };
  } catch (error: unknown) {
    const axiosError = error as AxiosError;
    console.error("Send text message failed:", {
      error: axiosError.message,
      status: axiosError.response?.status,
      data: axiosError.response?.data,
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Gửi tin nhắn có hình ảnh đến người dùng
 * @param receiverId ID của người nhận tin nhắn
 * @param text Nội dung tin nhắn (text)
 * @param files Danh sách file hình ảnh
 * @param repliedTo ID của tin nhắn được trả lời (nếu có)
 * @returns Thông tin tin nhắn đã gửi
 */
export async function sendMediaMessage(
  receiverId: string,
  text: string,
  files: File[],
  repliedTo?: string,
) {
  try {
    const formData = new FormData();
    formData.append("receiverId", receiverId);
    formData.append("content[text]", text);

    // Thêm repliedTo nếu có
    if (repliedTo) {
      formData.append("repliedTo", repliedTo);
    }

    // Thêm các file vào formData
    files.forEach((file) => {
      formData.append("files", file);
    });

    const response = await axiosInstance.post("/messages/user", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    const message = response.data as Message;
    return { success: true, message };
  } catch (error) {
    console.error("Send media message failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Tải lên nhiều hình ảnh cho tin nhắn
 * @param receiverId ID của người nhận tin nhắn
 * @param text Nội dung tin nhắn (text)
 * @param files Danh sách file hình ảnh
 * @param mediaType Loại media (mặc định là IMAGE)
 * @returns Thông tin về các media đã tải lên
 */
export async function uploadMediaFiles(
  receiverId: string,
  text: string,
  files: File[],
  mediaType: string = "IMAGE",
) {
  try {
    const formData = new FormData();
    formData.append("receiverId", receiverId);
    formData.append("text", text);
    formData.append("mediaType", mediaType);

    // Thêm các file vào formData
    files.forEach((file) => {
      formData.append("files", file);
    });

    const response = await axiosInstance.post("/messages/media", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    const { messageId, mediaItems } = response.data;
    return {
      success: true,
      messageId,
      mediaItems,
    };
  } catch (error) {
    console.error("Upload media files failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Lấy tin nhắn giữa hai người dùng
 * @param receiverId ID của người nhận tin nhắn
 * @param page Số trang (mặc định là 1)
 * @returns Danh sách tin nhắn
 */
export async function getMessagesBetweenUsers(
  receiverId: string,
  page: number = 1,
) {
  try {
    const response = await axiosInstance.get(`/messages/user/${receiverId}`, {
      params: { page },
    });
    const messages = response.data as Message[];
    return { success: true, messages };
  } catch (error) {
    console.error("Get messages failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Tìm kiếm tin nhắn
 * @param receiverId ID của người nhận tin nhắn
 * @param searchText Từ khóa tìm kiếm
 * @param page Số trang (mặc định là 1)
 * @returns Danh sách tin nhắn phù hợp với từ khóa
 */
export async function searchMessages(
  receiverId: string,
  searchText: string,
  page: number = 1,
) {
  try {
    const response = await axiosInstance.get(
      `/messages/user/${receiverId}/search`,
      {
        params: { searchText, page },
      },
    );
    const messages = response.data as Message[];
    return { success: true, messages };
  } catch (error) {
    console.error("Search messages failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Đánh dấu tin nhắn đã đọc
 * @param messageId ID của tin nhắn
 * @returns Thông tin tin nhắn đã cập nhật
 */
export async function markMessageAsRead(messageId: string) {
  try {
    const response = await axiosInstance.patch(`/messages/read/${messageId}`);
    const message = response.data as Message;
    return { success: true, message };
  } catch (error) {
    console.error("Mark message as read failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Đánh dấu tin nhắn chưa đọc
 * @param messageId ID của tin nhắn
 * @returns Thông tin tin nhắn đã cập nhật
 */
export async function markMessageAsUnread(messageId: string) {
  try {
    const response = await axiosInstance.patch(`/messages/unread/${messageId}`);
    const message = response.data as Message;
    return { success: true, message };
  } catch (error) {
    console.error("Mark message as unread failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Thêm biểu cảm vào tin nhắn
 * @param messageId ID của tin nhắn
 * @param reaction Loại biểu cảm
 * @returns Thông tin tin nhắn đã cập nhật
 */
export async function addReactionToMessage(
  messageId: string,
  reaction: ReactionType,
) {
  try {
    const response = await axiosInstance.post("/messages/reaction", {
      messageId,
      reaction,
    });
    const message = response.data as Message;
    return { success: true, message };
  } catch (error) {
    console.error("Add reaction failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Xóa biểu cảm khỏi tin nhắn
 * @param messageId ID của tin nhắn
 * @returns Thông tin tin nhắn đã cập nhật
 */
export async function removeReactionFromMessage(messageId: string) {
  try {
    const response = await axiosInstance.delete(
      `/messages/reaction/${messageId}`,
    );
    const message = response.data as Message;
    return { success: true, message };
  } catch (error) {
    console.error("Remove reaction failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Thu hồi tin nhắn
 * @param messageId ID của tin nhắn
 * @returns Thông tin tin nhắn đã cập nhật
 */
export async function recallMessage(messageId: string) {
  try {
    const response = await axiosInstance.patch(`/messages/recall/${messageId}`);
    const message = response.data as Message;
    return { success: true, message };
  } catch (error) {
    console.error("Recall message failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Xóa tin nhắn (chỉ ở phía người dùng hiện tại)
 * @param messageId ID của tin nhắn
 * @returns Thông tin tin nhắn đã cập nhật
 */
export async function deleteMessageForSelf(messageId: string) {
  try {
    const response = await axiosInstance.delete(
      `/messages/deleted-self-side/${messageId}`,
    );
    const message = response.data as Message;
    return { success: true, message };
  } catch (error) {
    console.error("Delete message failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Lấy danh sách cuộc trò chuyện
 * @param page Số trang (mặc định là 1)
 * @param limit Số lượng cuộc trò chuyện trên mỗi trang (mặc định là 20)
 * @returns Danh sách cuộc trò chuyện và tổng số cuộc trò chuyện
 */
export async function getConversations(page: number = 1, limit: number = 20) {
  try {
    const response = await axiosInstance.get("/messages/conversations", {
      params: { page, limit },
    });

    return {
      success: true,
      conversations: response.data.conversations,
      totalCount: response.data.totalCount,
    };
  } catch (error) {
    console.error("Get conversations failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Chuyển tiếp tin nhắn đến người dùng hoặc nhóm khác
 * @param messageId ID của tin nhắn cần chuyển tiếp
 * @param recipients Danh sách người nhận (có thể là USER hoặc GROUP)
 * @returns Thông tin về các tin nhắn đã chuyển tiếp
 */
export async function forwardMessage(
  messageId: string,
  recipients: Array<{ type: "USER" | "GROUP"; id: string }>,
) {
  try {
    // Convert recipients to the format expected by the backend
    const targets = recipients.map((recipient) => {
      if (recipient.type === "USER") {
        return { userId: recipient.id };
      } else {
        return { groupId: recipient.id };
      }
    });

    const response = await axiosInstance.post("/messages/forward", {
      messageId,
      targets,
    });

    return {
      success: true,
      forwardedMessages: response.data,
    };
  } catch (error) {
    console.error("Forward message failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Gửi tin nhắn cho nhóm
 * @param groupId ID của nhóm
 * @param text Nội dung tin nhắn (text)
 * @param repliedTo ID của tin nhắn được trả lời (nếu có)
 * @returns Thông tin tin nhắn đã gửi
 */
export async function sendGroupTextMessage(
  groupId: string,
  text: string,
  repliedTo?: string,
) {
  try {
    const response = await axiosInstance.post("/messages/group", {
      groupId,
      content: { text },
      repliedTo,
    });

    const message = response.data as Message;
    return { success: true, message };
  } catch (error: unknown) {
    const axiosError = error as AxiosError;
    console.error("Send group text message failed:", {
      error: axiosError.message,
      status: axiosError.response?.status,
      data: axiosError.response?.data,
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Gửi tin nhắn có hình ảnh cho nhóm
 * @param groupId ID của nhóm
 * @param text Nội dung tin nhắn (text)
 * @param files Danh sách file hình ảnh
 * @param repliedTo ID của tin nhắn được trả lời (nếu có)
 * @returns Thông tin tin nhắn đã gửi
 */
export async function sendGroupMediaMessage(
  groupId: string,
  text: string,
  files: File[],
  repliedTo?: string,
) {
  try {
    const formData = new FormData();
    formData.append("groupId", groupId);
    formData.append("content[text]", text);

    // Thêm repliedTo nếu có
    if (repliedTo) {
      formData.append("repliedTo", repliedTo);
    }

    // Thêm các file vào formData
    files.forEach((file) => {
      formData.append("files", file);
    });

    const response = await axiosInstance.post("/messages/group", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    const message = response.data as Message;
    return { success: true, message };
  } catch (error) {
    console.error("Send group media message failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Lấy tin nhắn trong nhóm
 * @param groupId ID của nhóm
 * @param page Số trang (mặc định là 1)
 * @returns Danh sách tin nhắn
 */
export async function getGroupMessages(groupId: string, page: number = 1) {
  try {
    const response = await axiosInstance.get(`/messages/group/${groupId}`, {
      params: { page },
    });
    const messages = response.data as Message[];
    return { success: true, messages };
  } catch (error) {
    console.error("Get group messages failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Tìm kiếm tin nhắn trong cuộc trò chuyện cá nhân
 * @param receiverId ID của người nhận
 * @param searchText Nội dung tìm kiếm
 * @param page Số trang (mặc định là 1)
 * @returns Danh sách tin nhắn tìm thấy
 */
export async function searchMessagesWithUser(
  receiverId: string,
  searchText: string,
  page: number = 1,
) {
  try {
    const response = await axiosInstance.get(
      `/messages/user/${receiverId}/search`,
      {
        params: { searchText, page },
      },
    );
    const messages = response.data as Message[];
    return { success: true, messages };
  } catch (error) {
    console.error("Search messages with user failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Tìm kiếm tin nhắn trong nhóm
 * @param groupId ID của nhóm
 * @param searchText Nội dung tìm kiếm
 * @param page Số trang (mặc định là 1)
 * @returns Danh sách tin nhắn tìm thấy
 */
export async function searchGroupMessages(
  groupId: string,
  searchText: string,
  page: number = 1,
) {
  try {
    const response = await axiosInstance.get(
      `/messages/group/${groupId}/search`,
      {
        params: { searchText, page },
      },
    );
    const messages = response.data as Message[];
    return { success: true, messages };
  } catch (error) {
    console.error("Search group messages failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Tìm kiếm tin nhắn trên toàn bộ cuộc trò chuyện
 * @param searchText Nội dung tìm kiếm
 * @param userIds Danh sách ID người dùng cần tìm kiếm (tùy chọn)
 * @param page Số trang (mặc định là 1)
 * @returns Danh sách tin nhắn tìm thấy từ nhiều cuộc trò chuyện
 */
export async function searchMessagesGlobal(
  searchText: string,
  userIds?: string[],
  page: number = 1,
) {
  try {
    // Nếu có danh sách userIds cụ thể, tìm kiếm trong các cuộc trò chuyện đó
    if (userIds && userIds.length > 0) {
      // Tạo mảng các promise để tìm kiếm song song
      const searchPromises = userIds.map((userId) =>
        axiosInstance.get(`/messages/user/${userId}/search`, {
          params: { searchText, page },
        }),
      );

      // Thực hiện tất cả các tìm kiếm cùng lúc
      const results = await Promise.all(searchPromises);

      // Gộp kết quả từ tất cả các cuộc trò chuyện
      let allMessages: Message[] = [];
      results.forEach((response, index) => {
        const messages = response.data as Message[];
        // Thêm thông tin về người dùng mà tin nhắn này thuộc về
        const messagesWithUserContext = messages.map((msg) => ({
          ...msg,
          _searchContext: {
            userId: userIds[index],
          },
        }));
        allMessages = [...allMessages, ...messagesWithUserContext];
      });

      // Sắp xếp tin nhắn theo thời gian
      allMessages.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );

      return { success: true, messages: allMessages };
    } else {
      // Nếu không có danh sách userIds, sử dụng API endpoint tìm kiếm toàn cục (nếu có)
      // Hiện tại backend chưa có endpoint này, nên ta sẽ trả về lỗi
      console.error("Global search requires a list of userIds");
      return {
        success: false,
        error: "Vui lòng cung cấp danh sách người dùng để tìm kiếm",
      };
    }
  } catch (error) {
    console.error("Global search messages failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
