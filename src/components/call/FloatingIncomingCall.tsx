"use client";

import { useState, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Phone, PhoneOff } from "lucide-react";
import { getUserInitials } from "@/utils/userUtils";
import { playCallRingtone, stopAudio } from "@/utils/audioUtils";
import { User } from "@/types/base";
import { fetchUserById } from "@/actions/user";
import { acceptCall, rejectCall } from "@/actions/call.action";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";

interface FloatingIncomingCallProps {
  callData: {
    callId: string;
    initiatorId: string;
    type: "AUDIO" | "VIDEO";
    roomId: string;
    isGroupCall: boolean;
  };
  onClose: () => void;
}

export default function FloatingIncomingCall({
  callData,
  onClose,
}: FloatingIncomingCallProps) {
  const router = useRouter();
  const [caller, setCaller] = useState<User | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const { callId, initiatorId, type, roomId } = callData;

  // Play call ringtone
  useEffect(() => {
    const audio = playCallRingtone(0.7);

    return () => {
      stopAudio(audio);
    };
  }, []);

  // Fetch caller information
  useEffect(() => {
    const getCaller = async () => {
      if (!initiatorId) return;

      try {
        const userData = await fetchUserById(initiatorId);
        if (userData) {
          setCaller(userData);
        }
      } catch (error) {
        console.error("Error fetching caller information:", error);
      }
    };

    getCaller();
  }, [initiatorId]);

  // Handle accepting the call
  const handleAccept = async () => {
    console.log(
      `Accepting call: callId=${callId}, roomId=${roomId}, isProcessing=${isProcessing}`,
    );

    if (!callId || !roomId) {
      console.error("Cannot accept call: Missing callId or roomId");
      return;
    }

    if (isProcessing) {
      console.log(
        "Already processing call acceptance, ignoring duplicate click",
      );
      return;
    }

    setIsProcessing(true);
    console.log("Set isProcessing to true");

    try {
      // Get token for API call
      const token = useAuthStore.getState().accessToken;
      console.log(
        `Got token from auth store: ${token ? "Token exists" : "No token"}`,
      );

      if (!token) {
        console.error("Cannot accept call: No authentication token");
        toast.error("Bạn cần đăng nhập để chấp nhận cuộc gọi");
        onClose();
        return;
      }

      // Make the API call first to ensure the backend knows the call is accepted
      console.log(`Calling acceptCall with callId=${callId}`);
      const result = await acceptCall(callId, token);
      console.log("Call acceptance result:", result);

      if (result.success) {
        // Use the call URL from the API response if available, otherwise determine it locally
        const callUrl =
          result.callUrl ||
          (type === "VIDEO" ? `/video-call/${roomId}` : `/call/${roomId}`);
        console.log(`Redirecting to call page: ${callUrl}`);

        // Then dispatch the accepted event to notify the initiator
        // Include additional information to help synchronize both sides
        console.log(
          "Dispatching call:accepted custom event with roomId and callUrl",
        );
        window.dispatchEvent(
          new CustomEvent("call:accepted", {
            detail: {
              callId,
              roomId,
              callUrl,
              type: result.type || type,
              acceptedAt: result.acceptedAt || new Date().toISOString(), // Use API timestamp if available
            },
          }),
        );

        // Close the UI before navigation to prevent state updates after unmount
        onClose();

        // Use a short timeout to ensure UI state is updated before navigation
        // Increased timeout to give the initiator time to process the event
        setTimeout(() => {
          // Use window.location for more reliable navigation in this context
          console.log(`Navigating to ${callUrl} using window.location`);
          window.location.href = callUrl;
        }, 500);
      } else {
        console.error("Failed to accept call:", result.message);
        toast.error(result.message || "Không thể kết nối cuộc gọi");

        // Dispatch call ended event to clean up on the initiator side
        window.dispatchEvent(
          new CustomEvent("call:ended", {
            detail: { callId },
          }),
        );

        onClose();
      }
    } catch (error) {
      console.error("Error accepting call:", error);
      toast.error("Đã xảy ra lỗi khi kết nối cuộc gọi");

      // Still try to dispatch event to ensure cleanup
      try {
        window.dispatchEvent(
          new CustomEvent("call:ended", {
            detail: { callId },
          }),
        );
      } catch (e) {
        console.error("Error dispatching call ended event:", e);
      }

      onClose();
    }
  };

  // Handle rejecting the call
  const handleReject = async () => {
    console.log(
      `Rejecting call: callId=${callId}, isProcessing=${isProcessing}`,
    );

    if (!callId) {
      console.error("Cannot reject call: Missing callId");
      return;
    }

    if (isProcessing) {
      console.log(
        "Already processing call rejection, ignoring duplicate click",
      );
      return;
    }

    setIsProcessing(true);
    console.log("Set isProcessing to true");

    try {
      // Get token for API call
      const token = useAuthStore.getState().accessToken;
      console.log(
        `Got token from auth store: ${token ? "Token exists" : "No token"}`,
      );

      if (!token) {
        console.error("Cannot reject call: No authentication token");
        toast.error("Bạn cần đăng nhập để từ chối cuộc gọi");
        onClose();
        return;
      }

      // First dispatch events to ensure the initiator is notified immediately
      // This helps ensure the UI updates even if the API call takes time
      console.log("Dispatching call:rejected custom event");
      window.dispatchEvent(
        new CustomEvent("call:rejected", {
          detail: { callId },
        }),
      );

      // Also dispatch a call:ended event for backward compatibility
      console.log("Dispatching call:ended custom event for compatibility");
      window.dispatchEvent(
        new CustomEvent("call:ended", {
          detail: { callId },
        }),
      );

      // Then make the API call
      console.log(`Calling rejectCall with callId=${callId}`);
      const result = await rejectCall(callId, token);
      console.log("Call rejected result:", result);

      // Close the UI immediately after dispatching events
      // Don't wait for the API call to complete
      onClose();
    } catch (error) {
      console.error("Error rejecting call:", error);
      toast.error("Đã xảy ra lỗi khi từ chối cuộc gọi");

      // Still try to dispatch events to ensure cleanup if they weren't dispatched earlier
      try {
        window.dispatchEvent(
          new CustomEvent("call:rejected", {
            detail: { callId },
          }),
        );
        window.dispatchEvent(
          new CustomEvent("call:ended", {
            detail: { callId },
          }),
        );
      } catch (e) {
        console.error("Error dispatching rejection events:", e);
      }

      onClose();
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-white rounded-lg shadow-lg overflow-hidden w-72 border border-gray-200">
      <div className="bg-blue-500 p-2 text-white flex justify-between items-center">
        <h3 className="text-sm font-medium">
          {type === "VIDEO" ? "Cuộc gọi video đến" : "Cuộc gọi thoại đến"}
        </h3>
        <button
          onClick={handleReject}
          className="text-white hover:text-gray-200"
        >
          ×
        </button>
      </div>

      <div className="p-4 flex items-center">
        <Avatar className="h-12 w-12 mr-4">
          <AvatarImage
            src={caller?.userInfo?.profilePictureUrl || ""}
            alt={caller?.userInfo?.fullName || "Unknown"}
          />
          <AvatarFallback className="text-lg">
            {caller ? getUserInitials(caller) : "?"}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1">
          <p className="font-medium text-gray-900">
            {caller?.userInfo?.fullName || "Người dùng"}
          </p>
          <p className="text-sm text-gray-500">
            {type === "VIDEO" ? "Cuộc gọi video" : "Cuộc gọi thoại"}
          </p>
        </div>
      </div>

      <div className="flex border-t border-gray-200">
        <button
          onClick={handleReject}
          disabled={isProcessing}
          className="flex-1 py-3 bg-gray-100 text-red-500 hover:bg-gray-200 disabled:opacity-50 flex items-center justify-center"
        >
          <PhoneOff className="h-5 w-5 mr-2" />
          Từ chối
        </button>

        <button
          onClick={handleAccept}
          disabled={isProcessing}
          className="flex-1 py-3 bg-green-500 text-white hover:bg-green-600 disabled:opacity-50 flex items-center justify-center"
        >
          <Phone className="h-5 w-5 mr-2" />
          Trả lời
        </button>
      </div>
    </div>
  );
}
