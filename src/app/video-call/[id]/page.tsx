"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getUserDataById } from "@/actions/user.action";
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

  // Khởi tạo camera và kết nối
  useEffect(() => {
    const initCamera = async () => {
      try {
        // Yêu cầu quyền truy cập camera và microphone
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });

        // Lưu stream gốc để có thể dừng nó sau này
        setOriginalVideoStream(stream);
        setLocalStream(stream);

        // Hiển thị video local
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        // Chuyển trạng thái thành connected sau khi khởi tạo camera
        setTimeout(() => {
          setCallStatus("connected");
        }, 2000);
      } catch (error) {
        console.error("Không thể truy cập camera:", error);
        toast.error(
          "Không thể truy cập camera. Vui lòng kiểm tra quyền truy cập camera của trình duyệt.",
        );
        setIsVideoOff(true);

        try {
          // Nếu không thể truy cập camera, thử chỉ truy cập microphone
          const audioOnlyStream = await navigator.mediaDevices.getUserMedia({
            video: false,
            audio: true,
          });
          setLocalStream(audioOnlyStream);
        } catch (audioError) {
          console.error("Không thể truy cập microphone:", audioError);
        }

        // Vẫn chuyển trạng thái thành connected sau khi thất bại
        setTimeout(() => {
          setCallStatus("connected");
        }, 2000);
      }
    };

    initCamera();

    // Cleanup khi component unmount
    return () => {
      if (localStream) {
        localStream.getTracks().forEach((track) => {
          track.stop();
        });
      }
    };
  }, []);

  // Format call duration as mm:ss
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleEndCall = () => {
    setCallStatus("ended");

    // Dừng tất cả các track của stream chính
    if (localStream) {
      localStream.getTracks().forEach((track) => {
        track.stop();
      });
    }

    // Dừng stream video gốc nếu có
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
  };

  const toggleMute = () => {
    const newMuteState = !isMuted;

    if (localStream) {
      const audioTracks = localStream.getAudioTracks();
      audioTracks.forEach((track) => {
        // Đảo ngược trạng thái: nếu đang tắt (isMuted=true) thì bật lên (enabled=true)
        track.enabled = !newMuteState;
      });
    }

    setIsMuted(newMuteState);
    toast.info(newMuteState ? "Đã tắt micrô" : "Đã bật micrô");
  };

  const toggleVideo = async () => {
    // We want to toggle the current state
    // If isVideoOff is true, we want to turn the camera ON
    // If isVideoOff is false, we want to turn the camera OFF
    const willTurnCameraOff = !isVideoOff;

    if (localStream) {
      if (!willTurnCameraOff) {
        // Turn camera ON (isVideoOff will become false)
        try {
          // Tạo stream mới chỉ với video
          const newVideoStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });

          // Lấy video track từ stream mới
          const newVideoTrack = newVideoStream.getVideoTracks()[0];

          // Thêm video track vào stream hiện tại
          localStream.addTrack(newVideoTrack);

          // Cập nhật video element
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = localStream;
          }

          // Lưu stream video để có thể dừng sau này
          setOriginalVideoStream(newVideoStream);
        } catch (error) {
          console.error("Không thể bật lại camera:", error);
          toast.error("Không thể bật lại camera. Vui lòng thử lại.");
          return; // Giữ nguyên trạng thái nếu không thể bật lại camera
        }
      } else {
        // Turn camera OFF (isVideoOff will become true)
        const videoTracks = localStream.getVideoTracks();
        videoTracks.forEach((track) => {
          localStream.removeTrack(track);
          track.stop(); // Dừng hoàn toàn track (tắt đèn camera)
        });

        // Nếu có stream video gốc, dừng tất cả các track
        if (originalVideoStream) {
          originalVideoStream.getTracks().forEach((track) => {
            track.stop();
          });
        }
      }
    }

    // Update the state to reflect the new camera state
    setIsVideoOff(willTurnCameraOff);

    // Show the appropriate toast message
    toast.info(willTurnCameraOff ? "Đã tắt camera" : "Đã bật camera");
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
                {/* Trong trường hợp thực tế, đây sẽ là video stream của người nhận cuộc gọi */}
                {/* Hiện tại chúng ta chỉ hiển thị màu nền và avatar */}
                <div className="w-full h-full bg-gradient-to-b from-gray-800 to-gray-900 flex items-center justify-center">
                  <Avatar className="h-32 w-32">
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
