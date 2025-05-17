"use client";

import { useState, useEffect } from "react";
import { useAuthStore } from "@/stores/authStore";
import {
  initCallSocketHandlers,
  registerIncomingCallHandler,
  unregisterIncomingCallHandler,
  ensureCallSocketHandlersRegistered,
} from "@/utils/callSocketHandler";
import FloatingIncomingCall from "./FloatingIncomingCall";
import CallingUI from "./CallingUI";
// Import call actions dynamically to prevent chunk loading errors
import dynamic from "next/dynamic";

// Import actions directly
import { initiateCall, initiateGroupCall } from "@/actions/call.action";
import { toast } from "sonner";
// No need for router import

interface CallData {
  callId: string;
  initiatorId: string;
  type: "AUDIO" | "VIDEO";
  roomId: string;
  isGroupCall: boolean;
  groupId?: string;
}

export default function CallManager() {
  const [incomingCall, setIncomingCall] = useState<CallData | null>(null);
  const [outgoingCall, setOutgoingCall] = useState<{
    callId: string;
    targetId: string;
    targetType: "USER" | "GROUP";
    type: "AUDIO" | "VIDEO";
  } | null>(null);
  const [activeCallIds, setActiveCallIds] = useState<Set<string>>(new Set());
  const { accessToken, isAuthenticated } = useAuthStore();

  // No need to load call actions dynamically anymore
  useEffect(() => {
    if (!isAuthenticated) return;

    console.log("Call actions are available");
  }, [isAuthenticated]);

  // Initialize socket handlers
  useEffect(() => {
    if (!isAuthenticated) {
      console.log("User not authenticated, not initializing call handlers");
      return;
    }

    console.log("Initializing call socket handlers in CallManager");

    // Initialize socket handlers with retry mechanism
    initCallSocketHandlers();

    // Set up an interval to ensure socket handlers are registered, but with a longer interval
    // to prevent excessive reconnection attempts
    const checkInterval = setInterval(() => {
      console.log("Checking call socket handlers are registered...");
      // Only ensure handlers are registered if we're not in the middle of a call
      if (!incomingCall && !outgoingCall) {
        ensureCallSocketHandlersRegistered();
      }
    }, 60000); // Check every 60 seconds instead of 30

    // Register handler for incoming calls
    registerIncomingCallHandler((callData) => {
      console.log("Incoming call received in CallManager:", callData);

      // Check if we're already handling this call
      if (activeCallIds.has(callData.callId)) {
        console.log(
          `Call ${callData.callId} is already being handled, ignoring duplicate event`,
        );
        return;
      }

      // Add this call to our active calls set
      setActiveCallIds((prev) => {
        const newSet = new Set(prev);
        newSet.add(callData.callId);
        return newSet;
      });

      try {
        // Open incoming call in a new window
        const { callId, initiatorId, type, roomId } = callData;

        // Log all parameters to ensure they're correct
        console.log("Opening incoming call window with params:", {
          callId,
          initiatorId,
          type,
          roomId,
        });

        // Create URL with all necessary parameters
        const incomingCallUrl = `/call/incoming/${callId}?initiatorId=${initiatorId}&type=${type}&roomId=${roomId}`;
        console.log("Incoming call URL:", incomingCallUrl);

        // Check if a window for this call is already open
        let existingWindow: Window | null = null;
        try {
          // Try to find an existing window
          if (window.opener && window.opener.window) {
            const windows = Array.from(window.opener.window);
            existingWindow = windows.find((w: any) =>
              w.location.href.includes(`/call/incoming/${callId}`),
            ) as Window | null;
          }
        } catch (e) {
          console.error("Error checking for existing windows:", e);
        }

        if (existingWindow) {
          console.log(`Window for call ${callId} already exists, focusing it`);
          try {
            existingWindow.focus();
          } catch (e) {
            console.error("Error focusing existing window:", e);
          }
          return;
        }

        // Open in a new window with appropriate size
        const windowSize =
          type === "VIDEO" ? "width=800,height=600" : "width=400,height=600";
        const callWindow = window.open(
          incomingCallUrl,
          `call_${callId}`,
          windowSize,
        );

        if (!callWindow) {
          console.error("Failed to open call window - popup blocked");
          toast.error(
            "Trình duyệt đã chặn cửa sổ pop-up. Vui lòng cho phép pop-up để nhận cuộc gọi.",
          );
          // Fall back to floating UI if popup is blocked
          setIncomingCall(callData);
        } else {
          console.log("Successfully opened incoming call window");

          // Focus the window to bring it to front
          callWindow.focus();

          // Add a fallback in case the window fails to load
          setTimeout(() => {
            if (callWindow.closed) {
              console.warn(
                "Call window was closed immediately - falling back to floating UI",
              );
              setIncomingCall(callData);
            }
          }, 1000);

          // Remove from active calls when window is closed
          const checkWindowInterval = setInterval(() => {
            if (callWindow.closed) {
              clearInterval(checkWindowInterval);
              setActiveCallIds((prev) => {
                const newSet = new Set(prev);
                newSet.delete(callId);
                return newSet;
              });
            }
          }, 1000);
        }
      } catch (error) {
        console.error("Error opening incoming call window:", error);
        // Fall back to floating UI on any error
        setIncomingCall(callData);
      }
    });

    return () => {
      console.log("Cleaning up call handlers in CallManager");
      clearInterval(checkInterval);
      unregisterIncomingCallHandler();
    };
  }, [isAuthenticated]);

  // Handle call accepted
  const handleCallAccepted = () => {
    if (!outgoingCall) {
      console.warn("handleCallAccepted called but no outgoing call is active");
      return;
    }

    console.log("Call accepted, preparing to navigate to call page");
    // Extract only the properties we need
    const { targetId, type } = outgoingCall;

    // Determine the appropriate call URL
    // Use targetId as roomId
    const callUrl =
      type === "VIDEO" ? `/video-call/${targetId}` : `/call/${targetId}`;
    console.log(`Navigating to call page: ${callUrl}`);

    // Clear outgoing call state first to prevent UI issues
    setOutgoingCall(null);

    // Không phát sự kiện call:accepted vì backend không hỗ trợ
    console.log(
      "Call accepted, proceeding with navigation without dispatching event",
    );

    // Use window.location for more reliable navigation in this context
    // This is more reliable than router.push in this specific scenario
    // Increased timeout to ensure both sides have time to process events
    setTimeout(() => {
      console.log(`Redirecting to ${callUrl} using window.location`);
      window.location.href = callUrl;
    }, 500);
  };

  // Handle call ended or rejected
  const handleCallEnded = () => {
    console.log("Call ended or rejected, cleaning up outgoing call state");

    // Get the current outgoing call ID before clearing it
    const currentCallId = outgoingCall?.callId;

    // Clear the outgoing call state
    setOutgoingCall(null);

    // Remove from active calls set if it exists
    if (currentCallId) {
      setActiveCallIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(currentCallId);
        return newSet;
      });

      // Also dispatch an ended event to ensure cleanup on all sides
      try {
        window.dispatchEvent(
          new CustomEvent("call:ended", {
            detail: { callId: currentCallId },
          }),
        );
      } catch (e) {
        console.error("Error dispatching call ended event during cleanup:", e);
      }
    }
  };

  // Handle closing the incoming call UI
  const handleCloseIncomingCall = () => {
    if (incomingCall) {
      // Remove from active calls set
      setActiveCallIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(incomingCall.callId);
        return newSet;
      });
    }
    setIncomingCall(null);
  };

  // Expose methods to initiate calls
  (window as any).initiateUserCall = async (
    userId: string,
    callType: "AUDIO" | "VIDEO",
  ) => {
    console.log(`Initiating ${callType} call to user ${userId}`);

    if (!isAuthenticated || !accessToken) {
      console.error(
        "Cannot initiate call: User not authenticated or missing token",
      );
      toast.error("Bạn cần đăng nhập để thực hiện cuộc gọi");
      return;
    }

    try {
      console.log(
        `Calling initiateCall with userId=${userId}, type=${callType}, token=${accessToken ? "exists" : "missing"}`,
      );

      // Get current user ID from authStore
      const currentUserId = useAuthStore.getState().user?.id;

      if (!currentUserId) {
        console.error(
          "Cannot initiate call: No user ID available in authStore",
        );
        toast.error(
          "Không thể thực hiện cuộc gọi: Không tìm thấy thông tin người dùng",
        );
        return;
      }

      // Call the server action directly
      const result = await initiateCall(
        userId,
        callType,
        accessToken,
        currentUserId,
      );
      console.log("Call initiation result:", result);

      if (result.success) {
        console.log(`Setting outgoing call with callId=${result.callId}`);
        setOutgoingCall({
          callId: result.callId,
          targetId: userId,
          targetType: "USER",
          type: callType,
        });
      } else {
        console.error("Failed to initiate call:", result.message);
        toast.error(result.message || "Không thể thực hiện cuộc gọi");
      }
    } catch (error) {
      console.error("Error initiating call:", error);
      toast.error("Đã xảy ra lỗi khi thực hiện cuộc gọi");
    }
  };

  // Expose methods to initiate group calls
  (window as any).initiateGroupCall = async (
    groupId: string,
    callType: "AUDIO" | "VIDEO",
  ) => {
    console.log(`Initiating ${callType} group call to group ${groupId}`);

    if (!isAuthenticated || !accessToken) {
      console.error(
        "Cannot initiate group call: User not authenticated or missing token",
      );
      toast.error("Bạn cần đăng nhập để thực hiện cuộc gọi nhóm");
      return;
    }

    try {
      console.log(
        `Calling initiateGroupCall with groupId=${groupId}, type=${callType}, token=${accessToken ? "exists" : "missing"}`,
      );

      // Get current user ID from authStore
      const currentUserId = useAuthStore.getState().user?.id;

      if (!currentUserId) {
        console.error(
          "Cannot initiate group call: No user ID available in authStore",
        );
        toast.error(
          "Không thể thực hiện cuộc gọi nhóm: Không tìm thấy thông tin người dùng",
        );
        return;
      }

      // Call the server action directly
      const result = await initiateGroupCall(
        groupId,
        callType,
        accessToken,
        currentUserId,
      );
      console.log("Group call initiation result:", result);

      if (result.success) {
        console.log(`Setting outgoing group call with callId=${result.callId}`);
        setOutgoingCall({
          callId: result.callId,
          targetId: groupId,
          targetType: "GROUP",
          type: callType,
        });
      } else {
        console.error("Failed to initiate group call:", result.message);
        toast.error(result.message || "Không thể thực hiện cuộc gọi nhóm");
      }
    } catch (error) {
      console.error("Error initiating group call:", error);
      toast.error("Đã xảy ra lỗi khi thực hiện cuộc gọi nhóm");
    }
  };

  return (
    <>
      {incomingCall && (
        <FloatingIncomingCall
          callData={incomingCall}
          onClose={handleCloseIncomingCall}
        />
      )}

      {outgoingCall && accessToken && (
        <CallingUI
          callData={outgoingCall}
          token={accessToken}
          onCallAccepted={handleCallAccepted}
          onCallEnded={handleCallEnded}
        />
      )}
    </>
  );
}
