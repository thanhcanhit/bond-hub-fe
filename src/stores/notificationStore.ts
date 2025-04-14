import { create } from "zustand";

interface NotificationState {
  // State
  unreadCount: number;

  // Actions
  incrementUnread: () => void;
  decrementUnread: () => void;
  resetUnread: () => void;
  setUnreadCount: (count: number) => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  // State
  unreadCount: 0,

  // Actions
  incrementUnread: () =>
    set((state) => ({ unreadCount: state.unreadCount + 1 })),
  decrementUnread: () =>
    set((state) => ({ unreadCount: Math.max(0, state.unreadCount - 1) })),
  resetUnread: () => set({ unreadCount: 0 }),
  setUnreadCount: (count) => set({ unreadCount: count }),
}));
