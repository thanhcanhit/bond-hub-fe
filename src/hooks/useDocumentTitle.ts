"use client";

import { useEffect } from "react";

/**
 * Hook để quản lý title của trang web
 * @param title Title mặc định của trang web
 * @param unreadCount Số lượng tin nhắn chưa đọc
 */
export const useDocumentTitle = (title: string, unreadCount: number = 0) => {
  useEffect(() => {
    // Nếu có tin nhắn chưa đọc, hiển thị số lượng tin nhắn trong title
    if (unreadCount > 0) {
      document.title = `(${unreadCount}) • ${title}`;
    } else {
      document.title = title;
    }

    // Khôi phục title khi component unmount
    return () => {
      document.title = title;
    };
  }, [title, unreadCount]);
};
