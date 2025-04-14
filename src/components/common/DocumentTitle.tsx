"use client";

import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useNotificationStore } from "@/stores/notificationStore";

interface DocumentTitleProps {
  title: string;
}

/**
 * Component để quản lý title của trang web
 * @param title Title mặc định của trang web
 */
export default function DocumentTitle({ title }: DocumentTitleProps) {
  // Lấy số lượng tin nhắn chưa đọc từ store
  const unreadCount = useNotificationStore((state) => state.unreadCount);

  // Sử dụng hook để cập nhật title
  useDocumentTitle(title, unreadCount);

  // Component này không render gì cả
  return null;
}
