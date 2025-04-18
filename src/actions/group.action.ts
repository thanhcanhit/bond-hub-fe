import { GroupRole } from "@/types/base";
import axiosInstance from "@/lib/axios";
import { AxiosError } from "axios";

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
      createGroupDto.initialMembers.length === 0
    ) {
      return {
        success: false,
        error: "At least one member is required",
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
 * @returns Group details
 */
export async function getGroupById(groupId: string) {
  try {
    const response = await axiosInstance.get(`/groups/${groupId}`);

    // Trả về dữ liệu nhóm để client có thể cập nhật store

    return { success: true, group: response.data };
  } catch (error) {
    console.error(`Get group ${groupId} failed:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
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
export async function deleteGroup(groupId: string) {
  try {
    await axiosInstance.delete(`/groups/${groupId}`);
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
 * @returns Added group member
 */
export async function addGroupMember(groupId: string, userId: string) {
  try {
    const response = await axiosInstance.post("/groups/members", {
      groupId,
      userId,
    });
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
export async function removeGroupMember(groupId: string, userId: string) {
  try {
    await axiosInstance.delete(`/groups/${groupId}/members/${userId}`);
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
) {
  try {
    const response = await axiosInstance.patch(
      `/groups/${groupId}/members/${userId}/role`,
      { role },
    );
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
export async function leaveGroup(groupId: string) {
  try {
    await axiosInstance.post(`/groups/${groupId}/leave`);
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
