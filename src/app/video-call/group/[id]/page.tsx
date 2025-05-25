"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getGroupById } from "@/actions/group.action";
import {
  Phone,
  Video,
  VideoOff,
  Mic,
  MicOff,
  RotateCcw,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { use } from "react";
import { Group } from "@/types/base";

// Define call status type
type CallStatus = "connecting" | "connected" | "ended" | "error";

// Define media stream state type
interface MediaStreamState {
  stream: MediaStream | null;
  originalStream: MediaStream | null;
}

export default function GroupVideoCallPage({
  params,
}: {
  params: { id: string };
}) {
  // Unwrap params at the top level of the component
  const unwrappedParams = use(params as any) as { id: string };
  const groupId = unwrappedParams.id;

  const [group, setGroup] = useState<Group | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [callStatus, setCallStatus] = useState<CallStatus>("connecting");
  const [callDuration, setCallDuration] = useState(0);
  const [mediaState, setMediaState] = useState<MediaStreamState>({
    stream: null,
    originalStream: null,
  });
  const [isLoading, setIsLoading] = useState(true);
  const localVideoRef = useRef<HTMLVideoElement>(null);

  // Fetch group data
  useEffect(() => {
    const fetchGroupData = async () => {
      try {
        setIsLoading(true);
        const result = await getGroupById(groupId);
        if (result.success && result.group) {
          setGroup(result.group);
          document.title = `Cuộc gọi video nhóm ${result.group.name || "Nhóm chat"}`;
        } else {
          toast.error("Không thể tải thông tin nhóm");
          setCallStatus("error");
          setTimeout(() => {
            window.close();
          }, 2000);
        }
      } catch (error) {
        console.error("Error fetching group data:", error);
        toast.error("Đã xảy ra lỗi khi tải thông tin nhóm");
        setCallStatus("error");
        setTimeout(() => {
          window.close();
        }, 2000);
      } finally {
        setIsLoading(false);
      }
    };

    fetchGroupData();
  }, [groupId]);

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

  // Initialize camera and connection
  useEffect(() => {
    const initCamera = async () => {
      try {
        // Request camera and microphone access
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });

        // Store original stream for cleanup
        setMediaState({
          stream,
          originalStream: stream,
        });

        // Display local video
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        // Change status to connected after camera initialization
        setTimeout(() => {
          setCallStatus("connected");
        }, 2000);
      } catch (error) {
        console.error("Cannot access camera:", error);
        toast.error(
          "Không thể truy cập camera. Vui lòng kiểm tra quyền truy cập camera của trình duyệt.",
        );
        setIsVideoOff(true);

        try {
          // If camera access fails, try audio only
          const audioOnlyStream = await navigator.mediaDevices.getUserMedia({
            video: false,
            audio: true,
          });
          setMediaState({
            stream: audioOnlyStream,
            originalStream: audioOnlyStream,
          });
        } catch (audioError) {
          console.error("Cannot access microphone:", audioError);
          setCallStatus("error");
          toast.error(
            "Không thể truy cập microphone. Vui lòng kiểm tra quyền truy cập.",
          );
        }

        // Still change status to connected after failure
        setTimeout(() => {
          setCallStatus("connected");
        }, 2000);
      }
    };

    initCamera();

    // Cleanup when component unmounts
    return () => {
      const cleanupStream = (stream: MediaStream | null) => {
        if (stream) {
          stream.getTracks().forEach((track) => {
            track.stop();
          });
        }
      };

      cleanupStream(mediaState.stream);
      cleanupStream(mediaState.originalStream);
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

    // Stop all tracks of the main stream
    if (mediaState.stream) {
      mediaState.stream.getTracks().forEach((track) => {
        track.stop();
      });
    }

    // Stop original video stream if exists
    if (mediaState.originalStream) {
      mediaState.originalStream.getTracks().forEach((track) => {
        track.stop();
      });
    }

    toast.info(`Cuộc gọi video nhóm ${group?.name || "Nhóm chat"} đã kết thúc`);
    setTimeout(() => {
      window.close();
    }, 1000);
  };

  const toggleMute = () => {
    const newMuteState = !isMuted;

    if (mediaState.stream) {
      const audioTracks = mediaState.stream.getAudioTracks();
      audioTracks.forEach((track) => {
        track.enabled = !newMuteState;
      });
    }

    setIsMuted(newMuteState);
    toast.info(newMuteState ? "Đã tắt micrô" : "Đã bật micrô");
  };

  const toggleVideo = async () => {
    const willTurnCameraOff = !isVideoOff;

    if (mediaState.stream) {
      if (!willTurnCameraOff) {
        // Turn camera ON
        try {
          const newVideoStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });

          const newVideoTrack = newVideoStream.getVideoTracks()[0];
          mediaState.stream.addTrack(newVideoTrack);

          if (localVideoRef.current) {
            localVideoRef.current.srcObject = mediaState.stream;
          }

          setMediaState((prev) => ({
            ...prev,
            originalStream: newVideoStream,
          }));
        } catch (error) {
          console.error("Cannot turn on camera:", error);
          toast.error("Không thể bật lại camera. Vui lòng thử lại.");
          return;
        }
      } else {
        // Turn camera OFF
        const videoTracks = mediaState.stream.getVideoTracks();
        videoTracks.forEach((track) => {
          mediaState.stream?.removeTrack(track);
          track.stop();
        });

        if (mediaState.originalStream) {
          mediaState.originalStream.getTracks().forEach((track) => {
            track.stop();
          });
        }
      }
    }

    setIsVideoOff(willTurnCameraOff);
    toast.info(willTurnCameraOff ? "Đã tắt camera" : "Đã bật camera");
  };

  // Handle window close event
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (callStatus === "connected") {
        e.preventDefault();
        return "Bạn có chắc chắn muốn kết thúc cuộc gọi?";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [callStatus]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-black">
        <div className="flex flex-col items-center">
          <RotateCcw className="h-8 w-8 animate-spin text-white mb-4" />
          <span className="text-white">Đang tải...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-black">
      {/* Header with group info */}
      <div className="w-full bg-black p-4 flex items-center justify-between">
        <div className="flex items-center">
          <span className="text-lg font-semibold text-white flex items-center">
            <Users className="h-5 w-5 mr-2" />
            {group?.name || "Nhóm chat"}
          </span>
        </div>
        <div className="text-sm text-gray-400">
          {callStatus === "connecting"
            ? "Đang kết nối..."
            : callStatus === "connected"
              ? formatDuration(callDuration)
              : callStatus === "error"
                ? "Lỗi kết nối"
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
                  src={group?.avatarUrl || undefined}
                  className="object-cover"
                />
                <AvatarFallback className="text-4xl">
                  {group?.name?.slice(0, 2).toUpperCase() || "GR"}
                </AvatarFallback>
              </Avatar>
              <div className="flex items-center text-white gap-2">
                <RotateCcw className="h-4 w-4 animate-spin" />
                <span>Đang kết nối...</span>
              </div>
            </div>
          ) : callStatus === "error" ? (
            <div className="flex flex-col items-center justify-center text-white">
              <div className="text-red-500 mb-4">Lỗi kết nối</div>
              <Button
                onClick={() => window.location.reload()}
                variant="outline"
                className="text-white"
              >
                Thử lại
              </Button>
            </div>
          ) : (
            <>
              {/* Group video display */}
              <div className="w-full h-full">
                <div className="w-full h-full bg-gradient-to-b from-gray-800 to-gray-900 flex items-center justify-center">
                  <div className="text-center">
                    <Avatar className="h-32 w-32 mx-auto mb-4">
                      <AvatarImage
                        src={group?.avatarUrl || undefined}
                        className="object-cover"
                      />
                      <AvatarFallback className="text-4xl">
                        {group?.name?.slice(0, 2).toUpperCase() || "GR"}
                      </AvatarFallback>
                    </Avatar>
                    <h2 className="text-xl font-semibold text-white mb-2">
                      {group?.name || "Nhóm chat"}
                    </h2>
                    <p className="text-gray-300 flex items-center justify-center">
                      <Users className="h-4 w-4 mr-1" />
                      {group?.members?.length || 0} thành viên
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Local video (small overlay) */}
        <div className="absolute bottom-4 right-4 w-48 h-36 bg-gray-800 rounded-lg overflow-hidden border-2 border-white">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover ${isVideoOff ? "hidden" : ""}`}
          />

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
