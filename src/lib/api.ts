//lib/api.ts
import axios, { InternalAxiosRequestConfig } from "axios";
import useAuthStore from "@/stores/authStore";
import { AuthResponse } from "@/types/auth";

const NEXT_PUBLIC_BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;
//import { useAuthStore } from "../stores/authStore";

const api = axios.create({
  baseURL: NEXT_PUBLIC_BACKEND_URL, // Đổi thành URL backend
  withCredentials: true,
});

// Request interceptor
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig): InternalAxiosRequestConfig => {
    const accessToken = useAuthStore.getState().accessToken;
    if (accessToken) {
      config.headers = config.headers || {}; // Ensure headers is defined
      config.headers.Authorization = `Bearer ${accessToken}`; // Set Authorization header
    }
    return config;
  },
  (error) => Promise.reject(error), // Handle request errors
);

// Response interceptor for token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const { data } = await api.post<AuthResponse>("/auth/refresh", null);
        const { accessToken, user } = data;

        useAuthStore
          .getState()
          .setAuth(accessToken, user || useAuthStore.getState().user!);

        originalRequest.headers = originalRequest.headers || {}; // Ensure headers is defined
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        useAuthStore.getState().logout();
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  },
);

// Login function (API-only)
export const login = async (credentials: {
  phoneNumber: string;
  password: string;
}): Promise<AuthResponse> => {
  const response = await api.post<AuthResponse>("/auth/login", credentials);
  return response.data;
};

// Logout function
export const logout = async (): Promise<void> => {
  await api.post("/auth/logout", null);
};

export default api;
