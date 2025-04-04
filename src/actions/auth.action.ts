"use server";
import axiosInstance from "@/lib/axios";
import { useAuthStore } from "@/stores/authStore";
import { DeviceType } from "@/types/base";

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
export async function login(
  identifier: string,
  password: string,
  deviceName: string,
  deviceType: DeviceType,
) {
  try {
    const response = await axiosInstance.post("/auth/login", {
      [isEmail(identifier) ? "email" : "phoneNumber"]: identifier,
      password,
      deviceName,
      deviceType,
    });
    console.log("Login response:", response.data);

    const { user, accessToken, refreshToken } = response.data;

    return { success: true, user, accessToken, refreshToken };
  } catch (error) {
    console.error("Login failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

function isEmail(input: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(input);
}

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
