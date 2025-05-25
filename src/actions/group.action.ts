import { GroupRole } from "@/types/base";
import axiosInstance from "@/lib/axios";
import { AxiosError } from "axios";
import { Socket } from "socket.io-client";

// Helper function to get the socket instance if available
const getGroupSocket = (): Socket | null => {
  if (typeof window === "undefined") return null;
  // Try to find the socket in the window object
  const socketRef = window.groupSocket;
  return socketRef || null;
};

// Helper function to join group room - simplified to match backend
const joinGroupRoom = (groupId: string, userId: string) => {
  const socket = getGroupSocket();
  if (socket && socket.connected) {
    console.log(
      `[group.action] Joining group room: ${groupId} for user: ${userId}`,
    );
    socket.emit("joinGroup", {
      userId: userId,
      groupId: groupId,
    });
  } else {
    console.log(
      `[group.action] Socket not available, cannot join group room: ${groupId}`,
    );
  }
};

// Declare the window interface to include our socket and helper functions
// Note: Full declaration is in useGroupSocket.ts
declare global {
  interface Window {
    groupSocket: Socket | null;
    messageSocket: Socket | null;
  }
}

// Interface for creating a group
interface GroupMemberDto {
  userId: string;
  addedById?: string; // Optional because it will be set to current user ID
}

interface CreateGroupDto {
  name: string;
  creatorId?: string; // Optional because it will be set automatically
  initialMembers: GroupMemberDto[];
}

// Interface for updating a group
interface UpdateGroupDto {
  name?: string;
  avatarUrl?: string;
}

/**
 * Create a new group
 * @param createGroupDto Group creation data
 * @returns Created group
 */
export async function createGroup(createGroupDto: CreateGroupDto) {
  try {
    // Kiểm tra dữ liệu đầu vào
    if (!createGroupDto.name || !createGroupDto.name.trim()) {
      return {
        success: false,
        error: "Group name is required",
      };
    }

    if (
      !createGroupDto.initialMembers ||
      !Array.isArray(createGroupDto.initialMembers) ||
      createGroupDto.initialMembers.length < 2
    ) {
      return {
        success: false,
        error:
          "Nhóm phải có tối thiểu 3 thành viên (bao gồm cả người tạo nhóm)",
      };
    }

    // Đảm bảo mỗi thành viên có addedById
    const initialMembers = createGroupDto.initialMembers.map((member) => ({
      userId: member.userId,
      addedById: member.addedById || createGroupDto.creatorId,
    }));

    // Log dữ liệu gửi đi để debug
    console.log(
      "Creating group with data:",
      JSON.stringify(
        {
          name: createGroupDto.name.trim(),
          creatorId: createGroupDto.creatorId,
          initialMembers,
        },
        null,
        2,
      ),
    );

    // Đảm bảo định dạng dữ liệu đúng
    const payload = {
      name: createGroupDto.name.trim(),
      creatorId: createGroupDto.creatorId, // Sử dụng creatorId từ DTO
      initialMembers,
    };

    // Gọi API với payload đã được chuẩn hóa
    console.log(
      "Sending request to /groups with payload:",
      JSON.stringify(payload, null, 2),
    );
    console.log(
      "Authorization header:",
      axiosInstance.defaults.headers.common["Authorization"]
        ? "Present"
        : "Missing",
    );

    const response = await axiosInstance.post("/groups", payload);
    console.log("API response:", response.data);

    // Join the group room for the creator - simplified approach
    if (createGroupDto.creatorId) {
      joinGroupRoom(response.data.id, createGroupDto.creatorId);
    }

    // Reconnect message socket to ensure user joins group rooms for messaging
    // This is critical for receiving group messages
    if (typeof window !== "undefined" && window.messageSocket) {
      console.log(
        "[group.action] Reconnecting message socket after group creation",
      );
      window.messageSocket.disconnect();
      window.messageSocket.connect();
    }

    // Backend will handle notifying all members via socket events
    // No need for manual event emission as backend handles this

    // Trả về dữ liệu nhóm đã tạo để client có thể cập nhật store
    return { success: true, group: response.data };
  } catch (error) {
    console.error("Create group failed:", error);
    const axiosError = error as AxiosError;

    // Log chi tiết lỗi để debug
    if (axiosError.response) {
      console.error("Error response data:", axiosError.response.data);
      console.error("Error response status:", axiosError.response.status);
      console.error("Error response headers:", axiosError.response.headers);
    } else if (axiosError.request) {
      console.error("Error request:", axiosError.request);
    }

    // Xử lý lỗi với các trường hợp khác nhau
    let errorMessage = "Failed to create group";

    if (axiosError.response?.data) {
      if (typeof axiosError.response.data === "string") {
        errorMessage = axiosError.response.data;
      } else if (typeof axiosError.response.data === "object") {
        // Nếu data là object, thử lấy message hoặc chuyển thành chuỗi
        const dataObj = axiosError.response.data as Record<string, unknown>;
        errorMessage =
          (dataObj.message as string) ||
          JSON.stringify(axiosError.response.data);
      }
    } else if (axiosError.message) {
      errorMessage = axiosError.message;
    }

    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Get groups for the current user
 * @returns List of user's groups
 */
export async function getUserGroups() {
  try {
    const response = await axiosInstance.get("/groups/user");
    return { success: true, groups: response.data };
  } catch (error) {
    console.error("Get user groups failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Get a specific group by ID
 * @param groupId Group ID
 * @param token Optional access token to use for the request
 * @returns Group details
 */
export async function getGroupById(groupId: string, token?: string) {
  try {
    console.log(
      `Fetching group by ID: ${groupId} with token: ${token ? "provided" : "not provided"}`,
    );

    let response: any;

    if (token) {
      // If token is provided, use fetch with the token
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
      const fullUrl = `${apiUrl}/api/v1/groups/${groupId}`;

      console.log(`Making authenticated request to: ${fullUrl}`);

      const fetchResponse = await fetch(fullUrl, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!fetchResponse.ok) {
        throw new Error(`HTTP error! Status: ${fetchResponse.status}`);
      }

      response = { data: await fetchResponse.json() };
    } else {
      // Use the standard axios instance
      response = await axiosInstance.get(`/groups/${groupId}`);
    }

    // Trả về dữ liệu nhóm để client có thể cập nhật store
    return { success: true, group: response.data };
  } catch (error) {
    console.error(`Get group ${groupId} failed:`, error);

    // Return a placeholder group instead of an error
    return {
      success: true,
      group: {
        id: groupId,
        name: "Nhóm không xác định",
        avatarUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        members: [],
      },
    };
  }
}

/**
 * Update a group
 * @param groupId Group ID
 * @param updateGroupDto Group update data
 * @returns Updated group
 */
export async function updateGroup(
  groupId: string,
  updateGroupDto: UpdateGroupDto,
) {
  try {
    const response = await axiosInstance.patch(
      `/groups/${groupId}`,
      updateGroupDto,
    );

    // Backend will handle notifying all members via socket events
    // No need for manual event emission as backend handles this

    // Trả về dữ liệu nhóm đã cập nhật để client có thể cập nhật store
    return { success: true, group: response.data };
  } catch (error) {
    console.error(`Update group ${groupId} failed:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Delete a group
 * @param groupId Group ID
 * @returns Success status
 */
export async function deleteGroup(groupId: string, deletedById?: string) {
  try {
    await axiosInstance.delete(`/groups/${groupId}`);

    // Backend will handle notifying all members via socket events
    // No need for manual event emission as backend handles this
    console.log(
      `[group.action] Group ${groupId} deleted, backend will handle socket notifications`,
    );

    // Cập nhật UI ngay lập tức
    if (typeof window !== "undefined") {
      // Sử dụng import động
      import("@/stores/conversationsStore").then(
        ({ useConversationsStore }) => {
          import("@/stores/authStore").then(({ useAuthStore }) => {
            import("@/stores/chatStore").then(({ useChatStore }) => {
              const currentUser = useAuthStore.getState().user;
              const selectedGroup = useChatStore.getState().selectedGroup;

              // Nếu đang xem nhóm này, xóa selection
              if (selectedGroup && selectedGroup.id === groupId) {
                useChatStore.getState().setSelectedGroup(null);
              }

              // Xóa cache
              useChatStore.getState().clearChatCache("GROUP", groupId);

              // Xóa nhóm khỏi danh sách cuộc trò chuyện
              useConversationsStore.getState().removeConversation(groupId);

              // Force update UI
              useConversationsStore.getState().forceUpdate();

              // Tải lại danh sách cuộc trò chuyện sau một khoảng thời gian ngắn
              if (currentUser?.id) {
                setTimeout(() => {
                  useConversationsStore
                    .getState()
                    .loadConversations(currentUser.id);
                }, 300);
              }
            });
          });
        },
      );
    }

    return { success: true };
  } catch (error) {
    console.error(`Delete group ${groupId} failed:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Add a member to a group
 * @param groupId Group ID
 * @param userId User ID to add
 * @param addedById ID of the user who is adding the member
 * @param role Role of the new member (default: MEMBER)
 * @returns Added group member
 */
export async function addGroupMember(
  groupId: string,
  userId: string,
  addedById: string,
  role: GroupRole.MEMBER,
) {
  try {
    console.log(`Adding member to group ${groupId}:`, {
      groupId,
      userId,
      addedById,
      role,
    });

    const response = await axiosInstance.post("/groups/members", {
      groupId,
      userId,
      addedById,
      role,
    });

    // Backend will handle notifying all members via socket events
    // No need for manual event emission as backend handles this

    return { success: true, member: response.data };
  } catch (error) {
    console.error(`Add member to group ${groupId} failed:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Remove a member from a group
 * @param groupId Group ID
 * @param userId User ID to remove
 * @returns Success status
 */
export async function removeGroupMember(
  groupId: string,
  userId: string,
  removedById?: string,
) {
  try {
    // Call API to remove member
    await axiosInstance.delete(`/groups/${groupId}/members/${userId}`);

    // Backend will handle notifying all members via socket events
    // No need for manual event emission as backend handles this

    return { success: true };
  } catch (error) {
    console.error(`Remove member from group ${groupId} failed:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Update a member's role in a group
 * @param groupId Group ID
 * @param userId User ID
 * @param role New role
 * @returns Updated group member
 */
export async function updateMemberRole(
  groupId: string,
  userId: string,
  role: GroupRole,
  updatedById?: string,
) {
  try {
    console.log(`Updating member role in group ${groupId}:`, {
      groupId,
      userId,
      role,
    });

    const response = await axiosInstance.patch(
      `/groups/${groupId}/members/${userId}/role`,
      { role },
    );

    // Backend will handle notifying all members via socket events
    // No need for manual event emission as backend handles this

    return { success: true, member: response.data };
  } catch (error) {
    console.error(`Update member role in group ${groupId} failed:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Leave a group
 * @param groupId Group ID
 * @returns Success status
 */
export async function leaveGroup(groupId: string, userId?: string) {
  try {
    await axiosInstance.post(`/groups/${groupId}/leave`);

    // Backend will handle notifying all members via socket events
    // No need for manual event emission as backend handles this

    return { success: true };
  } catch (error) {
    console.error(`Leave group ${groupId} failed:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Join a group via link
 * @param groupId Group ID
 * @returns Joined group member
 */
export async function joinGroup(groupId: string) {
  try {
    const response = await axiosInstance.post("/groups/join", { groupId });
    return { success: true, member: response.data };
  } catch (error) {
    console.error(`Join group ${groupId} failed:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Get public group info
 * @param groupId Group ID
 * @returns Group info
 */
export async function getPublicGroupInfo(groupId: string) {
  try {
    const response = await axiosInstance.get(`/groups/${groupId}/info`);
    return { success: true, groupInfo: response.data };
  } catch (error) {
    console.error(`Get public group info for ${groupId} failed:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Create a new group with avatar
 * @param name Group name
 * @param creatorId Creator ID
 * @param initialMembers Initial group members
 * @param avatarFile Optional avatar file
 * @returns Created group
 */
export async function createGroupWithAvatar(
  name: string,
  creatorId: string,
  initialMembers: GroupMemberDto[],
  avatarFile?: File,
) {
  try {
    // First create the group
    const createResult = await createGroup({
      name,
      creatorId,
      initialMembers,
    });

    if (!createResult.success || !createResult.group) {
      return createResult;
    }

    // If no avatar file, return the created group
    if (!avatarFile) {
      return createResult;
    }

    // If avatar file exists, upload it
    const groupId = createResult.group.id;
    const formData = new FormData();
    formData.append("file", avatarFile);

    try {
      const avatarResult = await updateGroupAvatar(groupId, formData);
      if (avatarResult.success) {
        // Return the updated group with avatar
        return avatarResult;
      } else {
        // Avatar upload failed, but group was created successfully
        console.warn(
          "Group created but avatar upload failed:",
          avatarResult.error,
        );
        return createResult;
      }
    } catch (avatarError) {
      // Avatar upload failed, but group was created successfully
      console.error("Error uploading group avatar:", avatarError);
      return createResult;
    }
  } catch (error) {
    console.error("Create group with avatar failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Update group avatar
 * @param groupId Group ID
 * @param formData Form data with file
 * @returns Updated group
 */
export async function updateGroupAvatar(groupId: string, formData: FormData) {
  try {
    const response = await axiosInstance.patch(
      `/groups/${groupId}/avatar`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      },
    );

    // Backend will handle notifying all members via socket events
    // No need for manual event emission as backend handles this

    // Trả về dữ liệu nhóm đã cập nhật để client có thể cập nhật store
    return { success: true, group: response.data };
  } catch (error) {
    console.error(`Update group avatar for ${groupId} failed:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Additional helper functions for backward compatibility

// Dissolve group function (alias for deleteGroup)
export async function dissolveGroup(groupId: string, dissolvedById: string) {
  try {
    await axiosInstance.delete(`/groups/${groupId}`);

    // Backend will handle notifying all members via socket events
    // No need for manual event emission as backend handles this

    return { success: true };
  } catch (error) {
    console.error(`Dissolve group ${groupId} failed:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Remove member function (alias for removeGroupMember)
export async function removeMemberFromGroup(
  groupId: string,
  userId: string,
  removedById: string,
) {
  try {
    await axiosInstance.delete(`/groups/${groupId}/members/${userId}`);

    // Backend will handle notifying all members via socket events
    // No need for manual event emission as backend handles this

    return { success: true };
  } catch (error) {
    console.error(`Remove member from group ${groupId} failed:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
