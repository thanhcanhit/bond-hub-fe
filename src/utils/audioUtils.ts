// Utility functions for audio handling

/**
 * Play notification sound
 * @param volume Volume level (0.0 to 1.0)
 */
export const playNotificationSound = (volume: number = 0.5) => {
  try {
    const audio = new Audio("/sounds/notification.mp3");
    audio.volume = Math.min(Math.max(volume, 0), 1); // Ensure volume is between 0 and 1
    audio.play().catch((error) => {
      console.error("Error playing notification sound:", error);
    });
  } catch (error) {
    console.error("Error creating Audio object:", error);
  }
};
