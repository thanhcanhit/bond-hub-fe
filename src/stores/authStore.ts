import { create } from "zustand";
import { DeviceType, User, UserInfo } from "@/types/base";
import { persist, createJSONStorage } from "zustand/middleware";
import {
  login as loginAction,
  logout as logoutAction,
} from "@/actions/auth.action";
import { getUserDataById } from "@/actions/user.action";

// Custom storage that handles SSR
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
  _hasHydrated: boolean;
  setAuth: (user: User, accessToken: string) => void;
  login: (
    phoneNumber: string,
    password: string,
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
        phoneNumber: string,
        password: string,
        deviceType: DeviceType,
      ) => {
        try {
          set({ isLoading: true });
          const result = await loginAction(phoneNumber, password, deviceType);

          if (result.success) {
            // First set the tokens and basic user data
            set({
              accessToken: result.accessToken,
              refreshToken: result.refreshToken,
              isAuthenticated: true,
              isLoading: false,
            });

            // Then try to get additional user data
            try {
              const userData = await getUserDataById(result.user.id);
              if (userData.success && userData.user) {
                set({
                  user: userData.user as UserWithInfo,
                  isLoading: false,
                });
              }
            } catch (userDataError) {
              console.warn(
                "Failed to fetch additional user data:",
                userDataError,
              );
              // Set basic user data if additional data fetch fails
              set({
                user: result.user as UserWithInfo,
                isLoading: false,
              });
            }

            return true;
          }
          return false;
        } catch (error) {
          console.error("Login error:", error);
          return false;
        } finally {
          set({ isLoading: false });
        }
      },
      setLoading: (loading: boolean) => set({ isLoading: loading }),
      updateUser: (updatedUser) =>
        set((state) => ({
          user: state.user
            ? { ...state.user, ...updatedUser, userInfo: state.user.userInfo }
            : null,
        })),
      logout: async () => {
        const result = await logoutAction();
        if (result.success) {
          set({
            user: null,
            accessToken: null,
            refreshToken: null,
            isAuthenticated: false,
            isLoading: false,
          });
        }
        return result.success;
      },
      setTokens: (accessToken, refreshToken) =>
        set({
          accessToken,
          refreshToken,
          isAuthenticated: true,
        }),
    }),
    {
      name: "auth-storage",
      storage: createJSONStorage(() => storage),
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
        user: state.user,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.setHasHydrated(true);
        }
      },
      skipHydration: true,
    },
  ),
);
