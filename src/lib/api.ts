//lib/api.ts
import axios, { InternalAxiosRequestConfig } from "axios";
import useAuthStore from "@/stores/authStore";
import { AuthResponse } from "@/types/auth";

const NEXT_PUBLIC_BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

const api = axios.create({
  baseURL: NEXT_PUBLIC_BACKEND_URL,
  withCredentials: true,
});

// Request interceptor
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig): InternalAxiosRequestConfig => {
    const accessToken = useAuthStore.getState().accessToken;
    if (accessToken) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
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

// Đăng ký tài khoản (Bỏ qua xác thực OTP)
export const register = async (
  phoneNumber: string,
  password: string,
  fullName: string,
): Promise<AuthResponse> => {
  const response = await api.post<AuthResponse>("/auth/register", {
    phoneNumber,
    password,
    fullName,
  });
  return response.data;
};

export default api;
