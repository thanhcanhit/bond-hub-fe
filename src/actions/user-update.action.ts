"use client";
import axiosInstance from "@/lib/axios";
import { useAuthStore } from "@/stores/authStore";

// Initiate email update process
export async function initiateUpdateEmail(newEmail: string) {
  try {
    // Lấy accessToken từ store
    const accessToken = useAuthStore.getState().accessToken;

    if (!accessToken) {
      console.error("Cannot update email: No access token available");
      return {
        success: false,
        error: "Bạn cần đăng nhập lại để thực hiện thao tác này",
      };
    }

    const response = await axiosInstance.post(
      "/auth/update-email/initiate",
      {
        newEmail,
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    return {
      success: true,
      updateId: response.data.updateId,
      message:
        response.data.message ||
        "Mã xác nhận đã được gửi đến email mới của bạn",
    };
  } catch (error) {
    console.error("Initiate email update failed:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Đã xảy ra lỗi khi cập nhật email",
    };
  }
}

// Verify OTP for email update
export async function verifyUpdateEmailOtp(updateId: string, otp: string) {
  try {
    // Lấy accessToken từ store
    const accessToken = useAuthStore.getState().accessToken;

    if (!accessToken) {
      console.error("Cannot verify email update: No access token available");
      return {
        success: false,
        error: "Bạn cần đăng nhập lại để thực hiện thao tác này",
      };
    }

    const response = await axiosInstance.post(
      "/auth/update-email/verify",
      {
        updateId,
        otp,
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    // After successful verification, update the user in the store
    const currentUser = useAuthStore.getState().user;
    if (currentUser && response.data.user) {
      useAuthStore.getState().updateUser(response.data.user);
    }

    return {
      success: true,
      message: response.data.message || "Email đã được cập nhật thành công",
      user: response.data.user,
    };
  } catch (error) {
    console.error("Verify email update OTP failed:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Mã xác nhận không hợp lệ",
    };
  }
}

// Initiate phone number update process
export async function initiateUpdatePhone(newPhoneNumber: string) {
  try {
    // Lấy accessToken từ store
    const accessToken = useAuthStore.getState().accessToken;

    if (!accessToken) {
      console.error("Cannot update phone: No access token available");
      return {
        success: false,
        error: "Bạn cần đăng nhập lại để thực hiện thao tác này",
      };
    }

    const response = await axiosInstance.post(
      "/auth/update-phone/initiate",
      {
        newPhoneNumber,
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    return {
      success: true,
      updateId: response.data.updateId,
      message:
        response.data.message ||
        "Mã xác nhận đã được gửi đến số điện thoại mới của bạn",
    };
  } catch (error) {
    console.error("Initiate phone update failed:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Đã xảy ra lỗi khi cập nhật số điện thoại",
    };
  }
}

// Verify OTP for phone number update
export async function verifyUpdatePhoneOtp(updateId: string, otp: string) {
  try {
    // Lấy accessToken từ store
    const accessToken = useAuthStore.getState().accessToken;

    if (!accessToken) {
      console.error("Cannot verify phone update: No access token available");
      return {
        success: false,
        error: "Bạn cần đăng nhập lại để thực hiện thao tác này",
      };
    }

    const response = await axiosInstance.post(
      "/auth/update-phone/verify",
      {
        updateId,
        otp,
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    // After successful verification, update the user in the store
    const currentUser = useAuthStore.getState().user;
    if (currentUser && response.data.user) {
      useAuthStore.getState().updateUser(response.data.user);
    }

    return {
      success: true,
      message:
        response.data.message || "Số điện thoại đã được cập nhật thành công",
      user: response.data.user,
    };
  } catch (error) {
    console.error("Verify phone update OTP failed:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Mã xác nhận không hợp lệ",
    };
  }
}
