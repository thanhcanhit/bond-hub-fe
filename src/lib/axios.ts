import axios, { InternalAxiosRequestConfig } from "axios";
import { useAuthStore } from "@/stores/authStore";

const NEXT_PUBLIC_BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

const axiosInstance = axios.create({
  baseURL: NEXT_PUBLIC_BACKEND_URL,
  headers: { "Content-Type": "application/json" },
});

axiosInstance.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    try {
      const accessToken = useAuthStore.getState().accessToken;
      if (accessToken) {
        config.headers = config.headers || {};
        config.headers.Authorization = `Bearer ${accessToken}`;
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
