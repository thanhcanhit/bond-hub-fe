"use client";

import { useState, useEffect } from "react";
import { useAuthStore } from "@/stores/authStore";
import FloatingIncomingCall from "./FloatingIncomingCall";
import CallingUI from "./CallingUI";
import { initiateCall, initiateGroupCall } from "@/actions/call.action";
import { toast } from "sonner";

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

  useEffect(() => {
    if (!isAuthenticated) return;
    console.log("Call actions are available");
  }, [isAuthenticated]);

  // Handle call accepted
  const handleCallAccepted = () => {
    if (!outgoingCall) {
      console.warn("handleCallAccepted called but no outgoing call is active");
      return;
    }

    console.log("Call accepted, preparing to navigate to call page");
    const { targetId, type } = outgoingCall;
    const callUrl =
      type === "VIDEO" ? `/video-call/${targetId}` : `/call/${targetId}`;
    console.log(`Navigating to call page: ${callUrl}`);

    setOutgoingCall(null);

    setTimeout(() => {
      console.log(`Redirecting to ${callUrl} using window.location`);
      window.location.href = callUrl;
    }, 500);
  };

  // Handle call ended or rejected
  const handleCallEnded = () => {
    console.log("Call ended or rejected, cleaning up outgoing call state");
    const currentCallId = outgoingCall?.callId;
    setOutgoingCall(null);

    if (currentCallId) {
      setActiveCallIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(currentCallId);
        return newSet;
      });

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
