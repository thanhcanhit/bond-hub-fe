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
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = useAuthStore.getState().refreshToken;
      const deviceId = useAuthStore.getState().deviceId;

      if (!refreshToken || !deviceId) {
        useAuthStore.getState().logout();
        return Promise.reject(error);
      }

      try {
        const response = await axiosInstance.post("/auth/refresh", {
          refreshToken,
          deviceId,
        });

        const { accessToken } = response.data;
        // Keep the same refreshToken since backend doesn't return a new one
        useAuthStore.getState().setTokens(accessToken, refreshToken);

        console.log("Refreshed token triggred complete:", accessToken);
        // Update the Authorization header for the original request
        originalRequest.headers["Authorization"] = `Bearer ${accessToken}`;
        return axiosInstance(originalRequest);
      } catch (refreshError) {
        // If refresh token fails, log the user out
        useAuthStore.getState().logout();
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  },
);

export default axiosInstance;
