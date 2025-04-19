import axios, { InternalAxiosRequestConfig } from "axios";
import { useAuthStore } from "@/stores/authStore";

const NEXT_PUBLIC_BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

// Log the backend URL for debugging
console.log("Backend URL:", NEXT_PUBLIC_BACKEND_URL || "Not set");

// Token refresh state management
let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

// Tạo một instance axios riêng cho việc refresh token để tránh phụ thuộc vòng tròn
export const refreshTokenAxios = axios.create({
  baseURL: NEXT_PUBLIC_BACKEND_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 15000, // 15 seconds timeout
});

// Thêm interceptor để xử lý lỗi mạng cho refreshTokenAxios
refreshTokenAxios.interceptors.response.use(
  (response) => response,
  (error) => {
    // Xử lý lỗi timeout
    if (error.code === "ECONNABORTED") {
      console.error("Refresh token request timeout:", error);
      return Promise.reject(new Error("Request timeout during token refresh"));
    }

    // Xử lý lỗi mạng
    if (!error.response) {
      console.error("Network error during token refresh:", error);
      return Promise.reject(new Error("Network error during token refresh"));
    }

    // Xử lý các lỗi khác
    console.error(
      "Error during token refresh:",
      error.response?.status,
      error.response?.data,
    );
    return Promise.reject(error);
  },
);

// Tạo một instance axios cơ bản với token được truyền vào
export const createAxiosInstance = (token?: string) => {
  const instance = axios.create({
    baseURL: NEXT_PUBLIC_BACKEND_URL,
    headers: { "Content-Type": "application/json" },
    timeout: 15000, // 15 seconds timeout
  });

  // Nếu có token được truyền vào và không rỗng, sử dụng nó
  if (token && token.trim() !== "") {
    instance.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    console.log(
      `Setting Authorization header with token: ${token.substring(0, 10)}...`,
    );
  } else {
    console.log("No valid token provided");
  }

  // Xử lý lỗi mạng
  instance.interceptors.response.use(
    (response) => response,
    (error) => {
      // Handle network errors
      if (error.code === "ECONNABORTED") {
        console.error("Request timeout:", error);
        return Promise.reject(new Error("Request timeout. Please try again."));
      }

      if (!error.response) {
        console.error("Network error:", error);
        return Promise.reject(
          new Error("Network error. Please check your connection."),
        );
      }

      return Promise.reject(error);
    },
  );

  return instance;
};

const axiosInstance = axios.create({
  baseURL: NEXT_PUBLIC_BACKEND_URL || "http://localhost:3000",
  headers: { "Content-Type": "application/json" },
  timeout: 15000, // 15 seconds timeout
});

axiosInstance.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    try {
      const accessToken = useAuthStore.getState().accessToken;
      console.log(`Axios request to ${config.url}`, {
        hasToken: !!accessToken,
        baseURL: config.baseURL,
      });

      if (accessToken) {
        config.headers = config.headers || {};
        config.headers.Authorization = `Bearer ${accessToken}`;
      } else {
        console.warn("No access token available for request");
      }
      return config;
    } catch (error) {
      console.error("Error in axios interceptor:", error);
      return config;
    }
  },
  (error) => Promise.reject(error),
);

// Function to add a request to the refresh token subscribers queue
const subscribeTokenRefresh = (callback: (token: string) => void) => {
  refreshSubscribers.push(callback);
};

// Function to notify all subscribers that the token has been refreshed
const onTokenRefreshed = (token: string) => {
  refreshSubscribers.forEach((callback) => callback(token));
  refreshSubscribers = [];
};

// Function to refresh the token
const refreshAuthToken = async () => {
  try {
    console.log("Starting token refresh process...");
    const authState = useAuthStore.getState();
    const refreshToken = authState.refreshToken;
    const deviceId = authState.deviceId;

    console.log("Auth state during refresh:", {
      hasRefreshToken: !!refreshToken,
      hasDeviceId: !!deviceId,
      isAuthenticated: authState.isAuthenticated,
    });

    if (!refreshToken) {
      console.error("Refresh token is missing");
      throw new Error("No refresh token available");
    }

    if (!deviceId) {
      console.error("Device ID is missing");
      throw new Error("No device ID available");
    }

    // Sử dụng instance axios dành riêng cho refresh token
    console.log(
      "Sending refresh token request with refreshToken:",
      refreshToken.substring(0, 10) + "...",
    );
    console.log("Sending refresh token request with deviceId:", deviceId);

    const response = await refreshTokenAxios.post("/auth/refresh", {
      refreshToken,
      deviceId,
    });

    console.log(
      "Refresh token response:",
      response.status,
      response.statusText,
    );

    if (!response.data || !response.data.accessToken) {
      console.error("Invalid response from refresh token API:", response.data);
      throw new Error("Invalid response from refresh token API");
    }

    const { accessToken } = response.data;

    // Keep the same refreshToken since backend doesn't return a new one
    console.log("Setting new tokens in auth store...");
    useAuthStore.getState().setTokens(accessToken, refreshToken);

    console.log(
      "Token refresh successful:",
      accessToken.substring(0, 10) + "...",
    );
    return accessToken;
  } catch (error) {
    console.error("Token refresh failed with error:", error);

    // Chỉ logout nếu lỗi không phải là lỗi mạng
    if (
      axios.isAxiosError(error) &&
      (!error.response || error.response.status === 401)
    ) {
      console.log("Logging out due to refresh token failure");
      // Clear auth state on refresh token failure
      useAuthStore.getState().logout();
    }

    throw error;
  } finally {
    console.log("Token refresh process completed, resetting isRefreshing flag");
    isRefreshing = false;
  }
};

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Handle network errors
    if (error.code === "ECONNABORTED") {
      console.error("Request timeout:", error);
      return Promise.reject(new Error("Request timeout. Please try again."));
    }

    if (!error.response) {
      console.error("Network error:", error);
      return Promise.reject(
        new Error("Network error. Please check your connection."),
      );
    }

    const originalRequest = error.config;
    console.log(
      `Received error ${error.response.status} for ${originalRequest.url}`,
    );

    // Xử lý lỗi 401 Unauthorized
    if (error.response?.status === 401 && !originalRequest._retry) {
      console.log("Received 401 error, attempting to refresh token...");

      // Đánh dấu request này đã được thử lại để tránh vòng lặp vô hạn
      originalRequest._retry = true;

      // Kiểm tra xem chúng ta có dữ liệu cần thiết để làm mới token hay không
      const authState = useAuthStore.getState();
      const refreshToken = authState.refreshToken;
      const deviceId = authState.deviceId;

      console.log("Auth state for 401 handler:", {
        hasRefreshToken: !!refreshToken,
        hasDeviceId: !!deviceId,
        isAuthenticated: authState.isAuthenticated,
      });

      if (!refreshToken || !deviceId) {
        console.error(
          "Cannot refresh token: Missing refresh token or device ID",
        );
        await useAuthStore.getState().logout();
        return Promise.reject(
          new Error("Session expired. Please login again."),
        );
      }

      // Nếu đang có quá trình làm mới token, chờ nó hoàn thành
      if (isRefreshing) {
        console.log("Token refresh already in progress, queuing request");
        return new Promise((resolve, reject) => {
          subscribeTokenRefresh((token) => {
            console.log("Received refreshed token for queued request");
            originalRequest.headers["Authorization"] = `Bearer ${token}`;
            resolve(axiosInstance(originalRequest));
          });

          // Thêm timeout để tránh chờ vô hạn
          setTimeout(() => {
            reject(new Error("Token refresh timeout"));
          }, 15000); // 15 seconds timeout
        });
      }

      // Bắt đầu quá trình làm mới token mới
      console.log("Starting new token refresh process");
      isRefreshing = true;

      try {
        const newToken = await refreshAuthToken();
        console.log("Token refresh successful, updating original request");

        // Thông báo cho tất cả các subscriber rằng token đã được làm mới
        onTokenRefreshed(newToken);

        // Cập nhật header authorization và thử lại request ban đầu
        originalRequest.headers["Authorization"] = `Bearer ${newToken}`;
        return axiosInstance(originalRequest);
      } catch (refreshError) {
        // Nếu làm mới token thất bại, từ chối với lỗi ban đầu
        console.error(
          "Token refresh failed, rejecting original request",
          refreshError,
        );

        // Thông báo cho tất cả các subscriber rằng token refresh đã thất bại
        // Để tránh các request bị treo vô hạn
        onTokenRefreshed(""); // Empty token will cause subscribers to fail properly

        return Promise.reject(
          new Error("Session expired. Please login again."),
        );
      }
    }

    // Đối với tất cả các lỗi khác, chỉ từ chối với lỗi ban đầu
    return Promise.reject(error);
  },
);

export default axiosInstance;
