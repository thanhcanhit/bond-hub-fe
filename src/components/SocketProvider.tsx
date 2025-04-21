"use client";

import { memo } from "react";
import { useSocketConnection } from "@/hooks/useSocketConnection";
import { useAuthStore } from "@/stores/authStore";
import { useFriendSocket } from "@/hooks/useFriendSocket";
import { useGroupSocket } from "@/hooks/useGroupSocket";
import ChatSocketHandler from "./chat/ChatSocketHandler";
import GroupSocketHandler from "./group/GroupSocketHandler";

// Sử dụng memo để tránh re-render không cần thiết
function SocketProvider({ children }: { children: React.ReactNode }) {
  // Sử dụng selector để chỉ lấy giá trị cần thiết, tránh re-render khi các giá trị khác thay đổi
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  // Chỉ khởi tạo socket connection nếu đã đăng nhập
  useSocketConnection(isAuthenticated);

  // Khởi tạo kết nối socket cho namespace /friends để lắng nghe sự kiện reload
  useFriendSocket();

  // Khởi tạo kết nối socket cho namespace /groups để lắng nghe sự kiện nhóm
  useGroupSocket();

  // Trả về các socket handlers và children
  return (
    <>
      {isAuthenticated && (
        <>
          <ChatSocketHandler />
          <GroupSocketHandler />
        </>
      )}
      {children}
    </>
  );
}

// Export memo component để tránh re-render không cần thiết
export default memo(SocketProvider);
