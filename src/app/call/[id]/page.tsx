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
import { initiateOutgoingCall, checkActiveCall } from "@/utils/callActions";
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

  // Set up call event handlers
  useEffect(() => {
    if (!userId) return;

    console.log(`[CALL_PAGE] Call page loaded for room ${userId}`);

    // Store important call information in sessionStorage
    if (callId) {
      console.log(`[CALL_PAGE] Storing callId in sessionStorage: ${callId}`);
      sessionStorage.setItem("currentCallId", callId);
    }

    console.log(`[CALL_PAGE] Storing roomId in sessionStorage: ${userId}`);
    sessionStorage.setItem("callRoomId", userId);

    if (targetId) {
      console.log(
        `[CALL_PAGE] Storing targetId in sessionStorage: ${targetId}`,
      );
      sessionStorage.setItem("callTargetId", targetId);
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

    // Notify that the call page has loaded successfully
    try {
      window.dispatchEvent(
        new CustomEvent("call:pageLoaded", {
          detail: {
            roomId: userId,
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
            const result = await initiateOutgoingCall(
              targetId,
              callType,
              token,
            );

            if (result.success) {
              // Initialize WebRTC but stay in waiting state
              initWebRTC();
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
        // If we already have a callId, just initialize WebRTC
        console.log(
          `[CALL_PAGE] Using existing callId=${callId} from URL params`,
        );
        initWebRTC();
      }
    }
    // Special handling for recent navigations (likely from incoming call page)
    else if (isRecentNavigation) {
      console.log(
        "[CALL_PAGE] This appears to be a recently accepted incoming call, initializing WebRTC immediately",
      );

      // For recently accepted calls, we should initialize WebRTC right away
      console.log("[CALL_PAGE] Initializing WebRTC for recently accepted call");
      initWebRTC();

      // Also update the call status to ensure UI shows correctly
      if (callStatus === "waiting") {
        console.log(
          "[CALL_PAGE] Updating call status to connecting for recently accepted call",
        );
        setCallStatus("connecting");
      }
    } else {
      // For other incoming calls or reconnections, check active call
      console.log("[CALL_PAGE] This is an incoming call or reconnection");

      // Get token for API call
      import("@/stores/authStore").then(async ({ useAuthStore }) => {
        const token = useAuthStore.getState().accessToken;

        if (token) {
          const result = await checkActiveCall(token);

          if (result.success) {
            // We have an active call, proceed with WebRTC initialization
            console.log(
              "[CALL_PAGE] Proceeding with WebRTC initialization for active call",
            );
            initWebRTC();
          } else {
            console.log(
              "[CALL_PAGE] No active call found, but continuing anyway",
            );
            initWebRTC();
          }
        } else {
          console.warn("[CALL_PAGE] No token available to check active call");
          console.log(
            "[CALL_PAGE] Proceeding with WebRTC initialization anyway",
          );
          initWebRTC();
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
      console.log("[CALL_PAGE] Cleaning up event handlers");
      cleanupCallEventHandlers();
      cleanupRemoteStreamHandlers();
      window.removeEventListener("beforeunload", handleBeforeUnload);

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
          const result = await endCallActionDirect(currentCallId, token);
          console.log(`[CALL_PAGE] End call API result:`, result);
        } catch (endCallError) {
          console.error(
            "[CALL_PAGE] Error ending call with direct action:",
            endCallError,
          );

          // Try the original method as fallback
          try {
            const result = await endCallAction(currentCallId, token);
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
