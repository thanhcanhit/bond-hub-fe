"use server";
import axiosInstance from "@/lib/axios";
import { useAuthStore } from "@/stores/authStore";
import { DeviceType } from "@/types/base";
//const { cookies } = await import("next/headers");

// Đăng ký - Bước 1: Khởi tạo đăng ký
export async function initiateRegistration(email: string) {
  try {
    const response = await axiosInstance.post("/auth/register/initiate", {
      email,
    });
    const { registrationId } = response.data;

    return { success: true, registrationId };
  } catch (error) {
    console.error("Initiate registration failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Đăng ký - Bước 2: Xác thực OTP
export async function verifyOtp(registrationId: string, otp: string) {
  try {
    const response = await axiosInstance.post("/auth/register/verify", {
      registrationId,
      otp,
    });
    return { success: true, data: response.data };
  } catch (error) {
    console.error("OTP verification failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Đăng ký - Bước 3: Hoàn tất đăng ký
export async function completeRegistration(
  registrationId: string,
  password: string,
  fullName: string,
  dateOfBirth: string,
  gender: string,
) {
  try {
    const response = await axiosInstance.post("/auth/register/complete", {
      registrationId,
      password,
      fullName,
      dateOfBirth,
      gender,
    });
    const { user } = response.data;

    return { success: true, user };
  } catch (error) {
    console.error("Complete registration failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Đăng nhập
export async function login(
  identifier: string,
  password: string,
  deviceType: DeviceType,
) {
  try {
    const response = await axiosInstance.post("/auth/login", {
      [isEmail(identifier) ? "email" : "phoneNumber"]: identifier,
      password,
      deviceType,
    });
    const { user, accessToken, refreshToken } = response.data;

    // Cập nhật store (chỉ hoạt động phía client)
    if (typeof window !== "undefined") {
      useAuthStore.getState().setAuth(user, accessToken);
      useAuthStore.getState().setTokens(accessToken, refreshToken);
    }
    // Lưu accessToken vào cookie
    // const cookieOptions = {
    //   httpOnly: true, // Chỉ server có thể truy cập cookie
    //   secure: process.env.NODE_ENV === "production", // HTTPS trong production
    //   maxAge: 60 * 60 * 24 * 7, // Hết hạn sau 7 ngày
    //   path: "/",
    // };
    // // // Dùng Next.js cookies API để lưu cookie

    // (await cookies()).set("access_token", accessToken, cookieOptions);

    return { success: true, user, accessToken, refreshToken };
  } catch (error) {
    console.error("Login failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
// Hàm kiểm tra email
function isEmail(input: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(input);
}
// Đăng xuất
export async function logout() {
  try {
    const refreshToken = useAuthStore.getState().refreshToken;
    if (refreshToken) {
      await axiosInstance.post(
        "/auth/logout",
        {},
        {
          headers: { "refresh-token": refreshToken },
        },
      );
    }

    // Xóa accessToken từ localStorage và reset store
    if (typeof window !== "undefined") {
      useAuthStore.getState().logout();
      // document.cookie = "access_token=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/;";
    }

    // // Xóa cookie
    // (await cookies()).delete("access_token");

    return { success: true };
  } catch (error) {
    console.error("Logout failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Làm mới token
export async function refreshToken() {
  try {
    const refreshToken = useAuthStore.getState().refreshToken;
    if (!refreshToken) {
      throw new Error("No refresh token available");
    }

    const response = await axiosInstance.post(
      "/auth/refresh",
      {},
      {
        headers: { "refresh-token": refreshToken },
      },
    );
    const { accessToken, refreshToken: newRefreshToken } = response.data;

    // Cập nhật token trong store
    if (typeof window !== "undefined") {
      useAuthStore
        .getState()
        .setTokens(accessToken, newRefreshToken || refreshToken);
    }
    // Cập nhật cookie
    const { cookies } = await import("next/headers");
    (await cookies()).set("access_token", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });

    return { success: true };
  } catch (error) {
    console.error("Token refresh failed:", error);
    if (typeof window !== "undefined") {
      useAuthStore.getState().logout();
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Quên mật khẩu - Bước 1: Khởi tạo
export async function initiateForgotPassword(phoneNumber: string) {
  try {
    const response = await axiosInstance.post("/auth/forgot-password", {
      phoneNumber,
    });
    const { resetId } = response.data;

    return { success: true, resetId };
  } catch (error) {
    console.error("Initiate forgot password failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Quên mật khẩu - Bước 2: Xác thực OTP
export async function verifyForgotPasswordOtp(resetId: string, otp: string) {
  try {
    const response = await axiosInstance.post("/auth/forgot-password/verify", {
      resetId,
      otp,
    });
    return { success: true, data: response.data };
  } catch (error) {
    console.error("Verify forgot password OTP failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Quên mật khẩu - Bước 3: Đặt lại mật khẩu
export async function resetPassword(resetId: string, newPassword: string) {
  try {
    const response = await axiosInstance.post("/auth/forgot-password/reset", {
      resetId,
      newPassword,
    });
    return { success: true, data: response.data };
  } catch (error) {
    console.error("Reset password failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
