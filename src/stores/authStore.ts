// 'use client';
import { create } from "zustand";
import api from "@/lib/api";

interface AuthState {
  user: string | null;
  accessToken: string | null;
  setAccessToken: (token: string) => void;
  loginWithPhoneNumber: (
    phoneNumber: string,
    password: string,
  ) => Promise<void> | void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,

  setAccessToken: (token) => set({ accessToken: token }),

  loginWithPhoneNumber(phoneNumber, password) {
    return api.post("/auth/login", { phoneNumber, password }).then((res) => {
      console.log("Response from /auth/login:", res);
      const { accessToken } = res.data;
      localStorage.setItem("accessToken", accessToken);
      set({ user: phoneNumber, accessToken: res.data.accessToken });
    });
  },

  logout: () => {
    api.post("/auth/logout");
    localStorage.removeItem("accessToken");
    set({ user: null, accessToken: null });
  },
}));
