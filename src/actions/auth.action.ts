"use server";
import { createAxiosInstance } from "@/lib/axios";
import { useAuthStore } from "@/stores/authStore";
import { DeviceType } from "@/types/base";
import { isEmail } from "@/utils/helpers";

export async function initiateRegistration(identifier: string) {
  try {
    // Determine if the identifier is an email or phone number
    const isEmailFormat = isEmail(identifier);

    const serverAxios = createAxiosInstance();
    const response = await serverAxios.post("/auth/register/initiate", {
      [isEmailFormat ? "email" : "phoneNumber"]: identifier,
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

export async function verifyOtp(registrationId: string, otp: string) {
  try {
    const serverAxios = createAxiosInstance();
    const response = await serverAxios.post("/auth/register/verify", {
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

export async function completeRegistration(
  registrationId: string,
  password: string,
  fullName: string,
  dateOfBirth: string,
  gender: string,
) {
  try {
    const serverAxios = createAxiosInstance();
    const response = await serverAxios.post("/auth/register/complete", {
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
export async function login(
  identifier: string,
  password: string,
  deviceName: string,
  deviceType: DeviceType,
) {
  try {
    console.log("Login action called");
    // Không cần token cho login
    const serverAxios = createAxiosInstance();
    const response = await serverAxios.post("/auth/login", {
      [isEmail(identifier) ? "email" : "phoneNumber"]: identifier,
      password,
      deviceName,
      deviceType,
    });
    console.log("Login response:", response.data);

    const { user, accessToken, refreshToken, deviceId } = response.data;

    return { success: true, user, accessToken, refreshToken, deviceId };
  } catch (error) {
    console.error("Login failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function logout() {
  try {
    const refreshToken = useAuthStore.getState().refreshToken;
    const accessToken = useAuthStore.getState().accessToken || "";
    if (refreshToken) {
      const serverAxios = createAxiosInstance(accessToken);
      await serverAxios.post(
        "/auth/logout",
        {},
        {
          headers: { "refresh-token": refreshToken },
        },
      );
    }
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
    const deviceId = useAuthStore.getState().deviceId;

    if (!refreshToken) {
      throw new Error("No refresh token available");
    }

    if (!deviceId) {
      throw new Error("No device ID available");
    }

    // Send both refreshToken and deviceId in the request body as required by backend
    // Không cần token cho refresh token
    const serverAxios = createAxiosInstance();
    const response = await serverAxios.post("/auth/refresh", {
      refreshToken,
      deviceId,
    });

    const { accessToken } = response.data;
    const device = response.data.device;

    if (typeof window !== "undefined") {
      // Keep the same refreshToken since backend doesn't return a new one
      useAuthStore.getState().setTokens(accessToken, refreshToken);
    }

    // Cập nhật cookie
    const { cookies } = await import("next/headers");
    (await cookies()).set("access_token", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });

    return { success: true, accessToken, device };
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

export async function initiateForgotPassword(identifier: string) {
  try {
    // Kiểm tra xem identifier là email hay số điện thoại
    const isEmailFormat = isEmail(identifier);

    const serverAxios = createAxiosInstance();
    const response = await serverAxios.post("/auth/forgot-password", {
      [isEmailFormat ? "email" : "phoneNumber"]: identifier,
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

export async function verifyForgotPasswordOtp(resetId: string, otp: string) {
  try {
    const serverAxios = createAxiosInstance();
    const response = await serverAxios.post("/auth/forgot-password/verify", {
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

export async function resetPassword(resetId: string, newPassword: string) {
  try {
    const serverAxios = createAxiosInstance();
    const response = await serverAxios.post("/auth/forgot-password/reset", {
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

// Thay đổi mật khẩu (khi đã đăng nhập)
export async function changePassword(
  currentPassword: string,
  newPassword: string,
) {
  try {
    const accessToken = useAuthStore.getState().accessToken || "";
    const serverAxios = createAxiosInstance(accessToken);
    const response = await serverAxios.post("/auth/change-password", {
      currentPassword,
      newPassword,
    });

    return {
      success: true,
      message: response.data.message || "Password changed successfully",
    };
  } catch (error) {
    console.error("Change password failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Xác nhận đặt lại mật khẩu với token (qua email)
export async function confirmResetPassword(token: string, newPassword: string) {
  try {
    const response = await axiosInstance.post("/auth/reset-password/confirm", {
      token,
      newPassword,
    });
    return {
      success: true,
      message: response.data.message || "Password has been reset successfully",
    };
  } catch (error) {
    console.error("Confirm reset password failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
