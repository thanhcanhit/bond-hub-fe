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
    console.log("[auth.action] Starting token refresh...");
    const authState = useAuthStore.getState();
    const refreshToken = authState.refreshToken;
    const deviceId = authState.deviceId;

    console.log("[auth.action] Auth state during refresh:", {
      hasRefreshToken: !!refreshToken,
      hasDeviceId: !!deviceId,
      isAuthenticated: authState.isAuthenticated,
    });

    if (!refreshToken) {
      console.error("[auth.action] Refresh token is missing");
      throw new Error("No refresh token available");
    }

    if (!deviceId) {
      console.error("[auth.action] Device ID is missing");
      throw new Error("No device ID available");
    }

    // Sử dụng instance axios dành riêng cho refresh token đã được tạo trong lib/axios.ts
    console.log(
      `[auth.action] Sending refresh token request with deviceId: ${deviceId}`,
    );

    // Gửi refreshToken và deviceId trong request body theo yêu cầu của backend
    console.log(
      `[auth.action] Sending refresh token request with refreshToken: ${refreshToken.substring(0, 10)}... and deviceId: ${deviceId}`,
    );

    const response = await refreshTokenAxios.post("/auth/refresh", {
      refreshToken,
      deviceId,
    });

    console.log(
      `[auth.action] Refresh token response status: ${response.status}`,
    );

    if (!response.data || !response.data.accessToken) {
      console.error(
        "[auth.action] Invalid response from refresh token API:",
        response.data,
      );
      throw new Error("Invalid response from refresh token API");
    }

    const { accessToken } = response.data;
    const device = response.data.device;

    console.log(
      `[auth.action] Received new access token: ${accessToken.substring(0, 10)}...`,
    );

    if (typeof window !== "undefined") {
      // Keep the same refreshToken since backend doesn't return a new one
      console.log("[auth.action] Setting tokens in auth store...");
      useAuthStore.getState().setTokens(accessToken, refreshToken);
    }

    // Cập nhật cookie nếu đang chạy trên server
    if (typeof window === "undefined") {
      try {
        console.log("[auth.action] Setting cookie on server...");
        const { cookies } = await import("next/headers");
        (await cookies()).set("access_token", accessToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          maxAge: 60 * 60 * 24 * 7, // 7 days
          path: "/",
        });
      } catch (cookieError) {
        console.error("[auth.action] Failed to set cookie:", cookieError);
        // Continue even if cookie setting fails
      }
    }

    console.log("[auth.action] Token refresh successful");
    return { success: true, accessToken, device };
  } catch (error) {
    console.error("[auth.action] Token refresh failed:", error);

    // Only logout if we're in the browser
    if (typeof window !== "undefined") {
      console.log("[auth.action] Logging out due to refresh token failure");
      try {
        await useAuthStore.getState().logout();
      } catch (logoutError) {
        console.error("[auth.action] Error during logout:", logoutError);
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
