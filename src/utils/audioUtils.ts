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

/**
 * Play a call ringtone
 * @param volume Volume level (0.0 to 1.0)
 * @returns Audio element that can be stopped later
 */
export function playCallRingtone(volume: number = 0.7): HTMLAudioElement {
  try {
    console.log("Creating new Audio for call ringtone");
    const audio = new Audio("/sounds/call-sound.mp3");

    // Configure audio before playing
    audio.loop = true;
    audio.volume = Math.min(Math.max(volume, 0), 1); // Ensure volume is between 0 and 1
    audio.preload = "auto";

    // Add a small delay before playing to ensure the audio is loaded
    setTimeout(() => {
      console.log("Attempting to play call ringtone");
      const playPromise = audio.play();

      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            console.log("Call ringtone playing successfully");
          })
          .catch((error) => {
            console.error("Error playing call ringtone:", error);

            // Try again with user interaction if autoplay was blocked
            if (error.name === "NotAllowedError") {
              console.log(
                "Autoplay blocked, will try again with user interaction",
              );
            }
          });
      }
    }, 100);

    return audio;
  } catch (error) {
    console.error("Exception creating Audio for call ringtone:", error);
    // Return a dummy audio element that won't cause errors when stopped
    return new Audio();
  }
}

/**
 * Play a dial tone for outgoing calls
 * @param volume Volume level (0.0 to 1.0)
 * @returns Audio element that can be stopped later
 */
export function playCallDialTone(volume: number = 0.5): HTMLAudioElement {
  try {
    console.log("Creating new Audio for dial tone");
    const audio = new Audio("/sounds/waiting-call.mp3");

    // Configure audio before playing
    audio.loop = true;
    audio.volume = Math.min(Math.max(volume, 0), 1); // Ensure volume is between 0 and 1
    audio.preload = "auto";

    // Add a small delay before playing to ensure the audio is loaded
    setTimeout(() => {
      console.log("Attempting to play dial tone");
      const playPromise = audio.play();

      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            console.log("Dial tone playing successfully");
          })
          .catch((error) => {
            console.error("Error playing dial tone:", error);

            // Try again with user interaction if autoplay was blocked
            if (error.name === "NotAllowedError") {
              console.log(
                "Autoplay blocked, will try again with user interaction",
              );
            }
          });
      }
    }, 100);

    return audio;
  } catch (error) {
    console.error("Exception creating Audio for dial tone:", error);
    // Return a dummy audio element that won't cause errors when stopped
    return new Audio();
  }
}

/**
 * Stop playing an audio element
 * @param audio Audio element to stop
 */
export function stopAudio(audio: HTMLAudioElement): void {
  try {
    if (audio) {
      console.log("Stopping audio playback");

      // Check if the audio is actually playing before pausing
      if (!audio.paused) {
        audio.pause();
      }

      // Reset the current time
      audio.currentTime = 0;

      // Remove any event listeners to prevent memory leaks
      audio.onplay = null;
      audio.onpause = null;
      audio.onerror = null;

      console.log("Audio stopped successfully");
    }
  } catch (error) {
    console.error("Error stopping audio:", error);
  }
}
