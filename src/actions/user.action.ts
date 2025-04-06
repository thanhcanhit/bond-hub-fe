// "use server";
import axiosInstance from "@/lib/axios";
import { useAuthStore } from "@/stores/authStore";
import { User } from "@/types/base";

// Lấy danh sách tất cả users
export async function getAllUsers() {
  try {
    const response = await axiosInstance.get("/users");
    const users: User[] = response.data;
    return { success: true, users };
  } catch (error) {
    console.error("Get all users failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Lấy thông tin user theo ID
export async function getUserDataById(id: string) {
  try {
    const response = await axiosInstance.get(`/users/${id}`);
    const user: User = response.data;
    return { success: true, user };
  } catch (error) {
    console.error("Get user by ID failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Lấy thông tin cơ bản của user theo ID
export async function getUserBasicInfo(id: string) {
  try {
    const response = await axiosInstance.get(`/users/${id}/basic-info`);
    const userInfo = response.data; // Type tùy thuộc vào định nghĩa của bạn
    return { success: true, userInfo };
  } catch (error) {
    console.error("Get user basic info failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Cập nhật thông tin user (giả sử backend có endpoint PATCH /users/:id)
export async function updateUser(id: string, userData: Partial<User>) {
  try {
    const response = await axiosInstance.patch(`/users/${id}`, userData);
    const updatedUser: User = response.data;

    // Cập nhật lại thông tin trong store nếu user hiện tại đang được chỉnh sửa
    const currentUser = useAuthStore.getState().user;
    if (currentUser && currentUser.id === id) {
      useAuthStore.getState().updateUser(updatedUser);
    }

    return { success: true, user: updatedUser };
  } catch (error) {
    console.error("Update user failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Xóa user (giả sử backend có endpoint DELETE /users/:id)
export async function deleteUser(id: string) {
  try {
    await axiosInstance.delete(`/users/${id}`);

    // Nếu user hiện tại bị xóa, thực hiện logout
    const currentUser = useAuthStore.getState().user;
    if (currentUser && currentUser.id === id) {
      useAuthStore.getState().logout();
    }

    return { success: true };
  } catch (error) {
    console.error("Delete user failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Upload profile picture
export async function updateProfilePicture(file: File) {
  try {
    // Make sure file is not undefined
    if (!file) {
      throw new Error("No file selected");
    }

    const formData = new FormData();
    formData.append("file", file);

    // Change the content type to multipart/form-data
    const response = await axiosInstance.put(
      "/auth/update-profile-picture",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      },
    );

    const { message, url } = response.data;

    // Update user in store
    const currentUser = useAuthStore.getState().user;
    if (currentUser && currentUser.userInfo) {
      // Cập nhật URL ảnh đại diện mới trong store
      const updatedUser = {
        ...currentUser,
        userInfo: {
          ...currentUser.userInfo,
          profilePictureUrl: url,
        },
      };
      useAuthStore.getState().updateUser(updatedUser);
    }

    return { success: true, message, url };
  } catch (error) {
    console.error("Update profile picture failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Upload cover image
export async function updateCoverImage(file: File) {
  try {
    // Make sure file is not undefined
    if (!file) {
      throw new Error("No file selected");
    }

    const formData = new FormData();
    formData.append("file", file);

    // Change the content type to multipart/form-data
    const response = await axiosInstance.put(
      "/auth/update-cover-image",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      },
    );

    const { message, url } = response.data;

    // Update user in store
    const currentUser = useAuthStore.getState().user;
    if (currentUser && currentUser.userInfo) {
      // Cập nhật URL ảnh bìa mới trong store
      const updatedUser = {
        ...currentUser,
        userInfo: {
          ...currentUser.userInfo,
          coverImgUrl: url,
        },
      };
      useAuthStore.getState().updateUser(updatedUser);
    }

    return { success: true, message, url };
  } catch (error) {
    console.error("Update cover image failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Cập nhật thông tin cơ bản của người dùng
export async function updateUserBasicInfo(userData: {
  fullName?: string;
  phoneNumber?: string;
  bio?: string;
  gender?: string;
  dateOfBirth?: Date;
}) {
  try {
    const currentUser = useAuthStore.getState().user;
    if (!currentUser || !currentUser.id) {
      throw new Error("User not authenticated");
    }

    const response = await axiosInstance.put(
      `/auth/update-basic-info`,
      userData,
    );
    const updatedUser = response.data;

    // Cập nhật lại thông tin trong store
    // Đảm bảo cập nhật đầy đủ thông tin userInfo
    if (currentUser.userInfo) {
      const updatedUserInfo = {
        ...currentUser.userInfo,
        fullName: userData.fullName || currentUser.userInfo.fullName,
        gender: userData.gender || currentUser.userInfo.gender,
        dateOfBirth: userData.dateOfBirth || currentUser.userInfo.dateOfBirth,
        bio: userData.bio || currentUser.userInfo.bio,
      };

      const userToUpdate = {
        ...updatedUser,
        userInfo: updatedUserInfo,
      };

      useAuthStore.getState().updateUser(userToUpdate);
    } else {
      useAuthStore.getState().updateUser(updatedUser);
    }

    return { success: true, user: updatedUser };
  } catch (error) {
    console.error("Update user basic info failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
