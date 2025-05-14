"use client";

import { useState, useEffect } from "react";
import { useAuthStore } from "@/stores/authStore";
import {
  initCallSocketHandlers,
  registerIncomingCallHandler,
  unregisterIncomingCallHandler,
} from "@/utils/callSocketHandler";
import FloatingIncomingCall from "./FloatingIncomingCall";
import CallingUI from "./CallingUI";
import { initiateCall, initiateGroupCall } from "@/actions/call.action";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

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
  const { accessToken, isAuthenticated } = useAuthStore();
  const router = useRouter();

  // Initialize socket handlers
  useEffect(() => {
    if (!isAuthenticated) {
      console.log("User not authenticated, not initializing call handlers");
      return;
    }

    console.log("Initializing call socket handlers in CallManager");
    initCallSocketHandlers();

    // Register handler for incoming calls
    registerIncomingCallHandler((callData) => {
      console.log("Incoming call received in CallManager:", callData);

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

        // Open in a new window with appropriate size
        const windowSize =
          type === "VIDEO" ? "width=800,height=600" : "width=400,height=600";
        const callWindow = window.open(incomingCallUrl, "_blank", windowSize);

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
        }
      } catch (error) {
        console.error("Error opening incoming call window:", error);
        // Fall back to floating UI on any error
        setIncomingCall(callData);
      }
    });

    return () => {
      console.log("Cleaning up call handlers in CallManager");
      unregisterIncomingCallHandler();
    };
  }, [isAuthenticated]);

  // Handle call accepted
  const handleCallAccepted = () => {
    if (!outgoingCall) return;

    const { roomId, type } = outgoingCall;
    const callUrl =
      type === "VIDEO" ? `/video-call/${roomId}` : `/call/${roomId}`;
    router.push(callUrl);
    setOutgoingCall(null);
  };

  // Handle call ended or rejected
  const handleCallEnded = () => {
    setOutgoingCall(null);
  };

  // Handle closing the incoming call UI
  const handleCloseIncomingCall = () => {
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
      const result = await initiateCall(userId, callType, accessToken);
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
      const result = await initiateGroupCall(groupId, callType, accessToken);
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
