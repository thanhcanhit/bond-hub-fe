import { useEffect, useRef } from "react";
import { useAuthStore } from "@/stores/authStore";
import { getUserDataById } from "@/actions/user.action";

/**
 * Hook để đồng bộ dữ liệu người dùng từ database
 * @param interval Thời gian giữa các lần đồng bộ (mặc định: 30 giây)
 * @param enabled Bật/tắt đồng bộ tự động
 */
export const useUserDataSync = (
  interval: number = 30000, // 30 giây
  enabled: boolean = true,
) => {
  const { user, isAuthenticated, updateUser } = useAuthStore();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastSyncRef = useRef<number>(Date.now());

  // Hàm đồng bộ dữ liệu người dùng từ database
  const syncUserData = async () => {
    if (!isAuthenticated || !user?.id) return;

    try {
      const response = await getUserDataById(user.id);
      if (response.success && response.user) {
        updateUser(response.user);
        console.log("✅ User data synchronized from database");
        lastSyncRef.current = Date.now();
      }
    } catch (error) {
      console.error("❌ Error synchronizing user data:", error);
    }
  };

  // Thiết lập interval để đồng bộ dữ liệu định kỳ
  useEffect(() => {
    if (!enabled || !isAuthenticated) return;

    // Đồng bộ dữ liệu ngay khi component mount
    syncUserData();

    // Thiết lập interval để đồng bộ dữ liệu định kỳ
    intervalRef.current = setInterval(syncUserData, interval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isAuthenticated, interval, enabled]);

  // Đồng bộ lại dữ liệu khi user thay đổi (ví dụ: sau khi đăng nhập)
  useEffect(() => {
    if (isAuthenticated && user?.id) {
      syncUserData();
    }
  }, [isAuthenticated, user?.id]);

  return {
    syncUserData,
    lastSync: lastSyncRef.current,
  };
};

// Hàm tiện ích để đồng bộ dữ liệu người dùng từ bất kỳ đâu trong ứng dụng
export const refreshUserData = async (): Promise<boolean> => {
  const { user, updateUser } = useAuthStore.getState();

  if (!user?.id) return false;

  try {
    const response = await getUserDataById(user.id);
    if (response.success && response.user) {
      updateUser(response.user);
      console.log("✅ User data refreshed from database");
      return true;
    }
    return false;
  } catch (error) {
    console.error("❌ Error refreshing user data:", error);
    return false;
  }
};
