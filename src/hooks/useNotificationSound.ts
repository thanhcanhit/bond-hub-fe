"use client";

import { useRef, useCallback } from "react";

/**
 * Hook để phát âm thanh thông báo
 * @returns Hàm để phát âm thanh thông báo
 */
export const useNotificationSound = () => {
  // Sử dụng useRef để lưu trữ đối tượng Audio
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Hàm để phát âm thanh thông báo
  const playNotificationSound = useCallback(() => {
    try {
      // Nếu đối tượng Audio chưa được tạo, tạo mới
      if (!audioRef.current) {
        audioRef.current = new Audio("/sounds/discord-notification.mp3");
      }

      // Đặt lại thời gian phát về đầu
      if (audioRef.current.currentTime > 0) {
        audioRef.current.currentTime = 0;
      }

      // Phát âm thanh
      audioRef.current.play().catch((error) => {
        console.error(
          "[useNotificationSound] Error playing notification sound:",
          error,
        );
      });
    } catch (error) {
      console.error(
        "[useNotificationSound] Error setting up notification sound:",
        error,
      );
    }
  }, []);

  return playNotificationSound;
};
