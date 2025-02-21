// 'use client';
//stores/authStore.ts
import { create } from "zustand";
import { AuthState } from "@/types/auth";
import { login as apiLogin, register as apiRegister } from "@/lib/api";

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
  register: async (phoneNumber: string, password: string, fullName: string) => {
    const { accessToken, user } = await apiRegister(
      phoneNumber,
      password,
      fullName,
    );
    localStorage.setItem("accessToken", accessToken);
    set({ accessToken, user, isAuthenticated: true });
  },
}));
export default useAuthStore;
