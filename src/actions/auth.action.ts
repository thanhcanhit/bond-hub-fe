"use server";
import axiosInstance from "@/lib/axios";
import { useAuthStore } from "@/stores/authStore";
import { DeviceType } from "@/types/base";

// export async function register(email: string, password: string, fullName: string) {
//     try {
//         const response = await axiosInstance.post('/auth/register', {
//             email,
//             password,
//             fullName,
//         });
//         const { user, accessToken} = response.data;

//         // Cập nhật store (chỉ hoạt động phía client)
//         if (typeof window !== 'undefined') {
//             useAuthStore.getState().setAuth(user, accessToken);
//         }

//         return { success: true, user };
//     } catch (error) {
//         console.error('Registration failed:', error);
//         return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
//     }
// }
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
) {
  try {
    const response = await axiosInstance.post("/auth/register/complete", {
      registrationId,
      password,
      fullName,
    });
    const { user, accessToken } = response.data;

    // Cập nhật store (chỉ hoạt động phía client)
    if (typeof window !== "undefined") {
      useAuthStore.getState().setAuth(user, accessToken);
    }

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
  phoneNumber: string,
  password: string,
  deviceType: DeviceType,
) {
  // try {
  //     // Thu thập thông tin thiết bị nếu cần thiết
  //     const deviceInfo = {
  //         deviceName: navigator.userAgent, // Có thể cải thiện logic này
  //         deviceType: 'web', // Có thể thay đổi tùy theo thiết bị
  //         ipAddress: 'unknown', // Cần thêm logic để lấy IP thực tế nếu cần
  //         userAgent: navigator.userAgent,
  //     };

  //     const response = await axiosInstance.post('/auth/login', {
  //         phoneNumber,
  //         password,
  //         ...deviceInfo,
  //     });
  //     const { user, accessToken} = response.data;

  //     // Cập nhật store (chỉ hoạt động phía client)
  //     if (typeof window !== 'undefined') {
  //         useAuthStore.getState().setAuth(user, accessToken);
  //     }

  //     return { success: true, user };
  // } catch (error) {
  //     console.error('Login failed:', error);
  //     return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  // }

  try {
    const response = await axiosInstance.post("/auth/login", {
      phoneNumber,
      password,
      deviceType,
    });
    const { user, accessToken } = response.data;
    return { success: true, user, accessToken };
  } catch (error) {
    console.error("Login failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Đăng xuất
export async function logout() {
  // try {
  //     const refreshToken = useAuthStore.getState().refreshToken;
  //     if (refreshToken) {
  //         await axiosInstance.post('/auth/logout', {}, {
  //             headers: { 'refresh-token': refreshToken },
  //         });
  //     }

  //     // Xóa trạng thái phía client
  //     if (typeof window !== 'undefined') {
  //         useAuthStore.getState().logout();
  //     }

  //     return { success: true };
  // } catch (error) {
  //     console.error('Logout failed:', error);
  //     return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  // }

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
      localStorage.removeItem("accessToken");
      useAuthStore.getState().logout();
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

    // Cập nhật token trong store
    if (typeof window !== "undefined") {
      useAuthStore
        .getState()
        .setTokens(accessToken, newRefreshToken || refreshToken);
    }

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

// export async function login(email: string, password: string) {
//     try {

//         const response = await axiosInstance.post('/auth/login', {
//             email,
//             password,
//         });
//         const { user, accessToken} = response.data;

//         // Cập nhật store (chỉ hoạt động phía client)
//         if (typeof window !== 'undefined') {
//             useAuthStore.getState().setAuth(user, accessToken);
//         }

//         return { success: true, user };
//     } catch (error) {
//         console.error('Login failed:', error);
//         return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
//     }
// }

// export async function logout() {
//     try {
//         // Gọi API logout nếu backend yêu cầu (tùy chọn)
//         await axiosInstance.post('/auth/logout');

//         // Xóa trạng thái phía client
//         if (typeof window !== 'undefined') {
//             useAuthStore.getState().logout();
//         }

//         return { success: true };
//     } catch (error) {
//         console.error('Logout failed:', error);
//         return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
//     }
// }

// export async function refreshToken() {
//     try {
//         const refreshToken = useAuthStore.getState().refreshToken;
//         const response = await axiosInstance.post('/auth/refresh', { refreshToken });
//         const { accessToken, refreshToken: newRefreshToken } = response.data;

//         // Cập nhật token trong store
//         if (typeof window !== 'undefined') {
//             useAuthStore.getState().setTokens(accessToken, newRefreshToken || refreshToken);
//         }

//         return { success: true };
//     } catch (error) {
//         console.error('Token refresh failed:', error);
//         if (typeof window !== 'undefined') {
//             useAuthStore.getState().logout();
//         }
//         return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
//     }
// }
