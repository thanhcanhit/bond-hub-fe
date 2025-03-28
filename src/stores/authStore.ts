import { create } from "zustand";
import { DeviceType, User } from "@/types/base";
import { persist, PersistStorage } from "zustand/middleware";
import { login as loginAction } from "@/actions/auth.action";
import { getUserDataById } from "@/actions/user.action";

// Define the storage type (localStorage in this case)
const storage: PersistStorage<Partial<AuthState>> = {
  getItem: (name) => {
    const value = localStorage.getItem(name);
    return value ? JSON.parse(value) : null;
  },
  setItem: (name, value) => {
    localStorage.setItem(name, JSON.stringify(value));
  },
  removeItem: (name) => {
    localStorage.removeItem(name);
  },
};

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  setAuth: (user: User, accessToken: string) => void;
  login: (
    phoneNumber: string,
    password: string,
    deviceType: DeviceType,
  ) => Promise<boolean>;
  updateUser: (user: Partial<User>) => void;
  logout: () => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  isLoading: boolean;
  setLoading: (loading: boolean) => void;
}
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
      setAuth: (user: User, accessToken: string) =>
        set({
          accessToken,
          user,
          isAuthenticated: !!accessToken,
          isLoading: false,
        }),
      login: async (
        phoneNumber: string,
        password: string,
        deviceType: DeviceType,
      ) => {
        const result = await loginAction(phoneNumber, password, deviceType);
        if (result.success) {
          const userData = await getUserDataById(result.user.id);
          if (userData.success) {
            const data = userData.user;
            set({
              user: data,
              accessToken: result.accessToken,
              refreshToken: result.refreshToken,
              isAuthenticated: true,
              isLoading: false,
            });
          }
          return true;
        }
        return false;
      },
      setLoading: (loading: boolean) => set({ isLoading: loading }),
      updateUser: (updatedUser) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...updatedUser } : null,
        })),
      logout: () => {
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          isLoading: false,
        });
        storage.removeItem("auth-storage");
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
      storage,
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
        user: state.user,
      }),
    },
  ),
);
