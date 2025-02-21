// 'use client';
//stores/authStore.ts
import { create } from "zustand";
import { AuthState } from "@/types/auth";
import { login as apiLogin } from "@/lib/api";

const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  setAuth: (accessToken, user) =>
    set({ accessToken, user, isAuthenticated: !!accessToken }),

  login: async (credentials: { phoneNumber: string; password: string }) => {
    const { accessToken, user } = await apiLogin(credentials); // Call API
    const finalUser = user || {
      id: 0,
      phoneNumber: credentials.phoneNumber,
      roles: [],
    }; // Fallback
    localStorage.setItem("accessToken", accessToken); // Save token to local storage
    set({ accessToken, user: finalUser, isAuthenticated: true }); // Update state
  },
  logout: () => {
    localStorage.removeItem("accessToken"); // Remove token from local storage
    set({
      accessToken: null,
      user: null,
      isAuthenticated: false,
    });
  },
}));
const storedToken = localStorage.getItem("accessToken");
if (storedToken) {
  useAuthStore.getState().setAuth(storedToken, useAuthStore.getState().user!);
}
export default useAuthStore;
