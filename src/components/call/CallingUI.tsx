"use client";

import { useState, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Phone, PhoneOff, Loader2 } from "lucide-react";
import { getUserInitials } from "@/utils/userUtils";
import { User, Group } from "@/types/base";
import { fetchUserById } from "@/actions/user";
import { toast } from "sonner";
import { playCallDialTone, stopAudio } from "@/utils/audioUtils";
import { useCallStore } from "@/stores/callStore";

interface CallingUIProps {
  callData: {
    callId: string;
    targetId: string;
    targetType: "USER" | "GROUP";
    type: "AUDIO" | "VIDEO";
  };
  token: string;
  onCallAccepted: () => void;
  onCallEnded: () => void;
}

export default function CallingUI({
  callData,
  token,
  onCallAccepted,
  onCallEnded,
}: CallingUIProps) {
  const [target, setTarget] = useState<User | Group | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const { callId, targetId, targetType, type } = callData;

  // Play dial tone
  useEffect(() => {
    console.log("Starting call dial tone in CallingUI");
    let audio: HTMLAudioElement | null = null;

    try {
      audio = playCallDialTone(0.5);

      // Add event listeners to debug audio issues
      audio.addEventListener("play", () => {
        console.log("Call dial tone started playing in CallingUI");
      });

      audio.addEventListener("error", (e) => {
        console.error("Error playing call dial tone in CallingUI:", e);
      });

      audio.addEventListener("pause", () => {
        console.log("Call dial tone paused in CallingUI");
      });
    } catch (error) {
      console.error(
        "Exception when trying to play dial tone in CallingUI:",
        error,
      );
    }

    return () => {
      console.log("Cleaning up call dial tone in CallingUI");
      if (audio) {
        try {
          stopAudio(audio);
        } catch (error) {
          console.error("Error stopping audio in CallingUI:", error);
        }
      }
    };
  }, []);

  // Fetch target information
  useEffect(() => {
    const getTarget = async () => {
      if (!targetId) return;

      try {
        if (targetType === "USER") {
          const userData = await fetchUserById(targetId);
          if (userData) {
            setTarget(userData);
          }
        } else {
          // For groups, we would fetch group data here
          // const groupData = await fetchGroupById(targetId);
          // setTarget(groupData);
        }
      } catch (error) {
        console.error("Error fetching target information:", error);
      }
    };

    getTarget();
  }, [targetId, targetType]);

  // Set up event listeners for call accepted/rejected
  useEffect(() => {
    console.log(`Setting up call event listeners for callId=${callId}`);

    const handleCallAccepted = (event: Event) => {
      const customEvent = event as CustomEvent;
      const data = customEvent.detail;

      console.log(`Received call:accepted event with data:`, data);

      if (data.callId === callId) {
        console.log(
          `Call accepted matches our callId=${callId}, calling onCallAccepted`,
        );
        onCallAccepted();
      } else {
        console.log(
          `Call accepted event for different call (${data.callId}), ignoring`,
        );
      }
    };

    const handleCallRejected = (event: Event) => {
      const customEvent = event as CustomEvent;
      const data = customEvent.detail;

      console.log(`Received call:rejected event with data:`, data);

      if (data.callId === callId) {
        console.log(
          `Call rejected matches our callId=${callId}, calling onCallEnded`,
        );
        onCallEnded();
      } else {
        console.log(
          `Call rejected event for different call (${data.callId}), ignoring`,
        );
      }
    };

    const handleCallEnded = (event: Event) => {
      const customEvent = event as CustomEvent;
      const data = customEvent.detail;

      console.log(`Received call:ended event with data:`, data);

      if (data.callId === callId) {
        console.log(
          `Call ended matches our callId=${callId}, calling onCallEnded`,
        );
        onCallEnded();
      } else {
        console.log(
          `Call ended event for different call (${data.callId}), ignoring`,
        );
      }
    };

    console.log("Adding event listeners for call events");
    window.addEventListener(
      "call:accepted",
      handleCallAccepted as EventListener,
    );
    window.addEventListener(
      "call:rejected",
      handleCallRejected as EventListener,
    );
    window.addEventListener("call:ended", handleCallEnded as EventListener);

    return () => {
      console.log("Removing event listeners for call events");
      window.removeEventListener(
        "call:accepted",
        handleCallAccepted as EventListener,
      );
      window.removeEventListener(
        "call:rejected",
        handleCallRejected as EventListener,
      );
      window.removeEventListener(
        "call:ended",
        handleCallEnded as EventListener,
      );
    };
  }, [callId, onCallAccepted, onCallEnded]);

  // Handle canceling the call
  const handleCancel = async () => {
    console.log(
      `Canceling call: callId=${callId}, isProcessing=${isProcessing}`,
    );

    if (isProcessing) {
      console.log(
        "Already processing call cancellation, ignoring duplicate click",
      );
      return;
    }

    setIsProcessing(true);
    console.log("Set isProcessing to true");

    try {
      console.log(`Calling endCall with callId=${callId}`);

      // Set current call in store before ending it
      useCallStore.getState().resetCallState();
      useCallStore.setState({
        currentCall: {
          id: callId,
          roomId: "",
          type: type,
          targetId: targetId,
          targetType: targetType,
        },
      });

      // End the call using store
      await useCallStore.getState().endCall();
      console.log("Call ended successfully");

      onCallEnded();
    } catch (error) {
      console.error("Error ending call:", error);
      toast.error("Đã xảy ra lỗi khi kết thúc cuộc gọi");
      onCallEnded();
    }
  };

  // Get display name based on target type
  const getDisplayName = () => {
    if (!target) return "Đang kết nối...";

    if (targetType === "USER") {
      return (target as User).userInfo?.fullName || "Người dùng";
    } else {
      return (target as Group).name || "Nhóm";
    }
  };

  // Get avatar URL based on target type
  const getAvatarUrl = () => {
    if (!target) return "";

    if (targetType === "USER") {
      return (target as User).userInfo?.profilePictureUrl || "";
    } else {
      return (target as Group).avatarUrl || "";
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg overflow-hidden w-96 max-w-full shadow-xl">
        <div className="bg-blue-500 p-4 text-center text-white">
          <h2 className="text-xl font-semibold">
            {type === "VIDEO" ? "Cuộc gọi video" : "Cuộc gọi thoại"}
          </h2>
        </div>

        <div className="p-8 flex flex-col items-center">
          <Avatar className="h-32 w-32 mb-6">
            <AvatarImage src={getAvatarUrl()} alt={getDisplayName()} />
            <AvatarFallback className="text-4xl">
              {target
                ? targetType === "USER"
                  ? getUserInitials(target as User)
                  : (target as Group).name?.substring(0, 2) || "G"
                : "?"}
            </AvatarFallback>
          </Avatar>

          <h3 className="text-2xl font-bold mb-2">{getDisplayName()}</h3>

          <div className="flex items-center text-gray-500 mb-8">
            <Loader2 className="h-5 w-5 mr-2 animate-spin" />
            <span>Đang gọi...</span>
          </div>

          <button
            onClick={handleCancel}
            disabled={isProcessing}
            className="w-16 h-16 rounded-full bg-red-600 flex items-center justify-center disabled:opacity-70"
            aria-label="Kết thúc cuộc gọi"
          >
            <PhoneOff className="text-white h-7 w-7" />
          </button>
        </div>
      </div>
    </div>
  );
}
