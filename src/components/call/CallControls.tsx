"use client";

import { Button } from "@/components/ui/button";
import { Mic, MicOff, Video, VideoOff, PhoneOff } from "lucide-react";
import { useCallStore } from "@/stores/callStore";

interface CallControlsProps {
  showVideoToggle?: boolean;
}

export default function CallControls({
  showVideoToggle = true,
}: CallControlsProps) {
  const { isMuted, isCameraOff, toggleMute, toggleCamera, endCall } =
    useCallStore();

  const handleToggleMute = async () => {
    await toggleMute();
  };

  const handleToggleCamera = async () => {
    await toggleCamera();
  };

  const handleEndCall = async () => {
    await endCall();
    // Close the window if it was opened as a popup
    if (window.opener) {
      window.close();
    }
  };

  return (
    <div className="fixed bottom-8 left-0 right-0 flex justify-center items-center space-x-4 z-10">
      <Button
        variant="secondary"
        size="icon"
        className="w-12 h-12 rounded-full bg-gray-700 hover:bg-gray-600"
        onClick={handleToggleMute}
        title={isMuted ? "Bật microphone" : "Tắt microphone"}
      >
        {isMuted ? (
          <MicOff className="h-6 w-6 text-white" />
        ) : (
          <Mic className="h-6 w-6 text-white" />
        )}
      </Button>

      <Button
        variant="destructive"
        size="icon"
        className="w-14 h-14 rounded-full"
        onClick={handleEndCall}
        title="Kết thúc cuộc gọi"
      >
        <PhoneOff className="h-6 w-6" />
      </Button>

      {showVideoToggle && (
        <Button
          variant="secondary"
          size="icon"
          className="w-12 h-12 rounded-full bg-gray-700 hover:bg-gray-600"
          onClick={handleToggleCamera}
          title={isCameraOff ? "Bật camera" : "Tắt camera"}
        >
          {isCameraOff ? (
            <VideoOff className="h-6 w-6 text-white" />
          ) : (
            <Video className="h-6 w-6 text-white" />
          )}
        </Button>
      )}
    </div>
  );
}
