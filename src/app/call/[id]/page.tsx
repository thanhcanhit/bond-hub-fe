"use client";

import { useState, useEffect, use } from "react";
import { toast } from "sonner";
import { useSearchParams } from "next/navigation";
import { playCallDialTone, stopAudio } from "@/utils/audioUtils";

// Import custom hooks
import { useWebRTC } from "@/hooks/useWebRTC";
import { useCallUser } from "@/hooks/useCallUser";

// Import components
import CallHeader from "@/components/call/CallHeader";
import CallContent from "@/components/call/CallContent";
import AudioCallControls from "@/components/call/AudioCallControls";

// Import utilities
import { setupCallEventHandlers } from "@/utils/callEventHandlers";
import { setupRemoteStreamHandlers } from "@/utils/remoteStreamHandlers";
import { endCall as endCallAction } from "@/actions/call.action";

// Create a wrapper component to handle the params
function CallPageContent({ userId }: { userId: string }) {
  // Get URL parameters
  const searchParams = useSearchParams();
  const callId = searchParams.get("callId");
  const isOutgoing = searchParams.get("direction") === "outgoing";
  const isIncoming = searchParams.get("direction") === "incoming";
  const targetId = searchParams.get("targetId") || searchParams.get("groupId");
  // Target type can be used for different UI or logic based on whether it's a user or group call
  const callType = searchParams.get("type") as "AUDIO" | "VIDEO";

  // State
  const [isMuted, setIsMuted] = useState(false);
  const [callStatus, setCallStatus] = useState<
    "waiting" | "connecting" | "connected" | "rejected" | "ended"
  >(isOutgoing ? "waiting" : "connecting");
  const [callDuration, setCallDuration] = useState(0);

  // Custom hooks
  const { webrtcState, initWebRTC, endWebRTC, toggleMute } = useWebRTC({
    roomId: userId,
    callId,
    targetId,
    isOutgoing,
    isIncoming,
  });

  const user = useCallUser({
    userId,
    targetId,
    callId,
    isOutgoing,
  });

  // Play dial tone for outgoing calls
  useEffect(() => {
    if (isOutgoing && callStatus === "waiting") {
      console.log("Starting call dial tone for outgoing call");
      let audio: HTMLAudioElement | null = null;
      let timeoutId: NodeJS.Timeout | null = null;

      const setupAudio = () => {
        try {
          audio = playCallDialTone(0.5);
        } catch (error) {
          console.error("Exception when trying to play dial tone:", error);
        }
      };

      // Set up audio with a small delay to ensure component is fully mounted
      timeoutId = setTimeout(() => {
        setupAudio();
      }, 100);

      return () => {
        console.log("Cleaning up call dial tone");

        // Clear the timeout if component unmounts before timeout completes
        if (timeoutId) {
          clearTimeout(timeoutId);
        }

        if (audio) {
          try {
            stopAudio(audio);
          } catch (error) {
            console.error("Error stopping audio:", error);
          }
        }
      };
    }
  }, [isOutgoing, callStatus]);

  // Timer for call duration
  useEffect(() => {
    let timer: NodeJS.Timeout;

    if (callStatus === "connected") {
      timer = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [callStatus]);

  // Helper function to check if the user is allowed to join the call
  const checkUserCanJoinCall = async (): Promise<boolean> => {
    try {
      if (!callId) {
        console.log(
          "[CALL_PAGE] No callId provided, skipping permission check",
        );
        return true;
      }

      // Kiểm tra xem cuộc gọi đã được chấp nhận trước đó chưa
      const callAcceptedAt = sessionStorage.getItem("callAcceptedAt");
      const currentCallId = sessionStorage.getItem("currentCallId");
      let alreadyAccepted = false;

      // Nếu cuộc gọi đã được chấp nhận và callId khớp, bỏ qua việc kiểm tra lại
      if (callAcceptedAt && currentCallId === callId) {
        const acceptedTime = new Date(callAcceptedAt).getTime();
        const currentTime = new Date().getTime();
        const timeDiff = currentTime - acceptedTime;

        // Nếu cuộc gọi được chấp nhận trong vòng 30 giây gần đây, bỏ qua kiểm tra
        if (timeDiff < 30000) {
          // 30 seconds
          console.log(
            "[CALL_PAGE] Call was recently accepted, skipping permission check",
          );
          alreadyAccepted = true;
          return true;
        }
      }

      const { useAuthStore } = await import("@/stores/authStore");
      const token = useAuthStore.getState().accessToken;

      if (!token) {
        console.warn(
          "[CALL_PAGE] No token available to check call permissions",
        );
        toast.error("Không thể tham gia cuộc gọi: Bạn cần đăng nhập lại");
        return false;
      }

      // Kiểm tra xem URL có chứa tham số forceConnect không
      const searchParams = new URLSearchParams(window.location.search);
      const hasForceConnect = searchParams.get("forceConnect") === "true";

      if (hasForceConnect) {
        console.log(
          "[CALL_PAGE] forceConnect parameter detected, skipping permission check",
        );
        alreadyAccepted = true;
        return true;
      }

      // Import the joinCall function
      const { joinCall } = await import("@/actions/call.action");

      // Đã kiểm tra forceConnect ở trên, không cần kiểm tra lại

      // Try to join the call to check permissions
      console.log(
        `[CALL_PAGE] Checking if user is allowed to join call ${callId}, alreadyAccepted: ${alreadyAccepted}`,
      );

      // Log additional information about the current user and call
      console.log(
        `[CALL_PAGE] Current user ID: ${useAuthStore.getState().user?.id || "unknown"}`,
      );
      console.log(`[CALL_PAGE] Call parameters:`, {
        callId,
        roomId: userId, // This is the roomId in this context
        tokenAvailable: !!token,
        tokenFirstChars: token ? token.substring(0, 10) + "..." : "no token",
        searchParams: Object.fromEntries(searchParams.entries()),
      });

      // Get current user ID from authStore
      const currentUserId = useAuthStore.getState().user?.id;

      if (!currentUserId) {
        console.error(
          "[CALL_PAGE] Cannot join call: No user ID available in authStore",
        );
        toast.error(
          "Không thể tham gia cuộc gọi: Không tìm thấy thông tin người dùng",
        );
        return false;
      }

      const joinResult = await joinCall(
        callId,
        token,
        alreadyAccepted,
        currentUserId,
      );

      if (!joinResult.success) {
        console.error(
          `[CALL_PAGE] User is not allowed to join call: ${joinResult.message}`,
        );
        console.error(`[CALL_PAGE] Join call failure details:`, joinResult);

        // Show a more prominent error message with specific details
        let errorMessage = `Không thể tham gia cuộc gọi: ${joinResult.message}`;

        // Add more specific guidance based on the error message
        if (joinResult.message.includes("not allowed")) {
          errorMessage =
            "Bạn không có quyền tham gia cuộc gọi này. Vui lòng kiểm tra lại thông tin.";

          // Try to get more information about the call
          try {
            const { getActiveCall } = await import("@/actions/call.action");
            console.log(
              "[CALL_PAGE] Checking for active calls that might be conflicting...",
            );
            const activeCallResult = await getActiveCall(token);
            console.log(
              "[CALL_PAGE] Active call check result:",
              activeCallResult,
            );
          } catch (activeCallError) {
            console.error(
              "[CALL_PAGE] Error checking active call:",
              activeCallError,
            );
          }
        } else if (joinResult.message.includes("not found")) {
          errorMessage = "Cuộc gọi không tồn tại hoặc đã kết thúc.";
        } else if (joinResult.message.includes("already ended")) {
          errorMessage = "Cuộc gọi đã kết thúc.";
        }

        toast.error(errorMessage, {
          duration: 5000, // Show for 5 seconds
          position: "top-center",
        });

        return false;
      }

      console.log("[CALL_PAGE] User is allowed to join the call");
      return true;
    } catch (error) {
      console.error("[CALL_PAGE] Error checking if user can join call:", error);

      // Show a more detailed error message
      let errorMessage = "Không thể kiểm tra quyền tham gia cuộc gọi";
      if (error instanceof Error) {
        errorMessage = `Lỗi: ${error.message}`;
      }

      toast.error(errorMessage, {
        duration: 5000,
        position: "top-center",
      });

      return false;
    }
  };

  // Set up call event handlers
  // Helper function to wait for socket and initialize WebRTC
  const waitForSocketAndInitWebRTC = async () => {
    try {
      // First check if the user is allowed to join the call
      const canJoinCall = await checkUserCanJoinCall();

      if (!canJoinCall) {
        console.error("[CALL_PAGE] User is not allowed to join this call");

        // Update call status to ended
        setCallStatus("ended");

        // Show a more prominent error message
        toast.error("Không thể tham gia cuộc gọi. Vui lòng thử lại sau.", {
          duration: 5000,
          position: "top-center",
        });

        // Add a button to close the window
        const closeButton = document.createElement("button");
        closeButton.innerText = "Đóng cửa sổ";
        closeButton.className =
          "mt-4 px-4 py-2 bg-blue-500 text-white rounded-md";
        closeButton.onclick = () => window.close();

        // Find a suitable container to append the button
        setTimeout(() => {
          const container = document.querySelector(
            ".flex.flex-col.items-center",
          );
          if (container) {
            container.appendChild(closeButton);
          }
        }, 500);

        // Don't automatically close the window - let the user see the error message
        // and decide when to close the window themselves

        return;
      }

      // Check if we're in cleanup mode
      const isCleaningUp =
        sessionStorage.getItem("webrtc_cleaning_up") === "true";
      if (isCleaningUp) {
        console.log(
          "[CALL_PAGE] Cleanup in progress, waiting before initializing WebRTC",
        );
        // Wait for cleanup to complete
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }

      // Import socket modules
      const { getCallSocket, ensureCallSocket, initCallSocket } = await import(
        "@/lib/callSocket"
      );
      const { useAuthStore } = await import("@/stores/authStore");
      const token = useAuthStore.getState().accessToken;

      if (!token) {
        console.error(
          "[CALL_PAGE] No token available for socket initialization",
        );
        toast.error("Không thể kết nối: Bạn cần đăng nhập lại");
        setCallStatus("ended");
        return;
      }

      // Check if we already have a socket
      let socket = getCallSocket();

      if (socket && socket.connected) {
        console.log(
          "[CALL_PAGE] Socket already connected, initializing WebRTC",
        );
        initWebRTC();
        return;
      }

      console.log(
        "[CALL_PAGE] Socket not connected, ensuring call socket is available",
      );

      // Multi-stage socket initialization approach
      // Stage 1: Try to ensure call socket with normal approach
      try {
        console.log(
          "[CALL_PAGE] Stage 1: Ensuring call socket with normal approach",
        );
        socket = await ensureCallSocket(true);

        if (socket && socket.connected) {
          console.log(
            "[CALL_PAGE] Successfully ensured call socket connection in Stage 1",
          );
        } else {
          console.warn(
            "[CALL_PAGE] Failed to ensure call socket in Stage 1, trying Stage 2",
          );

          // Stage 2: Try direct initialization
          console.log(
            "[CALL_PAGE] Stage 2: Trying direct socket initialization",
          );
          socket = initCallSocket(token, true);

          if (socket) {
            // Connect explicitly
            socket.connect();

            // Wait for connection with timeout
            console.log("[CALL_PAGE] Waiting for direct socket to connect");
            const connectionTimeout = 10000; // 10 seconds
            const startTime = Date.now();

            while (
              !socket.connected &&
              Date.now() - startTime < connectionTimeout
            ) {
              await new Promise((resolve) => setTimeout(resolve, 300));

              // Log occasionally
              if ((Date.now() - startTime) % 3000 < 300) {
                console.log(
                  "[CALL_PAGE] Still waiting for socket to connect...",
                );
              }
            }

            if (socket.connected) {
              console.log(
                "[CALL_PAGE] Successfully connected socket in Stage 2",
              );
            } else {
              console.warn(
                "[CALL_PAGE] Failed to connect socket in Stage 2, trying Stage 3",
              );

              // Stage 3: Last resort - create a simpler socket
              console.log(
                "[CALL_PAGE] Stage 3: Creating a simpler socket as last resort",
              );
              const { io } = await import("socket.io-client");
              const socketUrl = `${process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3000"}/call`;

              // Disconnect the previous socket if it exists
              if (socket) {
                socket.disconnect();
              }

              // Create a simpler socket
              const lastResortSocket = io(socketUrl, {
                auth: { token },
                transports: ["websocket"],
                forceNew: true,
                reconnection: true,
                timeout: 20000,
              });

              // Connect and wait
              lastResortSocket.connect();
              await new Promise((resolve) => setTimeout(resolve, 5000));

              if (lastResortSocket.connected) {
                console.log(
                  "[CALL_PAGE] Successfully connected socket in Stage 3",
                );
                socket = lastResortSocket;
              } else {
                console.error(
                  "[CALL_PAGE] All socket connection attempts failed",
                );
              }
            }
          }
        }
      } catch (socketError) {
        console.error(
          "[CALL_PAGE] Error during socket initialization:",
          socketError,
        );
      }

      // Final check before initializing WebRTC
      socket = getCallSocket();
      if (!socket || !socket.connected) {
        console.warn(
          "[CALL_PAGE] Socket still not connected before WebRTC initialization, but proceeding anyway",
        );
      } else {
        console.log(
          "[CALL_PAGE] Socket is connected and ready for WebRTC initialization",
        );

        // Store the socket ID in sessionStorage for debugging
        try {
          if (socket.id) {
            sessionStorage.setItem("call_page_socket_id", socket.id);
            sessionStorage.setItem(
              "call_page_socket_connect_time",
              Date.now().toString(),
            );
          }
        } catch (storageError) {
          // Ignore storage errors
        }
      }

      // Initialize WebRTC with a slight delay to ensure socket is stable
      console.log("[CALL_PAGE] Initializing WebRTC after socket setup");
      setTimeout(() => {
        initWebRTC(true); // Pass forceConnect=true to ensure connection even with socket issues
      }, 500);
    } catch (error) {
      console.error("[CALL_PAGE] Error waiting for socket:", error);
      // Initialize WebRTC anyway as a fallback, but with a delay
      console.log(
        "[CALL_PAGE] Initializing WebRTC despite socket error after delay",
      );
      setTimeout(() => {
        initWebRTC(true); // Pass forceConnect=true to ensure connection even with socket issues
      }, 1000);
    }
  };

  // Listen for call error events
  useEffect(() => {
    const handleCallError = (event: Event) => {
      const customEvent = event as CustomEvent;
      const data = customEvent.detail;

      console.log("[CALL_PAGE] Received call:error event:", data);

      // Show an error message to the user
      toast.error(`Lỗi cuộc gọi: ${data.errorMessage}`, {
        duration: 5000,
        position: "top-center",
      });

      // Update call status to ended if this is a critical error
      if (
        data.errorType === "accept_failed" ||
        data.errorType === "join_failed"
      ) {
        setCallStatus("ended");
      }
    };

    // Add the event listener
    window.addEventListener("call:error", handleCallError as EventListener);

    // Return cleanup function
    return () => {
      window.removeEventListener(
        "call:error",
        handleCallError as EventListener,
      );
    };
  }, []);

  // Add a listener for the socket needed event and monitor socket connection
  useEffect(() => {
    if (!userId) return;

    const handleSocketNeeded = (event: CustomEvent) => {
      console.log(
        "[CALL_PAGE] Received webrtc:socket:needed event",
        event.detail,
      );

      // Check if we already have a socket
      import("@/lib/callSocket").then(
        async ({ getCallSocket, ensureCallSocket }) => {
          const socket = getCallSocket();

          if (socket && socket.connected) {
            console.log(
              "[CALL_PAGE] Socket already connected, no need to initialize",
            );
            return;
          }

          // Initialize the socket
          console.log(
            "[CALL_PAGE] Initializing socket in response to socket needed event",
          );
          const { useAuthStore } = await import("@/stores/authStore");
          const token = useAuthStore.getState().accessToken;

          if (!token) {
            console.warn(
              "[CALL_PAGE] No token available for socket initialization",
            );
            return;
          }

          // Initialize the socket
          try {
            const newSocket = await ensureCallSocket(true);

            if (newSocket) {
              console.log(
                "[CALL_PAGE] Socket initialized successfully in response to socket needed event",
              );

              // Dispatch an event to notify that the socket is ready
              try {
                window.dispatchEvent(
                  new CustomEvent("call:socket:ready", {
                    detail: {
                      socketId: newSocket.id,
                      timestamp: new Date().toISOString(),
                    },
                  }),
                );
                console.log("[CALL_PAGE] Dispatched call:socket:ready event");
              } catch (eventError) {
                console.error(
                  "[CALL_PAGE] Error dispatching socket ready event:",
                  eventError,
                );
              }
            } else {
              console.error(
                "[CALL_PAGE] Failed to initialize socket in response to socket needed event",
              );
            }
          } catch (error) {
            console.error("[CALL_PAGE] Error initializing socket:", error);
          }
        },
      );
    };

    // Set up a socket connection monitor
    let socketMonitorInterval: NodeJS.Timeout | null = null;

    const startSocketMonitor = async () => {
      // Clear any existing interval
      if (socketMonitorInterval) {
        clearInterval(socketMonitorInterval);
      }

      // Set up a new interval to check socket connection
      socketMonitorInterval = setInterval(async () => {
        try {
          const { getCallSocket, ensureCallSocket } = await import(
            "@/lib/callSocket"
          );
          const socket = getCallSocket();

          // Only check if we're in a connected call
          if (callStatus === "connected") {
            if (!socket || !socket.connected) {
              console.warn(
                "[CALL_PAGE] Socket disconnected during active call, attempting to reconnect",
              );

              // Check if we're in cleanup mode
              const isCleaningUp =
                sessionStorage.getItem("webrtc_cleaning_up") === "true";
              if (isCleaningUp) {
                console.log(
                  "[CALL_PAGE] Not reconnecting socket because cleanup is in progress",
                );
                return;
              }

              // Get token for reconnection
              const { useAuthStore } = await import("@/stores/authStore");
              const token = useAuthStore.getState().accessToken;

              if (token) {
                console.log(
                  "[CALL_PAGE] Attempting to reconnect socket during active call",
                );
                const newSocket = await ensureCallSocket(true);

                if (newSocket && newSocket.connected) {
                  console.log(
                    "[CALL_PAGE] Successfully reconnected socket during active call",
                  );

                  // Dispatch an event to notify that the socket is ready
                  try {
                    window.dispatchEvent(
                      new CustomEvent("call:socket:ready", {
                        detail: {
                          socketId: newSocket.id,
                          timestamp: new Date().toISOString(),
                          isReconnect: true,
                        },
                      }),
                    );
                    console.log(
                      "[CALL_PAGE] Dispatched call:socket:ready event after reconnection",
                    );
                  } catch (eventError) {
                    console.error(
                      "[CALL_PAGE] Error dispatching socket ready event:",
                      eventError,
                    );
                  }
                } else {
                  console.error(
                    "[CALL_PAGE] Failed to reconnect socket during active call",
                  );
                }
              }
            } else {
              // Socket is connected, log this occasionally (every 5 checks)
              if (Math.random() < 0.2) {
                console.log(
                  "[CALL_PAGE] Socket connection verified during active call",
                );
              }
            }
          }
        } catch (error) {
          console.error("[CALL_PAGE] Error in socket monitor:", error);
        }
      }, 15000); // Check every 15 seconds
    };

    // Start the socket monitor
    startSocketMonitor();

    // Add the event listener
    window.addEventListener(
      "webrtc:socket:needed",
      handleSocketNeeded as EventListener,
    );

    // Return cleanup function
    return () => {
      window.removeEventListener(
        "webrtc:socket:needed",
        handleSocketNeeded as EventListener,
      );

      // Clear the socket monitor interval
      if (socketMonitorInterval) {
        clearInterval(socketMonitorInterval);
        socketMonitorInterval = null;
      }
    };
  }, [userId, callStatus]);

  // Main call page setup
  useEffect(() => {
    if (!userId) return;

    console.log(`[CALL_PAGE] Call page loaded for room ${userId}`);

    // Initialize socket connection for this call page only
    // This ensures we don't have socket connections in the main app
    const initializeSocketForCallPage = async () => {
      try {
        // Import socket modules
        const socketModule = await import("@/lib/socket");
        const callSocketModule = await import("@/lib/callSocket");
        const { useAuthStore } = await import("@/stores/authStore");

        const token = useAuthStore.getState().accessToken;
        if (!token) {
          console.warn(
            "[CALL_PAGE] No token available for socket initialization",
          );
          return null;
        }

        // Set up main socket first
        console.log("[CALL_PAGE] Setting up main socket for call page");
        socketModule.setupSocket(token);

        // Then ensure call socket is initialized with retry logic
        console.log("[CALL_PAGE] Ensuring call socket for call page");
        let callSocket: any = null;
        let attempts = 0;
        const maxAttempts = 3;

        while (!callSocket && attempts < maxAttempts) {
          attempts++;
          try {
            console.log(
              `[CALL_PAGE] Call socket initialization attempt ${attempts}/${maxAttempts}`,
            );
            callSocket = await callSocketModule.ensureCallSocket(true);

            if (callSocket) {
              console.log("[CALL_PAGE] Call socket initialized successfully");

              // Store the socket ID in sessionStorage for debugging
              try {
                if (callSocket.id) {
                  sessionStorage.setItem("lastCallSocketId", callSocket.id);
                  console.log(
                    `[CALL_PAGE] Stored call socket ID in sessionStorage: ${callSocket.id}`,
                  );
                }
              } catch (storageError) {
                console.warn(
                  "[CALL_PAGE] Error storing socket ID in sessionStorage:",
                  storageError,
                );
              }

              // Wait a moment to ensure socket is stable
              await new Promise((resolve) => setTimeout(resolve, 2000));

              // Verify socket is still connected
              if (
                callSocket &&
                typeof callSocket.connected !== "undefined" &&
                !callSocket.connected
              ) {
                console.warn(
                  "[CALL_PAGE] Call socket disconnected immediately after initialization",
                );
                callSocket = null; // Reset to try again
              } else {
                console.log(
                  "[CALL_PAGE] Call socket connection verified and stable",
                );

                // Emit a test event to verify the socket is working properly
                try {
                  callSocket.emit("ping", { timestamp: Date.now() });
                  console.log("[CALL_PAGE] Test ping event sent successfully");
                } catch (pingError) {
                  console.error(
                    "[CALL_PAGE] Error sending test ping event:",
                    pingError,
                  );
                }
              }
            } else {
              console.warn("[CALL_PAGE] ensureCallSocket returned null");
              // Wait before retry
              await new Promise((resolve) => setTimeout(resolve, 1500));
            }
          } catch (socketError) {
            console.error(
              `[CALL_PAGE] Error in call socket initialization attempt ${attempts}:`,
              socketError,
            );
            // Wait before retry
            await new Promise((resolve) => setTimeout(resolve, 1500));
          }
        }

        if (callSocket) {
          console.log(
            "[CALL_PAGE] Socket initialization complete for call page",
          );

          // Dispatch an event to notify that the socket is ready
          try {
            window.dispatchEvent(
              new CustomEvent("call:socket:ready", {
                detail: {
                  socketId: callSocket.id,
                  timestamp: new Date().toISOString(),
                },
              }),
            );
            console.log("[CALL_PAGE] Dispatched call:socket:ready event");
          } catch (eventError) {
            console.error(
              "[CALL_PAGE] Error dispatching socket ready event:",
              eventError,
            );
          }

          return callSocket;
        } else {
          console.error(
            "[CALL_PAGE] Failed to initialize call socket after multiple attempts",
          );
          return null;
        }
      } catch (error) {
        console.error(
          "[CALL_PAGE] Error initializing sockets for call page:",
          error,
        );
        return null;
      }
    };

    // Initialize sockets
    initializeSocketForCallPage();

    // Store important call information in sessionStorage
    if (callId) {
      console.log(`[CALL_PAGE] Storing callId in sessionStorage: ${callId}`);
      sessionStorage.setItem("currentCallId", callId || "");
    }

    console.log(`[CALL_PAGE] Storing roomId in sessionStorage: ${userId}`);
    sessionStorage.setItem("callRoomId", userId);

    if (targetId) {
      console.log(
        `[CALL_PAGE] Storing targetId in sessionStorage: ${targetId}`,
      );
      sessionStorage.setItem("callTargetId", targetId || "");
    }

    // Store call direction
    if (isIncoming) {
      console.log(
        `[CALL_PAGE] Storing call direction in sessionStorage: incoming`,
      );
      sessionStorage.setItem("callDirection", "incoming");
    } else {
      console.log(
        `[CALL_PAGE] Storing call direction in sessionStorage: outgoing`,
      );
      sessionStorage.setItem("callDirection", "outgoing");
    }

    // Set up event handlers for call events
    const cleanupCallEventHandlers = setupCallEventHandlers({
      roomId: userId,
      callId,
      targetId,
      setCallStatus,
      callStatus,
      initWebRTC,
      webrtcInitialized: webrtcState.initialized,
    });

    // Set up handlers for remote streams
    const cleanupRemoteStreamHandlers = setupRemoteStreamHandlers();

    // Notify that the call page has loaded successfully with more detailed information
    try {
      window.dispatchEvent(
        new CustomEvent("call:pageLoaded", {
          detail: {
            roomId: userId,
            callId: callId,
            targetId: targetId,
            isOutgoing: isOutgoing,
            isIncoming: isIncoming,
            callType: callType,
            timestamp: new Date().toISOString(),
          },
        }),
      );
      console.log("[CALL_PAGE] Dispatched call:pageLoaded event");
    } catch (e) {
      console.error("[CALL_PAGE] Error dispatching call:pageLoaded event:", e);
    }

    // Check URL parameters for timestamp
    const urlParams = new URLSearchParams(window.location.search);
    const timestamp = urlParams.get("t");
    const isRecentNavigation =
      timestamp && Date.now() - Number(timestamp) < 10000;

    // For outgoing calls, we need to check if we're waiting for the other party
    if (isOutgoing && callStatus === "waiting" && !isRecentNavigation) {
      console.log(
        "[CALL_PAGE] This is an outgoing call, waiting for the other party to accept",
      );

      // Only initiate the call if we don't have a callId from URL params
      if (!callId) {
        console.log("[CALL_PAGE] No callId in URL params, initiating new call");

        // Get token for API call
        import("@/stores/authStore").then(async ({ useAuthStore }) => {
          const token = useAuthStore.getState().accessToken;

          if (token && targetId) {
            // Import the initiateCall action
            const { initiateCall } = await import("@/actions/call.action");

            // Get current user ID from authStore
            const currentUserId = useAuthStore.getState().user?.id;

            if (!currentUserId) {
              console.error(
                "[CALL_PAGE] Cannot initiate call: No user ID available in authStore",
              );
              toast.error(
                "Không thể thực hiện cuộc gọi: Không tìm thấy thông tin người dùng",
              );
              return;
            }

            // Call the server action directly
            const result = await initiateCall(
              targetId,
              callType,
              token,
              currentUserId,
            );

            if (result.success) {
              // Wait for socket to be ready before initializing WebRTC
              console.log(
                "[CALL_PAGE] Waiting for socket to be ready before initializing WebRTC",
              );

              // Wait for the socket initialization to complete
              try {
                // Wait for socket to be ready (either from our initialization or from an event)
                const waitForSocket = async () => {
                  // First check if we have a socket ready event
                  return new Promise<boolean>((resolve) => {
                    // Set up a listener for the socket ready event
                    const socketReadyHandler = () => {
                      console.log("[CALL_PAGE] Received socket ready event");
                      document.removeEventListener(
                        "call:socket:ready",
                        socketReadyHandler,
                      );
                      resolve(true);
                    };

                    // Set a timeout in case the event doesn't fire
                    const timeoutId = setTimeout(() => {
                      document.removeEventListener(
                        "call:socket:ready",
                        socketReadyHandler,
                      );
                      console.log(
                        "[CALL_PAGE] Socket ready event timeout, proceeding anyway",
                      );
                      resolve(false);
                    }, 5000);

                    // Add the event listener
                    document.addEventListener(
                      "call:socket:ready",
                      socketReadyHandler,
                    );

                    // Check if we already have a socket
                    import("@/lib/callSocket").then(({ getCallSocket }) => {
                      const socket = getCallSocket();
                      if (socket && socket.connected) {
                        console.log(
                          "[CALL_PAGE] Socket already connected, no need to wait",
                        );
                        clearTimeout(timeoutId);
                        document.removeEventListener(
                          "call:socket:ready",
                          socketReadyHandler,
                        );
                        resolve(true);
                      }
                    });
                  });
                };

                await waitForSocket();

                // Initialize WebRTC but stay in waiting state
                console.log("[CALL_PAGE] Socket is ready, initializing WebRTC");
                initWebRTC();
              } catch (error) {
                console.error("[CALL_PAGE] Error waiting for socket:", error);
                // Initialize WebRTC anyway as a fallback
                console.log(
                  "[CALL_PAGE] Initializing WebRTC despite socket error",
                );
                initWebRTC();
              }
            } else {
              setCallStatus("ended");
            }
          } else {
            console.error(
              "[CALL_PAGE] Missing token or targetId for outgoing call",
            );
            toast.error("Không thể thực hiện cuộc gọi");
            setCallStatus("ended");
          }
        });
      } else {
        // If we already have a callId, wait for socket before initializing WebRTC
        console.log(
          `[CALL_PAGE] Using existing callId=${callId} from URL params`,
        );

        // Wait for socket to be ready before initializing WebRTC
        console.log(
          "[CALL_PAGE] Waiting for socket to be ready before initializing WebRTC",
        );

        // Wait for the socket initialization to complete
        waitForSocketAndInitWebRTC();
      }
    }
    // Special handling for recent navigations (likely from incoming call page)
    else if (isRecentNavigation) {
      console.log(
        "[CALL_PAGE] This appears to be a recently accepted incoming call, initializing WebRTC immediately",
      );

      // Wait for socket to be ready before initializing WebRTC
      console.log(
        "[CALL_PAGE] Waiting for socket to be ready before initializing WebRTC",
      );

      // Wait for the socket initialization to complete
      const waitForSocketAndUpdateStatus = async () => {
        await waitForSocketAndInitWebRTC();

        // Also update the call status to ensure UI shows correctly
        if (callStatus === "waiting") {
          console.log(
            "[CALL_PAGE] Updating call status to connecting for recently accepted call",
          );
          setCallStatus("connecting");
        }
      };

      waitForSocketAndUpdateStatus();
    } else {
      // For other incoming calls or reconnections, check active call
      console.log("[CALL_PAGE] This is an incoming call or reconnection");

      // Get token for API call
      import("@/stores/authStore").then(async ({ useAuthStore }) => {
        const token = useAuthStore.getState().accessToken;

        if (token) {
          // Import the getActiveCall action
          const { getActiveCall } = await import("@/actions/call.action");

          // Call the server action directly
          const result = await getActiveCall(token);

          if (result.success) {
            // We have an active call, proceed with WebRTC initialization
            console.log(
              "[CALL_PAGE] Active call found, waiting for socket before WebRTC initialization",
            );

            // Wait for socket to be ready before initializing WebRTC
            waitForSocketAndInitWebRTC();
          } else {
            console.log(
              "[CALL_PAGE] No active call found, but continuing with socket check anyway",
            );

            // Wait for socket to be ready before initializing WebRTC
            waitForSocketAndInitWebRTC();
          }
        } else {
          console.warn("[CALL_PAGE] No token available to check active call");
          console.log(
            "[CALL_PAGE] Proceeding with WebRTC initialization anyway after socket check",
          );

          // Wait for socket to be ready before initializing WebRTC
          waitForSocketAndInitWebRTC();
        }
      });
    }

    // Handle window close event
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (callStatus === "connected") {
        e.preventDefault();
        return "Bạn có chắc chắn muốn kết thúc cuộc gọi?";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    // Return cleanup function
    return () => {
      console.log("[CALL_PAGE] Cleaning up event handlers and resources");
      cleanupCallEventHandlers();
      cleanupRemoteStreamHandlers();
      window.removeEventListener("beforeunload", handleBeforeUnload);

      // Clean up WebRTC resources
      const cleanupWebRTC = async () => {
        try {
          console.log("[CALL_PAGE] Cleaning up WebRTC resources");
          const { cleanup } = await import("@/utils/webrtc/cleanup");
          await cleanup();
          console.log("[CALL_PAGE] WebRTC cleanup completed successfully");
        } catch (error) {
          console.error("[CALL_PAGE] Error during WebRTC cleanup:", error);
        }
      };

      // Clean up socket connections
      const cleanupSockets = async () => {
        try {
          console.log("[CALL_PAGE] Cleaning up socket connections");
          const callSocketModule = await import("@/lib/callSocket");
          const socket = callSocketModule.getCallSocket();

          if (socket) {
            console.log("[CALL_PAGE] Disconnecting call socket");
            socket.disconnect();
            socket.removeAllListeners();
          }

          console.log("[CALL_PAGE] Socket cleanup completed");
        } catch (error) {
          console.error("[CALL_PAGE] Error during socket cleanup:", error);
        }
      };

      // Execute cleanup
      cleanupWebRTC();
      cleanupSockets();

      // Clean up session storage
      try {
        sessionStorage.removeItem("callAcceptedAt");
        console.log(
          "[CALL_PAGE] Cleaned up call-related session storage items",
        );
      } catch (e) {
        console.error("[CALL_PAGE] Error cleaning up session storage:", e);
      }
    };
  }, [
    userId,
    targetId,
    callId,
    isOutgoing,
    isIncoming,
    callStatus,
    initWebRTC,
    webrtcState.initialized,
  ]);

  const handleEndCall = async () => {
    try {
      console.log("[CALL_PAGE] Ending call");

      // End the WebRTC call first using the hook
      console.log("[CALL_PAGE] Ending WebRTC call");
      await endWebRTC();

      const { useAuthStore } = await import("@/stores/authStore");
      const { useCallStore } = await import("@/stores/callStore");

      // Get token for API call - try multiple sources
      let token = useAuthStore.getState().accessToken;
      let myUserId = useAuthStore.getState().user?.id;

      // If no token in auth store, try to get from session storage
      if (!token) {
        const storedToken = sessionStorage.getItem("callAccessToken");
        if (storedToken) {
          console.log(
            "[CALL_PAGE] Using token from sessionStorage for ending call",
          );
          token = storedToken;
        }
      }

      // If no user ID in auth store, try to get from session storage
      if (!myUserId) {
        const storedUserId = sessionStorage.getItem("currentUserId");
        if (storedUserId) {
          console.log(
            `[CALL_PAGE] Using user ID from sessionStorage for ending call: ${storedUserId}`,
          );
          myUserId = storedUserId;
        }
      }

      // Check URL parameters for user ID as a last resort
      if (!myUserId) {
        const urlParams = new URLSearchParams(window.location.search);
        const urlUserId = urlParams.get("userId");
        if (urlUserId) {
          console.log(
            `[CALL_PAGE] Found user ID in URL parameters for ending call: ${urlUserId}`,
          );
          myUserId = urlUserId;
        }
      }

      console.log(
        `[CALL_PAGE] Token available: ${!!token}, User ID available: ${!!myUserId}`,
      );

      // Get the current call ID - try multiple sources
      const currentCallId = callId || sessionStorage.getItem("currentCallId");
      console.log(`[CALL_PAGE] Current call ID: ${currentCallId || "unknown"}`);

      // Notify the server that the call has ended - this will end the call for both parties
      if (currentCallId && token) {
        console.log(
          `[CALL_PAGE] Sending end call request to server for call ID: ${currentCallId}`,
        );

        try {
          // Import the endCall action directly to avoid using the store
          const { endCall: endCallActionDirect } = await import(
            "@/actions/call.action"
          );
          const result = await endCallActionDirect(
            currentCallId,
            token,
            myUserId,
          );
          console.log(`[CALL_PAGE] End call API result:`, result);
        } catch (endCallError) {
          console.error(
            "[CALL_PAGE] Error ending call with direct action:",
            endCallError,
          );

          // Try the original method as fallback
          try {
            const result = await endCallAction(currentCallId, token, myUserId);
            console.log(`[CALL_PAGE] End call API result (fallback):`, result);
          } catch (fallbackError) {
            console.error(
              "[CALL_PAGE] Error ending call with fallback method:",
              fallbackError,
            );
          }
        }
      } else if (token) {
        // If we don't have a call ID but we have a token, try to end the active call
        console.log(
          "[CALL_PAGE] No call ID available, trying to end active call",
        );

        // First try to get the active call from the server
        try {
          const { getActiveCall } = await import("@/actions/call.action");
          const activeCallResult = await getActiveCall(token);

          if (activeCallResult.success && activeCallResult.activeCall) {
            console.log(
              `[CALL_PAGE] Found active call from server: ${activeCallResult.activeCall.id}`,
            );

            // Import the endCall action directly to avoid using the store
            const { endCall: endCallActionDirect } = await import(
              "@/actions/call.action"
            );
            const result = await endCallActionDirect(
              activeCallResult.activeCall.id,
              token,
              myUserId,
            );
            console.log(`[CALL_PAGE] End call API result:`, result);
          } else {
            console.log("[CALL_PAGE] No active call found from server");
          }
        } catch (activeCallError) {
          console.error(
            "[CALL_PAGE] Error getting active call from server:",
            activeCallError,
          );
        }

        // Also try using the call store as a backup
        try {
          const callStore = useCallStore.getState();
          if (callStore.currentCall?.id) {
            console.log(
              `[CALL_PAGE] Ending call from store with ID: ${callStore.currentCall.id}`,
            );
            await callStore.endCall();
          }
        } catch (storeError) {
          console.error(
            "[CALL_PAGE] Error ending call from store:",
            storeError,
          );
        }
      }

      // Update UI state
      setCallStatus("ended");
      toast.info(
        `Cuộc gọi với ${user?.userInfo?.fullName || "người dùng"} đã kết thúc`,
      );

      // Dispatch a custom event to ensure all components are notified
      if (currentCallId) {
        console.log(
          `[CALL_PAGE] Dispatching call:ended event for call ID: ${currentCallId}`,
        );
        window.dispatchEvent(
          new CustomEvent("call:ended", {
            detail: { callId: currentCallId, roomId: userId },
          }),
        );
      } else {
        // If we don't have a call ID, use the room ID
        console.log(
          `[CALL_PAGE] Dispatching call:ended event with room ID: ${userId}`,
        );
        window.dispatchEvent(
          new CustomEvent("call:ended", {
            detail: { roomId: userId },
          }),
        );
      }

      // Close the window after a short delay
      console.log("[CALL_PAGE] Closing window in 1 second");
      setTimeout(() => {
        window.close();
      }, 1000);
    } catch (error) {
      console.error("[CALL_PAGE] Error ending call:", error);

      // Still try to close the window
      window.close();
    }
  };

  // Handle toggling mute state
  const handleToggleMute = async () => {
    try {
      // Toggle mute state
      const newMuteState = await toggleMute();
      setIsMuted(newMuteState);

      toast.info(newMuteState ? "Đã tắt micrô" : "Đã bật micrô");
    } catch (error) {
      console.error("Error toggling mute:", error);

      // Fallback to local state toggle
      setIsMuted(!isMuted);
      toast.info(!isMuted ? "Đã tắt micrô" : "Đã bật micrô");
    }
  };

  return (
    <div className="flex flex-col items-center justify-between h-screen bg-gray-100">
      {/* Header with user info */}
      <CallHeader
        userName={user?.userInfo?.fullName || "Người dùng"}
        callStatus={callStatus}
        callDuration={callDuration}
      />

      {/* Main content with avatar */}
      <CallContent user={user} callStatus={callStatus} />

      {/* Call controls */}
      <AudioCallControls
        isMuted={isMuted}
        toggleMute={handleToggleMute}
        handleEndCall={handleEndCall}
      />
    </div>
  );
}

// Main component that will be exported
export default function CallPage({ params }: { params: { id: string } }) {
  // Unwrap params at the top level of the component
  // This is valid in Next.js page components
  const unwrappedParams = use(params as any) as { id: string };
  const id = unwrappedParams.id;

  return <CallPageContent userId={id} />;
}
