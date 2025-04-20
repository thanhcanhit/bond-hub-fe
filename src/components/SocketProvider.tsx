"use client";

import { memo, useMemo } from "react";
import { useSocketConnection } from "@/hooks/useSocketConnection";
import { useUserDataSync } from "@/hooks/useUserDataSync";
import { useAuthStore } from "@/stores/authStore";
import { useFriendSocket } from "@/hooks/useFriendSocket";
import { useGroupSocket } from "@/hooks/useGroupSocket";
import ChatSocketHandler from "./chat/ChatSocketHandler";
import GroupSocketHandler from "./group/GroupSocketHandler";
// import GroupDissolvedHandler from "./group/GroupDissolvedHandler"; // Đợi backend cập nhật

// Sử dụng memo để tránh re-render không cần thiết
function SocketProvider({ children }: { children: React.ReactNode }) {
  // Sử dụng selector để chỉ lấy giá trị cần thiết, tránh re-render khi các giá trị khác thay đổi
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  // Sử dụng useMemo để tính toán interval chỉ khi cần thiết
  const syncInterval = useMemo(() => {
    // Tăng interval lên 60 giây để giảm tải server
    return 60000; // 60 giây
  }, []);

  // Chỉ khởi tạo socket connection nếu đã đăng nhập
  useSocketConnection(isAuthenticated);

  // Khởi tạo kết nối socket cho namespace /friends để lắng nghe sự kiện reload
  useFriendSocket();

  // Khởi tạo kết nối socket cho namespace /groups để lắng nghe sự kiện nhóm
  useGroupSocket();

  // Đồng bộ dữ liệu người dùng từ database với interval dài hơn
  // Chỉ hoạt động khi đã đăng nhập
  useUserDataSync(syncInterval, isAuthenticated);

  // Trả về các socket handlers và children
  return (
    <>
      {isAuthenticated && (
        <>
          <ChatSocketHandler />
          <GroupSocketHandler />
          {/* <GroupDissolvedHandler /> */} {/* Đợi backend cập nhật */}
        </>
      )}
      {children}
    </>
  );
}

// Export memo component để tránh re-render không cần thiết
export default memo(SocketProvider);
