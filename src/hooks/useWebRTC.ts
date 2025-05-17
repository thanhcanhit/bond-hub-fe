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

      // Add enhanced retry logic for WebRTC initialization with fewer retries
      let retryCount = 0;
      const maxRetries = 2; // Reduced from 7 to 2 to avoid excessive retries
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

          // Ensure call socket is connected first with improved error handling
          try {
            console.log(
              "[useWebRTC] Ensuring call socket is connected before WebRTC initialization",
            );
            const callSocketModule = await import("@/lib/callSocket");
            const socketModule = await import("@/lib/socket");
            const authStore = await import("@/stores/authStore");

            // Get token from multiple sources
            let token = authStore.useAuthStore.getState().accessToken;

            // If no token in auth store, try to get from session storage
            if (!token) {
              try {
                const storedToken = sessionStorage.getItem("callAccessToken");
                if (storedToken) {
                  console.log(
                    "[useWebRTC] Using token from sessionStorage for socket initialization",
                  );
                  token = storedToken;
                }
              } catch (storageError) {
                console.warn(
                  "[useWebRTC] Error accessing sessionStorage:",
                  storageError,
                );
              }
            }

            if (!token) {
              throw new Error("No authentication token available");
            }

            console.log("[useWebRTC] Initializing sockets with token");

            // First set up the main socket
            socketModule.setupSocket(token);

            // Then set up the call socket with a longer timeout
            const callSocket = await callSocketModule.ensureCallSocket(true);

            if (!callSocket) {
              console.warn(
                "[useWebRTC] Failed to initialize call socket, will retry",
              );

              // Wait a moment before retrying
              await new Promise((resolve) => setTimeout(resolve, 2000));

              // Try one more time with a direct initialization
              console.log(
                "[useWebRTC] Retrying call socket initialization directly",
              );
              const newCallSocket = callSocketModule.initCallSocket(
                token,
                true,
              );

              if (!newCallSocket) {
                console.error(
                  "[useWebRTC] Failed to initialize call socket on retry",
                );
                // Continue anyway - we'll try to establish WebRTC without the socket
                // This is better than failing completely
              } else {
                console.log(
                  "[useWebRTC] Successfully initialized call socket on retry",
                );

                // Wait for the socket to connect if needed
                if (!newCallSocket.connected) {
                  console.log(
                    "[useWebRTC] Waiting for new call socket to connect",
                  );

                  // Connect the socket explicitly
                  newCallSocket.connect();

                  // Wait with a longer timeout
                  const startTime = Date.now();
                  const timeout = 15000; // 15 seconds timeout

                  while (
                    !newCallSocket.connected &&
                    Date.now() - startTime < timeout
                  ) {
                    await new Promise((resolve) => setTimeout(resolve, 500));
                    console.log(
                      "[useWebRTC] Still waiting for call socket to connect...",
                    );
                  }

                  if (newCallSocket.connected) {
                    console.log(
                      "[useWebRTC] Call socket connected successfully on retry",
                    );
                  } else {
                    console.warn(
                      "[useWebRTC] Call socket failed to connect on retry, but continuing anyway",
                    );
                    // Continue anyway - we'll try to establish WebRTC without the socket
                  }
                }
              }
            } else if (!callSocket.connected) {
              console.log(
                "[useWebRTC] Call socket exists but not connected, waiting for connection",
              );

              // Connect the socket explicitly
              callSocket.connect();

              // Wait for the socket to connect with a longer timeout
              const startTime = Date.now();
              const timeout = 15000; // Increased to 15 seconds

              while (
                !callSocket.connected &&
                Date.now() - startTime < timeout
              ) {
                console.log(
                  "[useWebRTC] Waiting for call socket to connect...",
                );
                await new Promise((resolve) => setTimeout(resolve, 500));
              }

              if (callSocket.connected) {
                console.log("[useWebRTC] Call socket connected successfully");
              } else {
                console.warn(
                  "[useWebRTC] Call socket failed to connect within timeout, but continuing anyway",
                );
                // Continue anyway - we'll try to establish WebRTC without the socket
              }
            } else {
              console.log("[useWebRTC] Call socket is connected and ready");
            }

            // Add a small delay after socket connection to ensure stability
            await new Promise((resolve) => setTimeout(resolve, 1000));
            console.log("[useWebRTC] Proceeding with WebRTC initialization");
          } catch (socketError) {
            console.error(
              "[useWebRTC] Error ensuring call socket:",
              socketError,
            );

            // Always continue with WebRTC initialization despite socket errors
            console.log(
              "[useWebRTC] Continuing with WebRTC initialization despite socket error",
            );

            // Dispatch an event to notify that we need a socket
            try {
              window.dispatchEvent(
                new CustomEvent("webrtc:socket:needed", {
                  detail: {
                    timestamp: new Date().toISOString(),
                    error:
                      socketError instanceof Error
                        ? socketError.message
                        : "Unknown error",
                  },
                }),
              );
              console.log("[useWebRTC] Dispatched webrtc:socket:needed event");
            } catch (eventError) {
              console.error(
                "[useWebRTC] Error dispatching socket needed event:",
                eventError,
              );
            }
          }

          // Initialize WebRTC with improved error handling
          try {
            // Use a single promise with the WebRTC initialization
            // This avoids race conditions between the timeout and the actual initialization
            await initializeWebRTC(roomId, false, shouldForceConnect);

            console.log(
              "[useWebRTC] WebRTC initialization completed successfully",
            );
          } catch (error) {
            console.error(
              "[useWebRTC] Error during WebRTC initialization:",
              error,
            );

            // Provide more specific error messages based on the error type
            if (error instanceof Error) {
              if (
                error.message.includes("timeout") ||
                error.message.includes("thời gian")
              ) {
                throw new Error(
                  "Không thể kết nối WebRTC trong thời gian cho phép. Vui lòng kiểm tra kết nối mạng và thử lại.",
                );
              } else if (
                error.message.includes("socket") ||
                error.message.includes("connection")
              ) {
                throw new Error(
                  "Không thể kết nối đến máy chủ cuộc gọi. Vui lòng kiểm tra kết nối mạng và thử lại sau.",
                );
              } else if (
                error.message.includes("getUserMedia") ||
                error.message.includes("permission")
              ) {
                throw new Error(
                  "Không thể truy cập micrô. Vui lòng kiểm tra quyền truy cập thiết bị của trình duyệt.",
                );
              }
            }

            // If we can't determine a specific error, throw a generic one
            throw new Error(
              "Không thể khởi tạo cuộc gọi. Vui lòng thử lại sau.",
            );
          }

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

            // Perform thorough cleanup before retrying
            try {
              console.log(
                "[useWebRTC] Performing thorough cleanup before retry",
              );

              // End any existing call
              await webrtcUtils.endCall();

              // Wait for cleanup to complete
              await new Promise((resolve) => setTimeout(resolve, 2000));

              console.log("[useWebRTC] Cleanup completed successfully");
            } catch (cleanupError) {
              console.error(
                "[useWebRTC] Error during cleanup before retry:",
                cleanupError,
              );
            }

            // Determine wait time based on error type
            let waitTime = 3000; // Default wait time

            if (
              initError instanceof Error &&
              (initError.message.includes("transport") ||
                initError.message.includes("connection") ||
                initError.message.includes("queue"))
            ) {
              console.log(
                "[useWebRTC] Transport-related error detected, waiting longer before retry",
              );
              waitTime = 5000; // Longer wait for transport issues
            } else if (
              initError instanceof Error &&
              initError.message.includes("timeout")
            ) {
              console.log(
                "[useWebRTC] Timeout error detected, waiting longer before retry",
              );
              waitTime = 7000; // Even longer wait for timeout issues
            }

            console.log(
              `[useWebRTC] Waiting ${waitTime}ms before retry attempt ${retryCount + 1}`,
            );
            await new Promise((resolve) => setTimeout(resolve, waitTime));

            // Dispatch event to notify about retry
            try {
              window.dispatchEvent(
                new CustomEvent("call:webrtc:retry", {
                  detail: {
                    roomId: roomId,
                    attempt: retryCount,
                    maxAttempts: maxRetries,
                    error:
                      initError instanceof Error
                        ? initError.message
                        : "Unknown error",
                  },
                }),
              );
            } catch (e) {
              console.error("[useWebRTC] Error dispatching retry event:", e);
            }
          } else {
            console.error(
              `[useWebRTC] All ${maxRetries} WebRTC initialization attempts failed`,
            );

            // Dispatch final failure event
            try {
              window.dispatchEvent(
                new CustomEvent("call:webrtc:all_attempts_failed", {
                  detail: {
                    roomId: roomId,
                    attempts: retryCount,
                    error:
                      initError instanceof Error
                        ? initError.message
                        : "Unknown error",
                  },
                }),
              );
            } catch (e) {
              console.error(
                "[useWebRTC] Error dispatching final failure event:",
                e,
              );
            }

            throw new Error(
              `Không thể kết nối cuộc gọi sau ${maxRetries} lần thử. Lỗi: ${initError instanceof Error ? initError.message : "Lỗi không xác định"}`,
            );
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

      // Show more specific error toast based on the error type
      let errorMessage =
        "Không thể kết nối cuộc gọi. Vui lòng kiểm tra kết nối mạng của bạn.";

      if (error instanceof Error) {
        if (
          error.message.includes("timeout") ||
          error.message.includes("thời gian")
        ) {
          errorMessage =
            "Kết nối cuộc gọi quá chậm. Vui lòng kiểm tra kết nối mạng và thử lại sau.";
        } else if (
          error.message.includes("socket") ||
          error.message.includes("connection")
        ) {
          errorMessage =
            "Không thể kết nối đến máy chủ cuộc gọi. Vui lòng thử lại sau.";
        } else if (
          error.message.includes("permission") ||
          error.message.includes("getUserMedia")
        ) {
          errorMessage =
            "Không thể truy cập micrô hoặc camera. Vui lòng kiểm tra quyền truy cập thiết bị.";
        }
      }

      toast.error(errorMessage);

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
