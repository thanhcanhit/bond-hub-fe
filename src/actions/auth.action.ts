"use server";
import axiosInstance, {
  createAxiosInstance,
  refreshTokenAxios,
} from "@/lib/axios";
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
    // Create a clean axios instance for login (no token needed)
    const serverAxios = createAxiosInstance();

    // Determine if identifier is email or phone number
    const response = await serverAxios.post("/auth/login", {
      [isEmail(identifier) ? "email" : "phoneNumber"]: identifier,
      password,
      deviceName,
      deviceType,
    });

    // Extract response data
    const { user, accessToken, refreshToken, deviceId } = response.data;

    // Validate required fields
    if (!accessToken || !refreshToken || !deviceId) {
      throw new Error("Invalid login response: missing required tokens");
    }

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
    const authState = useAuthStore.getState();
    const refreshToken = authState.refreshToken;
    const accessToken = authState.accessToken || "";

    // Only attempt to call the logout API if we have a refresh token
    if (refreshToken) {
      try {
        const serverAxios = createAxiosInstance(accessToken);
        await serverAxios.post(
          "/auth/logout",
          {},
          {
            headers: { "refresh-token": refreshToken },
          },
        );
      } catch (apiError) {
        // Log but continue with local logout even if API call fails
        console.error(
          "API logout failed, continuing with local logout:",
          apiError,
        );
      }
    }

    // Always return success to ensure UI updates
    return { success: true };
  } catch (error) {
    console.error("Logout failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Làm mới token - This function is now primarily handled by the axios interceptors
// but we keep this for explicit token refresh calls if needed
export async function refreshToken() {
  try {
    const authState = useAuthStore.getState();
    const refreshToken = authState.refreshToken;
    const deviceId = authState.deviceId;

    if (!refreshToken) {
      throw new Error("No refresh token available");
    }

    if (!deviceId) {
      throw new Error("No device ID available");
    }

    // Use the dedicated refresh token axios instance
    const response = await refreshTokenAxios.post("/auth/refresh", {
      refreshToken,
      deviceId,
    });

    if (!response.data || !response.data.accessToken) {
      throw new Error("Invalid response from refresh token API");
    }

    const { accessToken } = response.data;
    const device = response.data.device;

    // Update tokens in the store if in browser environment
    if (typeof window !== "undefined") {
      useAuthStore.getState().setTokens(accessToken, refreshToken);
    }

    // Update cookie if running on server
    if (typeof window === "undefined") {
      try {
        const { cookies } = await import("next/headers");
        (await cookies()).set("access_token", accessToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          maxAge: 60 * 60 * 24 * 7, // 7 days
          path: "/",
        });
      } catch (cookieError) {
        console.error("Failed to set cookie:", cookieError);
        // Continue even if cookie setting fails
      }
    }

    return { success: true, accessToken, device };
  } catch (error) {
    // Only logout if we're in the browser
    if (typeof window !== "undefined") {
      try {
        await useAuthStore.getState().logout();
      } catch (logoutError) {
        console.error("Error during logout:", logoutError);
      }
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
  accessToken: string,
) {
  try {
    if (!accessToken) {
      return {
        success: false,
        error: "Bạn cần đăng nhập lại để thực hiện thao tác này",
      };
    }

    const serverAxios = createAxiosInstance(accessToken);
    const response = await serverAxios.put("/auth/change-password", {
      currentPassword,
      newPassword,
    });

    return {
      success: true,
      message: response.data.message || "Đổi mật khẩu thành công",
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
