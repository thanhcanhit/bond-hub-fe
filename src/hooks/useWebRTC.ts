import { useState, useEffect } from "react";
import { toast } from "sonner";

interface WebRTCState {
  initialized: boolean;
  initAttempts: number;
  lastInitAttempt: number;
}

interface UseWebRTCProps {
  roomId: string;
  callId?: string | null;
  targetId?: string | null;
  isOutgoing?: boolean;
  isIncoming?: boolean;
}

interface UseWebRTCReturn {
  webrtcState: WebRTCState;
  initWebRTC: (forceConnect?: boolean) => Promise<void>;
  endWebRTC: () => Promise<void>;
  toggleMute: () => Promise<boolean>;
}

/**
 * Custom hook for managing WebRTC connections
 */
export function useWebRTC({
  roomId,
  callId,
  targetId,
  isOutgoing = false,
  isIncoming = false,
}: UseWebRTCProps): UseWebRTCReturn {
  const [webrtcState, setWebrtcState] = useState<WebRTCState>({
    initialized: false,
    initAttempts: 0,
    lastInitAttempt: 0,
  });

  // Initialize WebRTC connection
  const initWebRTC = async (forceConnect = false): Promise<void> => {
    try {
      // Import dynamically to avoid SSR issues
      const webrtcUtils = await import("@/utils/webrtcUtils");
      const { initializeWebRTC } = webrtcUtils;

      // Initialize WebRTC with audio only
      console.log(
        `[useWebRTC] Initializing WebRTC for room ${roomId} with audio only`,
      );

      // First, ensure any existing WebRTC connections are properly cleaned up
      try {
        console.log(
          "[useWebRTC] Cleaning up any existing WebRTC connections before initialization",
        );
        if (typeof webrtcUtils.endCall === "function") {
          await webrtcUtils.endCall();
          console.log("[useWebRTC] Cleanup completed successfully");
        }
      } catch (cleanupError) {
        console.error(
          "[useWebRTC] Error during cleanup before initialization:",
          cleanupError,
        );
      }

      // Add enhanced retry logic for WebRTC initialization
      let retryCount = 0;
      const maxRetries = 7;
      let success = false;

      // Check URL parameters for timestamp
      const urlParams = new URLSearchParams(window.location.search);
      const timestamp = urlParams.get("t");
      const isRecentNavigation =
        timestamp && Date.now() - Number(timestamp) < 10000;
      const direction = urlParams.get("direction");
      const urlIsIncoming = direction === "incoming";

      // Store important call information in sessionStorage for recovery purposes
      if (callId) {
        console.log(`[useWebRTC] Storing callId in sessionStorage: ${callId}`);
        sessionStorage.setItem("currentCallId", callId);
      }

      console.log(`[useWebRTC] Storing roomId in sessionStorage: ${roomId}`);
      sessionStorage.setItem("callRoomId", roomId);

      if (targetId) {
        console.log(
          `[useWebRTC] Storing targetId in sessionStorage: ${targetId}`,
        );
        sessionStorage.setItem("callTargetId", targetId);
      }

      // Check network connection
      const checkNetworkConnection = () => navigator.onLine;

      // Wait for network connection
      const waitForNetworkConnection = async (timeoutMs = 5000) => {
        if (checkNetworkConnection()) return true;

        console.log("[useWebRTC] Waiting for network connection...");
        return new Promise<boolean>((resolve) => {
          const timeout = setTimeout(() => {
            window.removeEventListener("online", onOnline);
            resolve(false);
          }, timeoutMs);

          const onOnline = () => {
            clearTimeout(timeout);
            window.removeEventListener("online", onOnline);
            resolve(true);
          };

          window.addEventListener("online", onOnline);
        });
      };

      // For incoming calls, dispatch events to notify that we've accepted the call
      if (isIncoming && !webrtcState.initialized) {
        try {
          // Dispatch a call:accepted event
          window.dispatchEvent(
            new CustomEvent("call:accepted", {
              detail: {
                callId: callId,
                roomId: roomId,
                timestamp: new Date().toISOString(),
                isIncoming: true,
              },
            }),
          );
          console.log("[useWebRTC] Dispatched call:accepted event");

          // Dispatch a participant joined event
          window.dispatchEvent(
            new CustomEvent("call:participant:joined", {
              detail: {
                roomId: roomId,
                userId: targetId,
                timestamp: new Date().toISOString(),
                isIncoming: true,
              },
            }),
          );
          console.log("[useWebRTC] Dispatched call:participant:joined event");
        } catch (eventError) {
          console.error("[useWebRTC] Error dispatching events:", eventError);
        }
      }

      while (!success && retryCount < maxRetries) {
        try {
          console.log(
            `[useWebRTC] WebRTC initialization attempt ${retryCount + 1}/${maxRetries}`,
          );

          // Check network connection before trying
          if (!checkNetworkConnection()) {
            console.log(
              "[useWebRTC] Network connection is offline, waiting for connection",
            );
            const networkConnected = await waitForNetworkConnection(10000);
            if (!networkConnected) {
              console.error(
                "[useWebRTC] Failed to establish network connection",
              );
              throw new Error("Không có kết nối mạng");
            }
            console.log("[useWebRTC] Network connection restored");
          }

          // Use increasing backoff for retries
          if (retryCount > 0) {
            const backoffTime = Math.min(
              1000 * Math.pow(1.5, retryCount - 1),
              8000,
            );
            console.log(
              `[useWebRTC] Waiting ${backoffTime}ms before retry ${retryCount + 1}`,
            );
            await new Promise((resolve) => setTimeout(resolve, backoffTime));
          }

          // Check URL parameters for forceConnect flag
          const urlForceConnect = urlParams.get("forceConnect") === "true";

          // Check if forceConnect is set in sessionStorage
          const sessionForceConnect =
            sessionStorage.getItem("forceConnect") === "true";

          // Combine all forceConnect flags
          const shouldForceConnect =
            forceConnect ||
            urlForceConnect ||
            sessionForceConnect ||
            isIncoming;

          if (shouldForceConnect) {
            console.log(
              "[useWebRTC] Using forceConnect=true for WebRTC initialization",
            );

            // Clear the forceConnect flag from sessionStorage after using it
            if (sessionForceConnect) {
              try {
                sessionStorage.removeItem("forceConnect");
                console.log(
                  "[useWebRTC] Cleared forceConnect flag from sessionStorage",
                );
              } catch (e) {
                console.error(
                  "[useWebRTC] Error clearing forceConnect from sessionStorage:",
                  e,
                );
              }
            }
          }

          // Initialize WebRTC with timeout
          const initPromise = initializeWebRTC(
            roomId,
            false,
            shouldForceConnect,
          );
          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(
              () => reject(new Error("WebRTC initialization timeout")),
              15000,
            );
          });

          await Promise.race([initPromise, timeoutPromise]);

          success = true;
          console.log("[useWebRTC] WebRTC connection established successfully");

          // Update WebRTC state
          setWebrtcState((prev) => ({
            ...prev,
            initialized: true,
            initAttempts: retryCount + 1,
            lastInitAttempt: Date.now(),
          }));

          // Dispatch an event to notify that WebRTC initialization succeeded
          try {
            window.dispatchEvent(
              new CustomEvent("call:webrtc:connected", {
                detail: {
                  roomId: roomId,
                  timestamp: new Date().toISOString(),
                  isIncoming: isIncoming,
                },
              }),
            );
            console.log("[useWebRTC] Dispatched call:webrtc:connected event");

            // For incoming calls, also dispatch a participant joined event again
            if (isIncoming) {
              window.dispatchEvent(
                new CustomEvent("call:participant:joined", {
                  detail: {
                    roomId: roomId,
                    userId: targetId,
                    timestamp: new Date().toISOString(),
                    isIncoming: true,
                    webrtcInitialized: true,
                  },
                }),
              );
              console.log(
                "[useWebRTC] Dispatched call:participant:joined event after WebRTC initialization",
              );
            }
          } catch (e) {
            console.error(
              "[useWebRTC] Error dispatching events after WebRTC initialization:",
              e,
            );
          }

          return;
        } catch (initError) {
          retryCount++;
          console.error(
            `[useWebRTC] WebRTC initialization attempt ${retryCount} failed:`,
            initError,
          );

          if (retryCount < maxRetries) {
            console.log(
              `[useWebRTC] Will retry WebRTC initialization (${retryCount}/${maxRetries})`,
            );

            // If error is transport-related, wait longer
            if (
              initError instanceof Error &&
              (initError.message.includes("transport") ||
                initError.message.includes("connection") ||
                initError.message.includes("queue"))
            ) {
              console.log(
                "[useWebRTC] Transport-related error detected, waiting longer before retry",
              );

              // Clean up before retrying
              try {
                console.log(
                  "[useWebRTC] Cleaning up WebRTC resources before retry",
                );
                await webrtcUtils.endCall();
                console.log("[useWebRTC] Cleanup completed successfully");
              } catch (cleanupError) {
                console.error(
                  "[useWebRTC] Error during cleanup before retry:",
                  cleanupError,
                );
              }

              await new Promise((resolve) => setTimeout(resolve, 3000));
            }
          } else {
            console.error(
              `[useWebRTC] All ${maxRetries} WebRTC initialization attempts failed`,
            );
            throw initError;
          }
        }
      }
    } catch (error) {
      console.error(
        "[useWebRTC] Error initializing WebRTC after all retries:",
        error,
      );

      // Update WebRTC state
      setWebrtcState((prev) => ({
        ...prev,
        initialized: false,
        initAttempts: prev.initAttempts + 1,
        lastInitAttempt: Date.now(),
      }));

      // Show error toast
      toast.error(
        "Không thể kết nối cuộc gọi. Vui lòng kiểm tra kết nối mạng của bạn.",
      );

      // Dispatch an event to notify that WebRTC initialization failed
      try {
        window.dispatchEvent(
          new CustomEvent("call:webrtc:failed", {
            detail: {
              roomId: roomId,
              timestamp: new Date().toISOString(),
              error: error instanceof Error ? error.message : "Unknown error",
              isIncoming: isIncoming,
            },
          }),
        );
        console.log("[useWebRTC] Dispatched call:webrtc:failed event");
      } catch (e) {
        console.error(
          "[useWebRTC] Error dispatching call:webrtc:failed event:",
          e,
        );
      }

      throw error;
    }
  };

  // End WebRTC connection
  const endWebRTC = async (): Promise<void> => {
    try {
      const { endCall } = await import("@/utils/webrtcUtils");
      console.log("[useWebRTC] Ending WebRTC call");
      await endCall();

      // Update state
      setWebrtcState((prev) => ({
        ...prev,
        initialized: false,
      }));
    } catch (error) {
      console.error("[useWebRTC] Error ending WebRTC call:", error);
      throw error;
    }
  };

  // Toggle mute state
  const toggleMute = async (): Promise<boolean> => {
    try {
      const { toggleMute: toggleMuteUtil } = await import(
        "@/utils/webrtcUtils"
      );
      const newMuteState = await toggleMuteUtil();
      return newMuteState;
    } catch (error) {
      console.error("[useWebRTC] Error toggling mute:", error);
      throw error;
    }
  };

  return {
    webrtcState,
    initWebRTC,
    endWebRTC,
    toggleMute,
  };
}
