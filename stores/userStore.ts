import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
    username: string;
}

interface UserStore {
    user: User | null;
    isLoading: boolean;
    login: (username: string) => Promise<void>;
    logout: () => Promise<void>;
}

const useUserStore = create(
    persist<UserStore>(
        (set) => ({
            user: null,
            isLoading: false,

            login: async (username) => {
                set({ isLoading: true });
                // Giả lập API call
                await new Promise((resolve) => setTimeout(resolve, 1500));
                set({ user: { username }, isLoading: false });
            },

            logout: async () => {
                set({ isLoading: true });
                // Giả lập API call
                await new Promise((resolve) => setTimeout(resolve, 1000));
                set({ user: null, isLoading: false });
            },
        }),
        { name: 'user-store' } // Lưu trạng thái vào localStorage
    )
);

export default useUserStore;
