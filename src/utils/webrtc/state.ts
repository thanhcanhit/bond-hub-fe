import { WebRTCState, createInitialState } from "./types";

// Initialize WebRTC state
export const state: WebRTCState = createInitialState();

// Keep track of the current room ID for recovery purposes
let currentRoomId: string | null = null;

/**
 * Get the local media stream
 * @returns The local media stream or null if not available
 */
export function getLocalStream(): MediaStream | null {
  return state.localStream;
}

/**
 * Get the current room ID
 * @returns Current room ID or null if not in a room
 */
export function getCurrentRoomId(): string | null {
  // First try to get from memory
  if (currentRoomId) {
    return currentRoomId;
  }

  // Then try to get from session storage
  try {
    const storedRoomId = sessionStorage.getItem("callRoomId");
    if (storedRoomId) {
      currentRoomId = storedRoomId;
      return storedRoomId;
    }
  } catch (error) {
    console.error("[WEBRTC] Error accessing sessionStorage for roomId:", error);
  }

  return null;
}

/**
 * Set the current room ID
 * @param roomId Room ID to set
 */
export function setCurrentRoomId(roomId: string | null): void {
  currentRoomId = roomId;

  // Also store in sessionStorage for cross-tab/window recovery
  if (roomId) {
    try {
      sessionStorage.setItem("callRoomId", roomId);
      console.log(
        `[WEBRTC] Stored callRoomId=${roomId} in sessionStorage for recovery`,
      );
    } catch (storageError) {
      console.error(
        "[WEBRTC] Error storing roomId in sessionStorage:",
        storageError,
      );
    }
  } else {
    try {
      sessionStorage.removeItem("callRoomId");
    } catch (error) {
      console.error(
        "[WEBRTC] Error removing roomId from sessionStorage:",
        error,
      );
    }
  }
}
