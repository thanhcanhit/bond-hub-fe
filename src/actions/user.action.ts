"use server";
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
