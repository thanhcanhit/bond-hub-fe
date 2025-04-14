import { create } from "zustand";
import { DeviceType, User, UserInfo } from "@/types/base";
import { persist, createJSONStorage } from "zustand/middleware";
import {
  login as loginAction,
  logout as logoutAction,
} from "@/actions/auth.action";
import { getUserDataById } from "@/actions/user.action";

const storage = {
  getItem: (name: string): string | null => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(name);
  },
  setItem: (name: string, value: string): void => {
    if (typeof window === "undefined") return;
    localStorage.setItem(name, value);
  },
  removeItem: (name: string): void => {
    if (typeof window === "undefined") return;
    localStorage.removeItem(name);
  },
};

interface UserWithInfo extends User {
  userInfo: UserInfo;
}

interface AuthState {
  user: UserWithInfo | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  deviceId: string | null;
  _hasHydrated: boolean;
  setAuth: (user: User, accessToken: string) => void;
  login: (
    identifier: string,
    password: string,
    deviceName: string,
    deviceType: DeviceType,
  ) => Promise<boolean>;
  updateUser: (user: Partial<User>) => void;
  logout: () => Promise<boolean>;
  setTokens: (accessToken: string, refreshToken: string) => void;
  setLoading: (loading: boolean) => void;
  setHasHydrated: (state: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
      // Removed socket and socketId to avoid storing them in localStorage
      deviceId: null,
      _hasHydrated: false,
      setHasHydrated: (state) => set({ _hasHydrated: state }),
      setAuth: (user: User, accessToken: string) =>
        set({
          accessToken,
          user: user as UserWithInfo,
          isAuthenticated: !!accessToken,
          isLoading: false,
        }),
      login: async (
        identifier: string,
        password: string,
        deviceName: string,
        deviceType: DeviceType,
      ) => {
        try {
          set({ isLoading: true });
          const result = await loginAction(
            identifier,
            password,
            deviceName,
            deviceType,
          );

          if (!result.success) return false;

          // First set the tokens and basic user data
          console.log(
            "Login successful, setting tokens. accessToken:",
            result.accessToken ? "Token exists" : "No token",
          );

          // Lưu refreshToken vào state nhưng không lưu vào localStorage
          // (partialize sẽ loại bỏ refreshToken khi lưu vào localStorage)
          set({
            accessToken: result.accessToken,
            refreshToken: result.refreshToken,
            deviceId: result.deviceId,
            isAuthenticated: true,
            isLoading: false,
          });
          console.log(
            "After login, accessToken in store:",
            useAuthStore.getState().accessToken ? "Token exists" : "No token",
          );

          // Socket sẽ được khởi tạo tự động bởi SocketProvider
          // Then try to get additional user data
          try {
            const userData = await getUserDataById(result.user.userId);
            if (userData.success && userData.user) {
              set({
                user: userData.user as UserWithInfo,
                isLoading: false,
              });
            }
          } catch {
            // Set basic user data if additional data fetch fails
            set({
              user: result.user as UserWithInfo,
              isLoading: false,
            });
          }
          return true;
        } catch {
          return false;
        } finally {
          set({ isLoading: false });
        }
      },
      setLoading: (loading: boolean) => set({ isLoading: loading }),
      updateUser: (updatedUser) =>
        set((state) => {
          if (!state.user) return { user: null };

          // Merge userInfo properly if it exists in updatedUser
          const mergedUserInfo = updatedUser.userInfo
            ? { ...state.user.userInfo, ...updatedUser.userInfo }
            : state.user.userInfo;

          return {
            user: {
              ...state.user,
              ...updatedUser,
              userInfo: mergedUserInfo,
            },
          };
        }),
      logout: async () => {
        try {
          // Socket sẽ được ngắt kết nối tự động khi accessToken thay đổi
          await logoutAction();
        } catch {
          // Ignore errors from the API
        } finally {
          // Always reset store state to ensure UI updates
          // Xóa cả refreshToken khỏi store
          set({
            user: null,
            accessToken: null,
            refreshToken: null,
            deviceId: null,
            isAuthenticated: false,
            isLoading: false,
          });
        }

        return true; // Always return true to ensure UI updates
      },
      setTokens: (accessToken, refreshToken) => {
        console.log(
          "setTokens called with accessToken:",
          accessToken ? "Token exists" : "No token",
        );

        // Lưu refreshToken vào state nhưng không lưu vào localStorage
        // (được xử lý bởi partialize)
        set({
          accessToken,
          refreshToken,
          isAuthenticated: true,
          // Keep existing deviceId
        });

        // Socket sẽ được cập nhật tự động bởi SocketProvider khi accessToken thay đổi
        console.log(
          "After setTokens, accessToken in store:",
          useAuthStore.getState().accessToken ? "Token exists" : "No token",
        );
      },
    }),

    {
      name: "auth-storage",
      storage: createJSONStorage(() => storage),
      partialize: (state) => ({
        accessToken: state.accessToken,
        // Không lưu refreshToken vào localStorage
        isAuthenticated: state.isAuthenticated,
        user: state.user,
        deviceId: state.deviceId,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.setHasHydrated(true);
        }
      },
    },
  ),
);
