"use client";

import { useState, useEffect, use } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Phone, PhoneOff, Loader2 } from "lucide-react";
import { getUserInitials } from "@/utils/userUtils";
import { playCallDialTone, stopAudio } from "@/utils/audioUtils";
import { User, Group } from "@/types/base";
import { fetchUserById } from "@/actions/user";
import { getGroupById } from "@/actions/group.action";
import { toast } from "sonner";
import { useAuthStore } from "@/stores/authStore";
import { useCallStore } from "@/stores/callStore";

export default function CallWaitingRoom({
  params,
}: {
  params: { id: string };
}) {
  // Unwrap params using React.use()
  const unwrappedParams = use(params);
  const callId = unwrappedParams.id;

  const router = useRouter();
  const searchParams = useSearchParams();
  const roomId = searchParams.get("roomId");
  const targetId = searchParams.get("targetId") || searchParams.get("groupId");
  const targetType = searchParams.get("targetId") ? "USER" : "GROUP";
  const callType = searchParams.get("type") as "AUDIO" | "VIDEO";

  const [target, setTarget] = useState<User | Group | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [callStatus, setCallStatus] = useState<
    "waiting" | "accepted" | "rejected" | "ended"
  >("waiting");
  const { accessToken } = useAuthStore();

  // Play dial tone
  useEffect(() => {
    console.log("Starting call dial tone");
    let audio: HTMLAudioElement | null = null;

    try {
      audio = playCallDialTone(0.5);

      // Add event listeners to debug audio issues
      audio.addEventListener("play", () => {
        console.log("Call dial tone started playing");
      });

      audio.addEventListener("error", (e) => {
        console.error("Error playing call dial tone:", e);
      });

      audio.addEventListener("pause", () => {
        console.log("Call dial tone paused");
      });
    } catch (error) {
      console.error("Exception when trying to play dial tone:", error);
    }

    return () => {
      console.log("Cleaning up call dial tone");
      if (audio) {
        try {
          stopAudio(audio);
        } catch (error) {
          console.error("Error stopping audio:", error);
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
          console.log(
            `Fetching user data for targetId: ${targetId} with token: ${accessToken ? "exists" : "missing"}`,
          );

          if (!accessToken) {
            console.warn("Cannot fetch user data: No access token available");
            return;
          }

          // Pass the token explicitly to fetchUserById
          const userData = await fetchUserById(targetId, accessToken);
          console.log("User data fetched:", userData);

          if (userData) {
            setTarget(userData);
          }
        } else {
          console.log(`Fetching group data for groupId: ${targetId}`);

          if (!accessToken) {
            console.warn("Cannot fetch group data: No access token available");
            return;
          }

          const result = await getGroupById(targetId, accessToken);
          console.log("Group data fetched:", result);

          if (result.success && result.group) {
            setTarget(result.group);
          }
        }
      } catch (error) {
        console.error("Error fetching target information:", error);
        // Don't log out here, just show a placeholder
      }
    };

    if (accessToken) {
      getTarget();
    } else {
      console.warn("Skipping target fetch due to missing access token");
    }
  }, [targetId, targetType, accessToken]);

  // Set up event listeners for call accepted/rejected
  useEffect(() => {
    console.log(`Setting up call event listeners for callId=${callId}`);

    const handleCallAccepted = (event: Event) => {
      const customEvent = event as CustomEvent;
      const data = customEvent.detail;

      console.log(`Received call:accepted event with data:`, data);

      if (data.callId === callId) {
        console.log(`Call accepted matches our callId=${callId}`);
        setCallStatus("accepted");

        // Redirect to the actual call page
        const callUrl =
          callType === "VIDEO" ? `/video-call/${roomId}` : `/call/${roomId}`;

        router.push(callUrl);
      }
    };

    const handleCallRejected = (event: Event) => {
      const customEvent = event as CustomEvent;
      const data = customEvent.detail;

      console.log(`Received call:rejected event with data:`, data);

      if (data.callId === callId) {
        console.log(`Call rejected matches our callId=${callId}`);
        setCallStatus("rejected");
        toast.error("Cuộc gọi đã bị từ chối");

        // Close window after a short delay
        setTimeout(() => {
          window.close();
        }, 2000);
      }
    };

    const handleCallEnded = (event: Event) => {
      const customEvent = event as CustomEvent;
      const data = customEvent.detail;

      console.log(`Received call:ended event with data:`, data);

      if (data.callId === callId) {
        console.log(`Call ended matches our callId=${callId}`);
        setCallStatus("ended");
        toast.info("Cuộc gọi đã kết thúc");

        // Close window after a short delay
        setTimeout(() => {
          window.close();
        }, 2000);
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
  }, [callId, roomId, callType, router]);

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
          roomId: roomId || "",
          type: callType,
          targetId: targetId || "",
          targetType: targetType as "USER" | "GROUP",
        },
      });

      // End the call using store
      const success = await useCallStore.getState().endCall();

      if (success) {
        console.log("Call ended successfully");
      } else {
        console.error("Failed to end call");
      }

      setCallStatus("ended");

      // Close window after a short delay
      setTimeout(() => {
        window.close();
      }, 1000);
    } catch (error) {
      console.error("Error ending call:", error);
      toast.error("Đã xảy ra lỗi khi kết thúc cuộc gọi");

      // Still close the window
      setTimeout(() => {
        window.close();
      }, 1000);
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
    <div className="fixed inset-0 bg-white flex flex-col items-center justify-center">
      <div className="bg-white rounded-lg overflow-hidden w-full max-w-md shadow-xl">
        <div className="bg-blue-500 p-4 text-center text-white">
          <h2 className="text-xl font-semibold">
            {callType === "VIDEO" ? "Cuộc gọi video" : "Cuộc gọi thoại"}
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
            disabled={isProcessing || callStatus !== "waiting"}
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
