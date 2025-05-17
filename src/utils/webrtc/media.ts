import { state } from "./state";

/**
 * Get user media (camera and microphone)
 */
export async function getUserMedia(withVideo: boolean): Promise<void> {
  // First check if we already have a stream and clean it up
  if (state.localStream) {
    try {
      console.log(
        "[WEBRTC] Cleaning up existing local stream before getting new one",
      );
      state.localStream.getTracks().forEach((track) => {
        track.stop();
      });
      state.localStream = null;
    } catch (cleanupError) {
      console.error(
        "[WEBRTC] Error cleaning up existing local stream:",
        cleanupError,
      );
      // Continue anyway
    }
  }

  // Try to get media with requested settings
  try {
    // For audio-only calls, explicitly set video to false
    const videoConstraint = withVideo ? { video: true } : { video: false };

    console.log(
      `[WEBRTC] Requesting user media with video=${withVideo}, using constraint:`,
      videoConstraint,
    );

    // Request media with appropriate constraints
    state.localStream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      ...videoConstraint,
    });

    console.log("[WEBRTC] Successfully obtained user media");

    // Safely verify we have the expected tracks
    try {
      if (
        state.localStream.getAudioTracks &&
        typeof state.localStream.getAudioTracks === "function"
      ) {
        const audioTracks = state.localStream.getAudioTracks();
        console.log(
          `[WEBRTC] Stream contains ${audioTracks.length} audio tracks`,
        );

        if (audioTracks.length === 0) {
          console.warn(
            "[WEBRTC] No audio tracks obtained despite requesting audio",
          );
        }
      }

      if (
        state.localStream.getVideoTracks &&
        typeof state.localStream.getVideoTracks === "function"
      ) {
        const videoTracks = state.localStream.getVideoTracks();
        console.log(
          `[WEBRTC] Stream contains ${videoTracks.length} video tracks`,
        );

        // If we requested video but didn't get any video tracks, log a warning
        if (withVideo && videoTracks.length === 0) {
          console.warn(
            "[WEBRTC] Requested video but no video tracks were obtained",
          );
        }
      }
    } catch (trackError) {
      console.error("[WEBRTC] Error checking media tracks:", trackError);
    }
  } catch (error) {
    console.error("[WEBRTC] Error getting user media:", error);

    // Try audio only if video fails
    if (withVideo) {
      try {
        console.log("[WEBRTC] Falling back to audio-only media");
        state.localStream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: false,
        });
        console.log("[WEBRTC] Successfully obtained audio-only media");
      } catch (audioError) {
        console.error("[WEBRTC] Error getting audio-only media:", audioError);

        // Create an empty stream as a last resort to avoid null reference errors
        try {
          console.log("[WEBRTC] Creating empty MediaStream as fallback");
          state.localStream = new MediaStream();
          console.log("[WEBRTC] Empty MediaStream created successfully");
        } catch (streamError) {
          console.error(
            "[WEBRTC] Failed to create empty MediaStream:",
            streamError,
          );
          console.warn(
            "[WEBRTC] Could not create empty MediaStream, but continuing anyway",
          );
          // Continue anyway instead of throwing an error
        }
      }
    } else {
      // Create an empty stream as a last resort to avoid null reference errors
      try {
        console.log(
          "[WEBRTC] Creating empty MediaStream as fallback after audio failure",
        );
        state.localStream = new MediaStream();
        console.log("[WEBRTC] Empty MediaStream created successfully");
      } catch (streamError) {
        console.error(
          "[WEBRTC] Failed to create empty MediaStream:",
          streamError,
        );
        console.warn(
          "[WEBRTC] Could not create empty MediaStream after audio failure, but continuing anyway",
        );
        // Continue anyway instead of throwing an error
      }
    }
  }

  // Final verification to ensure we have a stream
  if (!state.localStream) {
    console.error("[WEBRTC] Failed to initialize local stream");

    // Create an empty stream as a last resort instead of throwing an error
    try {
      console.log("[WEBRTC] Creating empty MediaStream as final fallback");
      state.localStream = new MediaStream();
      console.log(
        "[WEBRTC] Empty MediaStream created successfully as final fallback",
      );
    } catch (streamError) {
      console.error(
        "[WEBRTC] Failed to create empty MediaStream as final fallback:",
        streamError,
      );
      // Even in this case, we'll continue without throwing an error
      // Create a dummy stream object to prevent null reference errors
      state.localStream = new MediaStream();
    }
  }
}

/**
 * Toggle microphone mute state
 * @returns New mute state (true = muted, false = unmuted)
 */
export async function toggleMute(): Promise<boolean> {
  // Check if we have a local stream
  if (!state.localStream) {
    console.warn("[WEBRTC] Cannot toggle mute: No local stream available");
    return false;
  }

  try {
    // Safely check if getAudioTracks exists
    if (
      !state.localStream.getAudioTracks ||
      typeof state.localStream.getAudioTracks !== "function"
    ) {
      console.warn(
        "[WEBRTC] Cannot toggle mute: getAudioTracks method not available",
      );
      return false;
    }

    // Get audio tracks safely
    const audioTracks = state.localStream.getAudioTracks();
    if (!audioTracks || audioTracks.length === 0) {
      console.warn(
        "[WEBRTC] Cannot toggle mute: No audio tracks in local stream",
      );
      return false;
    }

    const audioTrack = audioTracks[0];
    const isMuted = !audioTrack.enabled;
    audioTrack.enabled = isMuted;

    console.log(`[WEBRTC] Microphone ${isMuted ? "muted" : "unmuted"}`);

    // Also mute/unmute the producer if it exists
    try {
      const audioProducer = state.producers.get("audio");
      if (audioProducer) {
        if (isMuted) {
          await audioProducer.pause();
          console.log("[WEBRTC] Audio producer paused");
        } else {
          await audioProducer.resume();
          console.log("[WEBRTC] Audio producer resumed");
        }
      }
    } catch (producerError) {
      console.error(
        "[WEBRTC] Error updating audio producer state:",
        producerError,
      );
      // Continue anyway, the local track is already updated
    }

    return isMuted;
  } catch (error) {
    console.error("[WEBRTC] Error toggling mute state:", error);
    return false;
  }
}

/**
 * Toggle camera on/off
 * @returns New camera state (true = off, false = on)
 */
export async function toggleCamera(): Promise<boolean> {
  // Check if we have a local stream
  if (!state.localStream) {
    console.warn("[WEBRTC] Cannot toggle camera: No local stream available");
    return false;
  }

  try {
    // Safely check if getVideoTracks exists
    if (
      !state.localStream.getVideoTracks ||
      typeof state.localStream.getVideoTracks !== "function"
    ) {
      console.warn(
        "[WEBRTC] Cannot toggle camera: getVideoTracks method not available",
      );
      return false;
    }

    // Get video tracks safely
    const videoTracks = state.localStream.getVideoTracks();
    if (!videoTracks || videoTracks.length === 0) {
      console.warn(
        "[WEBRTC] Cannot toggle camera: No video tracks in local stream",
      );

      // For audio-only calls, we should inform the user that camera is not available
      console.log(
        "[WEBRTC] This appears to be an audio-only call without video capability",
      );

      // We could show a toast notification to the user
      try {
        // Try to dispatch an event that UI can listen for
        window.dispatchEvent(
          new CustomEvent("call:noVideoAvailable", {
            detail: {
              message: "Cuộc gọi này không hỗ trợ video",
              timestamp: new Date().toISOString(),
            },
          }),
        );
      } catch (eventError) {
        console.error("[WEBRTC] Error dispatching no-video event:", eventError);
      }

      return false;
    }

    const videoTrack = videoTracks[0];
    const isOff = !videoTrack.enabled;
    videoTrack.enabled = isOff;

    console.log(`[WEBRTC] Camera ${isOff ? "turned off" : "turned on"}`);

    // Also pause/resume the producer if it exists
    try {
      const videoProducer = state.producers.get("video");
      if (videoProducer) {
        if (isOff) {
          await videoProducer.pause();
          console.log("[WEBRTC] Video producer paused");
        } else {
          await videoProducer.resume();
          console.log("[WEBRTC] Video producer resumed");
        }
      }
    } catch (producerError) {
      console.error(
        "[WEBRTC] Error updating video producer state:",
        producerError,
      );
      // Continue anyway, the local track is already updated
    }

    return isOff;
  } catch (error) {
    console.error("[WEBRTC] Error toggling camera state:", error);
    return false;
  }
}

/**
 * Get all remote streams
 * @returns Map of remote streams
 */
export function getRemoteStreams(): Map<string, MediaStream> {
  return state.remoteStreams;
}
