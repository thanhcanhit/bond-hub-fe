import { useEffect, useRef, useCallback } from "react";
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
  const isSyncingRef = useRef<boolean>(false); // Tránh đồng bộ đồng thời
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null); // Timeout để tránh gọi API quá nhiều

  // Hàm đồng bộ dữ liệu người dùng từ database với các kiểm tra để tránh gọi API quá nhiều
  const syncUserData = useCallback(async () => {
    // Kiểm tra điều kiện trước khi đồng bộ
    if (!isAuthenticated || !user?.id || isSyncingRef.current) return;

    // Kiểm tra thời gian từ lần đồng bộ cuối cùng, nếu chưa đủ 5 giây thì bỏ qua
    const now = Date.now();
    if (now - lastSyncRef.current < 5000) return;

    // Đánh dấu đang đồng bộ để tránh gọi nhiều lần
    isSyncingRef.current = true;

    try {
      const response = await getUserDataById(user.id);
      if (response.success && response.user) {
        updateUser(response.user);
        lastSyncRef.current = now;
      }
    } catch {
      // Xử lý lỗi một cách yên lặng để tránh crash ứng dụng
    } finally {
      // Đặt timeout để tránh đồng bộ liên tục
      syncTimeoutRef.current = setTimeout(() => {
        isSyncingRef.current = false;
      }, 2000);
    }
  }, [isAuthenticated, user?.id, updateUser]);

  // Thiết lập interval để đồng bộ dữ liệu định kỳ
  useEffect(() => {
    if (!enabled || !isAuthenticated) return;

    // Đồng bộ dữ liệu ngay khi component mount (với một độ trễ nhỏ để tránh block rendering)
    const initialSyncTimeout = setTimeout(() => {
      syncUserData();
    }, 1000);

    // Thiết lập interval để đồng bộ dữ liệu định kỳ
    // Sử dụng interval lớn hơn để giảm tải server
    intervalRef.current = setInterval(syncUserData, Math.max(interval, 30000));

    return () => {
      // Xóa tất cả các timer để tránh memory leak
      if (initialSyncTimeout) clearTimeout(initialSyncTimeout);
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);

      intervalRef.current = null;
      syncTimeoutRef.current = null;
    };
  }, [isAuthenticated, interval, enabled, syncUserData]);

  // Không cần useEffect thứ hai vì đã có dependency trong syncUserData

  return {
    syncUserData,
    lastSync: lastSyncRef.current,
  };
};

// Cache kết quả để tránh gọi API quá nhiều
let lastRefreshTime = 0;
let refreshPromise: Promise<boolean> | null = null;

// Hàm tiện ích để đồng bộ dữ liệu người dùng từ bất kỳ đâu trong ứng dụng
// Sử dụng kỹ thuật debounce và cache để giảm số lần gọi API
export const refreshUserData = async (): Promise<boolean> => {
  const now = Date.now();

  // Nếu đã gọi trong vòng 2 giây, trả về promise đang chờ hoặc true
  if (now - lastRefreshTime < 2000) {
    return refreshPromise || Promise.resolve(true);
  }

  const { user, updateUser } = useAuthStore.getState();
  if (!user?.id) return false;

  lastRefreshTime = now;

  // Tạo và cache promise
  refreshPromise = getUserDataById(user.id)
    .then((response) => {
      if (response.success && response.user) {
        updateUser(response.user);
        return true;
      }
      return false;
    })
    .catch(() => false)
    .finally(() => {
      // Xóa cache sau 2 giây
      setTimeout(() => {
        refreshPromise = null;
      }, 2000);
    });

  return refreshPromise;
};
