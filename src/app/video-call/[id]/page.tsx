"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getUserDataById } from "@/actions/user.action";
import { endCall as endCallAction } from "@/actions/call.action";
import { getUserInitials } from "@/utils/userUtils";
import { Phone, Video, VideoOff, Mic, MicOff, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { use } from "react";

export default function VideoCallPage({ params }: { params: { id: string } }) {
  // Unwrap params using React.use()
  // @ts-ignore - Bỏ qua lỗi TypeScript với use()
  const unwrappedParams = use(params);
  // @ts-ignore - Bỏ qua lỗi TypeScript với unwrappedParams
  const userId = unwrappedParams.id;

  const [user, setUser] = useState<any>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [callStatus, setCallStatus] = useState<
    "connecting" | "connected" | "ended"
  >("connecting");
  const [callDuration, setCallDuration] = useState(0);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [originalVideoStream, setOriginalVideoStream] =
    useState<MediaStream | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);

  // Fetch user data
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const result = await getUserDataById(userId);
        if (result.success && result.user) {
          setUser(result.user);
          document.title = `Cuộc gọi video với ${result.user.userInfo?.fullName || "Người dùng"}`;
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

        // Initialize WebRTC with video
        console.log(`Initializing WebRTC for room ${userId} with video`);
        const stream = await initializeWebRTC(userId, true);

        // Save the stream
        setLocalStream(stream);
        setOriginalVideoStream(stream);

        // Display local video
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        // Update call status
        setCallStatus("connected");
        console.log("WebRTC connection established successfully");
      } catch (error) {
        console.error("Error initializing WebRTC:", error);
        toast.error("Không thể kết nối cuộc gọi video");
        setIsVideoOff(true);

        try {
          // Try audio only if video fails
          console.log("Attempting audio-only fallback");
          const { initializeWebRTC } = await import("@/utils/webrtcUtils");
          const audioStream = await initializeWebRTC(userId, false);
          setLocalStream(audioStream);
          console.log("Audio-only connection established");
        } catch (audioError) {
          console.error("Error initializing audio-only WebRTC:", audioError);
        }

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

    // Set up event listeners for remote streams
    const handleRemoteStream = (event: any) => {
      const { id, stream, kind } = event.detail;
      console.log(`Remote stream added: ${id}, kind: ${kind}`);

      // Create or get the remote video element
      const remoteVideoContainer = document.getElementById(
        "remote-video-container",
      );
      if (!remoteVideoContainer) return;

      // Hide the avatar when we get a video stream
      if (kind === "video") {
        const avatars = remoteVideoContainer.querySelectorAll(
          ".remote-user-avatar",
        );
        avatars.forEach((avatar) => {
          (avatar as HTMLElement).style.display = "none";
        });
      }

      // Check if we already have a video element for this stream
      let videoElement = document.getElementById(
        `remote-video-${id}`,
      ) as HTMLVideoElement;

      if (!videoElement) {
        // Create a new video element
        videoElement = document.createElement("video");
        videoElement.id = `remote-video-${id}`;
        videoElement.autoplay = true;
        videoElement.playsInline = true;
        videoElement.className = "w-full h-full object-cover";
        remoteVideoContainer.appendChild(videoElement);
      }

      // Set the stream as the source
      videoElement.srcObject = stream;
    };

    const handleRemoteStreamRemoved = (event: any) => {
      const { id } = event.detail;
      console.log(`Remote stream removed: ${id}`);

      // Remove the video element
      const videoElement = document.getElementById(`remote-video-${id}`);
      if (videoElement) {
        videoElement.remove();
      }

      // Show the avatar again if no video streams are left
      const remoteVideoContainer = document.getElementById(
        "remote-video-container",
      );
      if (remoteVideoContainer) {
        const videoElements = remoteVideoContainer.querySelectorAll("video");
        if (videoElements.length === 0) {
          const avatars = remoteVideoContainer.querySelectorAll(
            ".remote-user-avatar",
          );
          avatars.forEach((avatar) => {
            (avatar as HTMLElement).style.display = "block";
          });
        }
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

      if (localStream) {
        localStream.getTracks().forEach((track) => {
          track.stop();
        });
      }
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

      // Stop all tracks of the main stream
      if (localStream) {
        localStream.getTracks().forEach((track) => {
          track.stop();
        });
      }

      // Stop the original video stream if it exists
      if (originalVideoStream) {
        originalVideoStream.getTracks().forEach((track) => {
          track.stop();
        });
      }

      toast.info(
        `Cuộc gọi video với ${user?.userInfo?.fullName || "người dùng"} đã kết thúc`,
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

      // Fallback to local implementation
      const newMuteState = !isMuted;

      if (localStream) {
        const audioTracks = localStream.getAudioTracks();
        audioTracks.forEach((track) => {
          track.enabled = !newMuteState;
        });
      }

      setIsMuted(newMuteState);
      toast.info(newMuteState ? "Đã tắt micrô" : "Đã bật micrô");
    }
  };

  const toggleVideo = async () => {
    try {
      // Import dynamically to avoid SSR issues
      const { toggleCamera } = await import("@/utils/webrtcUtils");

      // Toggle camera state
      const isOff = await toggleCamera();
      setIsVideoOff(isOff);

      toast.info(isOff ? "Đã tắt camera" : "Đã bật camera");
    } catch (error) {
      console.error("Error toggling camera:", error);

      // Fallback to local implementation
      const willTurnCameraOff = !isVideoOff;

      if (localStream) {
        if (!willTurnCameraOff) {
          // Turn camera ON
          try {
            const newVideoStream = await navigator.mediaDevices.getUserMedia({
              video: true,
              audio: false,
            });

            const newVideoTrack = newVideoStream.getVideoTracks()[0];
            localStream.addTrack(newVideoTrack);

            if (localVideoRef.current) {
              localVideoRef.current.srcObject = localStream;
            }

            setOriginalVideoStream(newVideoStream);
          } catch (error) {
            console.error("Không thể bật lại camera:", error);
            toast.error("Không thể bật lại camera. Vui lòng thử lại.");
            return;
          }
        } else {
          // Turn camera OFF
          const videoTracks = localStream.getVideoTracks();
          videoTracks.forEach((track) => {
            localStream.removeTrack(track);
            track.stop();
          });

          if (originalVideoStream) {
            originalVideoStream.getTracks().forEach((track) => {
              track.stop();
            });
          }
        }
      }

      setIsVideoOff(willTurnCameraOff);
      toast.info(willTurnCameraOff ? "Đã tắt camera" : "Đã bật camera");
    }
  };

  // Handle window close event
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (callStatus === "connected") {
        // Cách hiện đại để xử lý sự kiện beforeunload
        e.preventDefault();
        // Đặt một thông báo chung (nhiều trình duyệt hiện đại không hiển thị thông báo tùy chỉnh)
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
    <div className="flex flex-col h-screen bg-black">
      {/* Header with user info */}
      <div className="w-full bg-black p-4 flex items-center justify-between">
        <div className="flex items-center">
          <span className="text-lg font-semibold text-white">
            {user?.userInfo?.fullName || "Người dùng"}
          </span>
        </div>
        <div className="text-sm text-gray-400">
          {callStatus === "connecting"
            ? "Đang kết nối..."
            : callStatus === "connected"
              ? formatDuration(callDuration)
              : "Cuộc gọi đã kết thúc"}
        </div>
      </div>

      {/* Main content with video */}
      <div className="flex-1 flex flex-col items-center justify-center w-full relative">
        {/* Remote video (or avatar if video is off) */}
        <div className="w-full h-full flex items-center justify-center bg-gray-900">
          {callStatus === "connecting" ? (
            <div className="flex flex-col items-center justify-center">
              <Avatar className="h-32 w-32 mb-6">
                <AvatarImage
                  src={user?.userInfo?.profilePictureUrl || undefined}
                  className="object-cover"
                />
                <AvatarFallback className="text-4xl">
                  {getUserInitials(user)}
                </AvatarFallback>
              </Avatar>
              <div className="flex items-center text-white gap-2">
                <RotateCcw className="h-4 w-4 animate-spin" />
                <span>Đang kết nối...</span>
              </div>
            </div>
          ) : (
            <>
              {/* Hiển thị video của người dùng */}
              <div className="w-full h-full">
                {/* Video stream của người nhận cuộc gọi */}
                <div
                  id="remote-video-container"
                  className="w-full h-full bg-gradient-to-b from-gray-800 to-gray-900 flex items-center justify-center"
                >
                  {/* Video element sẽ được thêm vào đây bằng JavaScript */}
                  <Avatar className="h-32 w-32 remote-user-avatar">
                    <AvatarImage
                      src={user?.userInfo?.profilePictureUrl || undefined}
                      className="object-cover"
                    />
                    <AvatarFallback className="text-4xl">
                      {getUserInitials(user)}
                    </AvatarFallback>
                  </Avatar>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Local video (small overlay) */}
        <div className="absolute bottom-4 right-4 w-48 h-36 bg-gray-800 rounded-lg overflow-hidden border-2 border-white">
          {/* Luôn hiển thị video element, nhưng ẩn nó khi video bị tắt */}
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover ${isVideoOff ? "hidden" : ""}`}
          />

          {/* Hiển thị icon khi video bị tắt */}
          {isVideoOff && (
            <div className="w-full h-full flex items-center justify-center bg-gray-700">
              <Video className="h-6 w-6 text-gray-400" />
            </div>
          )}
        </div>
      </div>

      {/* Call controls */}
      <div className="w-full bg-black p-6 flex items-center justify-center gap-6">
        <Button
          onClick={toggleMute}
          variant="ghost"
          size="icon"
          className={`rounded-full p-3 h-14 w-14 ${isMuted ? "bg-gray-700" : "bg-gray-800"}`}
        >
          {isMuted ? (
            <MicOff className="h-6 w-6 text-white" />
          ) : (
            <Mic className="h-6 w-6 text-white" />
          )}
        </Button>

        <Button
          onClick={toggleVideo}
          variant="ghost"
          size="icon"
          className={`rounded-full p-3 h-14 w-14 ${isVideoOff ? "bg-gray-700" : "bg-gray-800"}`}
        >
          {isVideoOff ? (
            <VideoOff className="h-6 w-6 text-white" />
          ) : (
            <Video className="h-6 w-6 text-white" />
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
