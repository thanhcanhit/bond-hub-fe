import axios, { InternalAxiosRequestConfig } from "axios";
import { useAuthStore } from "@/stores/authStore";

const NEXT_PUBLIC_BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

// Log the backend URL for debugging
console.log("Backend URL:", NEXT_PUBLIC_BACKEND_URL || "Not set");

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

// Flag to prevent multiple refresh token requests
let isRefreshing = false;
// Queue of requests to retry after token refresh
let refreshSubscribers: Array<(token: string) => void> = [];

// Function to add callbacks to the queue
const subscribeTokenRefresh = (callback: (token: string) => void) => {
  refreshSubscribers.push(callback);
};

// Function to notify all subscribers with the new token
const onTokenRefreshed = (token: string) => {
  refreshSubscribers.forEach((callback) => callback(token));
  refreshSubscribers = [];
};

// Function to handle token refresh
const refreshAuthToken = async () => {
  const refreshToken = useAuthStore.getState().refreshToken;
  const deviceId = useAuthStore.getState().deviceId;

  if (!refreshToken || !deviceId) {
    throw new Error("No refresh token or device ID available");
  }

  // Create a new axios instance without interceptors to avoid infinite loops
  const refreshAxios = axios.create({
    baseURL: NEXT_PUBLIC_BACKEND_URL || "http://localhost:3000",
    headers: { "Content-Type": "application/json" },
    timeout: 15000,
  });

  const response = await refreshAxios.post("/auth/refresh", {
    refreshToken,
    deviceId,
  });

  const { accessToken } = response.data;
  // Keep the same refreshToken since backend doesn't return a new one
  useAuthStore.getState().setTokens(accessToken, refreshToken);
  console.log("Token refreshed successfully:", accessToken);

  return accessToken;
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

    // Only handle 401 errors for requests that haven't been retried yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      // Mark this request as retried to prevent infinite loops
      originalRequest._retry = true;

      // If we're already refreshing, add this request to the queue
      if (isRefreshing) {
        console.log(
          "Token refresh already in progress, adding request to queue",
        );
        return new Promise((resolve) => {
          subscribeTokenRefresh((token) => {
            originalRequest.headers["Authorization"] = `Bearer ${token}`;
            resolve(axiosInstance(originalRequest));
          });
        });
      }

      // Start refreshing token
      isRefreshing = true;

      try {
        const newToken = await refreshAuthToken();

        // Notify all subscribers that the token has been refreshed
        onTokenRefreshed(newToken);

        // Update the original request with the new token
        originalRequest.headers["Authorization"] = `Bearer ${newToken}`;

        // Reset refreshing flag
        isRefreshing = false;

        // Retry the original request
        return axiosInstance(originalRequest);
      } catch (refreshError) {
        // Reset refreshing flag
        isRefreshing = false;

        // Clear the queue
        refreshSubscribers = [];

        // Log the user out
        console.error("Token refresh failed:", refreshError);
        useAuthStore.getState().logout();

        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  },
);

export default axiosInstance;
