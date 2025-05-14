"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getUserDataById } from "@/actions/user.action";
import { endCall as endCallAction } from "@/actions/call.action";
import { getUserInitials } from "@/utils/userUtils";
import { Phone, Mic, MicOff } from "lucide-react";
import { toast } from "sonner";
import { use } from "react";

export default function CallPage({ params }: { params: { id: string } }) {
  // Unwrap params using React.use()
  // @ts-ignore - Bỏ qua lỗi TypeScript với use()
  const unwrappedParams = use(params);
  // @ts-ignore - Bỏ qua lỗi TypeScript với unwrappedParams
  const userId = unwrappedParams.id;

  const [user, setUser] = useState<any>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [callStatus, setCallStatus] = useState<
    "connecting" | "connected" | "ended"
  >("connecting");
  const [callDuration, setCallDuration] = useState(0);

  // Fetch user data
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const result = await getUserDataById(userId);
        if (result.success && result.user) {
          setUser(result.user);
          document.title = `Cuộc gọi với ${result.user.userInfo?.fullName || "Người dùng"}`;
        } else {
          toast.error("Không thể tải thông tin người dùng");
          setTimeout(() => {
            window.close();
          }, 2000);
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
        toast.error("Đã xảy ra lỗi khi tải thông tin người dùng");
        setTimeout(() => {
          window.close();
        }, 2000);
      }
    };

    fetchUserData();
  }, [userId]);

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

  // Initialize WebRTC connection
  useEffect(() => {
    if (!userId) return;

    const initWebRTC = async () => {
      try {
        // Import dynamically to avoid SSR issues
        const { initializeWebRTC } = await import("@/utils/webrtcUtils");

        // Initialize WebRTC with audio only
        console.log(`Initializing WebRTC for room ${userId} with audio only`);
        await initializeWebRTC(userId, false);

        // Update call status
        setCallStatus("connected");
        console.log("WebRTC connection established successfully");
      } catch (error) {
        console.error("Error initializing WebRTC:", error);
        toast.error("Không thể kết nối cuộc gọi");

        // Still set to connected to allow the user to see the UI
        setCallStatus("connected");
      }
    };

    // Check if this is a response to an incoming call
    const checkIncomingCall = async () => {
      try {
        // Get active call information
        const { getActiveCall } = await import("@/actions/call.action");
        const { useAuthStore } = await import("@/stores/authStore");
        const token = useAuthStore.getState().accessToken;

        if (!token) {
          console.warn("No token available to check active call");
          initWebRTC();
          return;
        }

        const activeCallResult = await getActiveCall(token);

        if (activeCallResult.success && activeCallResult.activeCall) {
          console.log("Active call found:", activeCallResult.activeCall);
          // We have an active call, proceed with WebRTC initialization
          initWebRTC();
        } else {
          console.log("No active call found, but continuing anyway");
          initWebRTC();
        }
      } catch (error) {
        console.error("Error checking active call:", error);
        // Continue with WebRTC initialization anyway
        initWebRTC();
      }
    };

    checkIncomingCall();

    // Set up event listeners for remote streams (audio only)
    const handleRemoteStream = (event: any) => {
      const { id, stream, kind } = event.detail;
      console.log(`Remote stream added: ${id}, kind: ${kind}`);

      // For audio calls, we just need to create an audio element
      if (kind === "audio") {
        // Check if we already have an audio element for this stream
        let audioElement = document.getElementById(
          `remote-audio-${id}`,
        ) as HTMLAudioElement;

        if (!audioElement) {
          // Create a new audio element
          audioElement = document.createElement("audio");
          audioElement.id = `remote-audio-${id}`;
          audioElement.autoplay = true;
          audioElement.style.display = "none"; // Hide the audio element
          document.body.appendChild(audioElement);
        }

        // Set the stream as the source
        audioElement.srcObject = stream;
      }
    };

    const handleRemoteStreamRemoved = (event: any) => {
      const { id } = event.detail;
      console.log(`Remote stream removed: ${id}`);

      // Remove the audio element
      const audioElement = document.getElementById(`remote-audio-${id}`);
      if (audioElement) {
        audioElement.remove();
      }
    };

    window.addEventListener("call:remoteStreamAdded", handleRemoteStream);
    window.addEventListener(
      "call:remoteStreamRemoved",
      handleRemoteStreamRemoved,
    );

    // Cleanup when component unmounts
    return () => {
      window.removeEventListener("call:remoteStreamAdded", handleRemoteStream);
      window.removeEventListener(
        "call:remoteStreamRemoved",
        handleRemoteStreamRemoved,
      );
    };
  }, [userId]);

  // Format call duration as mm:ss
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleEndCall = async () => {
    try {
      // Import dynamically to avoid SSR issues
      const { endCall } = await import("@/utils/webrtcUtils");
      const { useAuthStore } = await import("@/stores/authStore");

      // Get token for API call
      const token = useAuthStore.getState().accessToken;

      // End the WebRTC call
      endCall();

      // Also notify the server that the call has ended
      if (user?.id && token) {
        await endCallAction(user.id, token);
      }

      setCallStatus("ended");
      toast.info(
        `Cuộc gọi với ${user?.userInfo?.fullName || "người dùng"} đã kết thúc`,
      );
      setTimeout(() => {
        window.close();
      }, 1000);
    } catch (error) {
      console.error("Error ending call:", error);
      window.close();
    }
  };

  const toggleMute = async () => {
    try {
      // Import dynamically to avoid SSR issues
      const { toggleMute: toggleMuteUtil } = await import(
        "@/utils/webrtcUtils"
      );

      // Toggle mute state
      const newMuteState = await toggleMuteUtil();
      setIsMuted(newMuteState);

      toast.info(newMuteState ? "Đã tắt micrô" : "Đã bật micrô");
    } catch (error) {
      console.error("Error toggling mute:", error);

      // Fallback to local state toggle
      setIsMuted(!isMuted);
      toast.info(!isMuted ? "Đã tắt micrô" : "Đã bật micrô");
    }
  };

  // Handle window close event
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (callStatus === "connected") {
        // Cách hiện đại để xử lý sự kiện beforeunload
        e.preventDefault();
        // Phương pháp hiện đại - không sử dụng returnValue đã bị deprecated
        return "Bạn có chắc chắn muốn kết thúc cuộc gọi?";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [callStatus]);

  return (
    <div className="flex flex-col items-center justify-between h-screen bg-gray-100">
      {/* Header with user info */}
      <div className="w-full bg-white p-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center">
          <span className="text-lg font-semibold">
            {user?.userInfo?.fullName || "Người dùng"}
          </span>
        </div>
        <div className="text-sm text-gray-500">
          {callStatus === "connecting"
            ? "Đang kết nối..."
            : callStatus === "connected"
              ? formatDuration(callDuration)
              : "Cuộc gọi đã kết thúc"}
        </div>
      </div>

      {/* Main content with avatar */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 w-full">
        <Avatar className="h-32 w-32 mb-6">
          <AvatarImage
            src={user?.userInfo?.profilePictureUrl || undefined}
            className="object-cover"
          />
          <AvatarFallback className="text-4xl">
            {getUserInitials(user)}
          </AvatarFallback>
        </Avatar>

        <h2 className="text-xl font-semibold mb-2">
          {user?.userInfo?.fullName || "Người dùng"}
        </h2>

        <p className="text-gray-500 mb-8">
          {callStatus === "connecting"
            ? "Đang gọi..."
            : callStatus === "connected"
              ? "Đang trong cuộc gọi"
              : "Cuộc gọi đã kết thúc"}
        </p>
      </div>

      {/* Call controls */}
      <div className="w-full bg-white p-6 flex items-center justify-center gap-6 shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
        <Button
          onClick={toggleMute}
          variant="ghost"
          size="icon"
          className={`rounded-full p-3 h-14 w-14 ${isMuted ? "bg-gray-200" : "bg-gray-100"}`}
        >
          {isMuted ? (
            <MicOff className="h-6 w-6" />
          ) : (
            <Mic className="h-6 w-6" />
          )}
        </Button>

        <Button
          onClick={handleEndCall}
          variant="destructive"
          size="icon"
          className="rounded-full p-3 h-16 w-16 bg-red-500 hover:bg-red-600"
        >
          <Phone className="h-8 w-8 rotate-135" />
        </Button>
      </div>
    </div>
  );
}
