import { create } from "zustand";
import { DeviceType, User } from "@/types/base";
import { persist, createJSONStorage } from "zustand/middleware";
import { login as loginAction } from "@/actions/auth.action";
import { getUserDataById } from "@/actions/user.action";

// Define the interface first
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
  hydrated: boolean;
}

type AuthStateData = Pick<
  AuthState,
  | "user"
  | "accessToken"
  | "refreshToken"
  | "isAuthenticated"
  | "isLoading"
  | "hydrated"
>;

const initialState: AuthStateData = {
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: false,
  hydrated: false,
};

let store: ReturnType<typeof createStore>;

const createStore = (initState: AuthStateData = initialState) =>
  create<AuthState>()(
    persist(
      (set) => ({
        ...initState,
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
          set({ isLoading: true });
          try {
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
                return true;
              }
            }
            set({ isLoading: false });
            return false;
          } catch {
            set({ isLoading: false });
            return false;
          }
        },
        setLoading: (loading: boolean) => set({ isLoading: loading }),
        updateUser: (updatedUser) =>
          set((state) => ({
            user: state.user ? { ...state.user, ...updatedUser } : null,
          })),
        logout: () =>
          set({
            user: null,
            accessToken: null,
            refreshToken: null,
            isAuthenticated: false,
            isLoading: false,
          }),
        setTokens: (accessToken, refreshToken) =>
          set({
            accessToken,
            refreshToken,
            isAuthenticated: true,
          }),
      }),
      {
        name: "auth-storage",
        storage: createJSONStorage(() => localStorage),
        onRehydrateStorage: () => (state) => {
          if (state) {
            state.hydrated = true;
          }
        },
      },
    ),
  );

// Initialize store on the client side
const initializeStore = (preloadedState: Partial<AuthStateData> = {}) => {
  const _store = store ?? createStore({ ...initialState, ...preloadedState });

  // For SSG and SSR always create a new store
  if (typeof window === "undefined") return _store;

  // Create the store once in the client
  if (!store) store = _store;

  return _store;
};

export const useAuthStore = initializeStore;
