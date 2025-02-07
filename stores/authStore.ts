// 'use client';
// import { create } from "zustand";
// import api from "@/lib/api";

// interface AuthState {
//   user: string | null;
//   accessToken: string | null;
//   isLoading: boolean;
//   setAccessToken: (token: string) => void;
//   loginWithPhoneNumber: (phoneNumber: string, password: string) => Promise<void>;
//   logout: () => void;
// }

// export const useAuthStore = create<AuthState>((set) => ({
//   user: null,
//   accessToken: null,
//   isLoading: false,

//   setAccessToken: (token) => {
//     const currentToken = localStorage.getItem("accessToken");
//     if (currentToken !== token) { // ✅ Kiểm tra token trước khi set
//       localStorage.setItem("accessToken", token);
//     }
//     set((state) => (state.accessToken !== token ? { accessToken: token } : state)); // ✅ Chỉ cập nhật nếu khác
//   },

//   loginWithPhoneNumber: async (phoneNumber, password) => {
//     set({ isLoading: true });
//     try {
//       const res = await api.post("/auth/login", { phoneNumber, password });
//       const accessToken = res.data.accessToken;
//       localStorage.setItem("accessToken", accessToken);
//       set({ user: phoneNumber, accessToken: res.data.accessToken });
//     } catch (error) {
//       console.error("Đăng nhập thất bại:", error);
//     } finally {
//       set({ isLoading: false });
//     }
//   },

//   logout: async () => {
//     set({ isLoading: true });
//     try {
//       await api.post("/auth/logout");
//       localStorage.removeItem("accessToken");
//       set({ user: null, accessToken: null });
//     } catch (error) {
//       console.error("Lỗi khi đăng xuất:", error);
//     } finally {
//       set({ isLoading: false });
//     }
//   },
// }));


// // export const useAuthStore = create<AuthState>((set) => ({
  
// //   user: null,
// //   accessToken: null,

// //   setAccessToken: (token) => set({ accessToken: token }),

// //   loginWithPhoneNumber(phoneNumber, password) {
// //     return api.post("/auth/login", { phoneNumber, password }).then((res) => {
// //       console.log("Response from /auth/login:", res);
// //       const { accessToken, refreshToken } = res.data;
// //       localStorage.setItem('accessToken', accessToken);
// //       localStorage.setItem('refreshToken', refreshToken);
// //       set({ user: phoneNumber, accessToken: res.data.accessToken });
// //     });
// //   },
// //   logout: () => {
// //     api.post("/auth/logout");
// //     set({ user: null, accessToken: null });
// //   },
// // }));

import { create } from "zustand";
import api from "@/lib/api";

interface AuthState {
  user: string | null;
  accessToken: string | null;
  setAccessToken: (token: string) => void;
  loginWithPhoneNumber: (phoneNumber: string, password: string) => Promise<void> | void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,

  setAccessToken: (token) => set({ accessToken: token }),

  loginWithPhoneNumber(phoneNumber, password){
      return api.post("/auth/login", { phoneNumber, password }).then((res) => {
        console.log("Response from /auth/login:", res);
        const { accessToken, refreshToken } = res.data;
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', refreshToken);
        set({ user: phoneNumber, accessToken: res.data.accessToken });
      });
    
  },

  logout: () => {
    const refreshToken = localStorage.getItem('refreshToken');
    if (refreshToken) {
      api.post("/auth/logout", null, {
        headers: {
          'refresh-token': refreshToken,
        },
      });
    }
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    set({ user: null, accessToken: null });
  },
}));