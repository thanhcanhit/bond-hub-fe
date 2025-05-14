"use client";

import { useEffect, useRef } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getUserInitials } from "@/utils/userUtils";
import { User } from "@/types/base";

interface VideoStreamProps {
  stream: MediaStream | null;
  user?: User | null;
  isLocal?: boolean;
  isMuted?: boolean;
  className?: string;
}

export default function VideoStream({
  stream,
  user,
  isLocal = false,
  isMuted = false,
  className = "",
}: VideoStreamProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  // If no stream or all video tracks are disabled, show avatar
  const hasActiveVideo =
    stream && stream.getVideoTracks().some((track) => track.enabled);

  return (
    <div className={`relative w-full h-full ${className}`}>
      {hasActiveVideo ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal || isMuted}
          className={`w-full h-full object-cover ${isLocal ? "mirror" : ""}`}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gray-900">
          <Avatar className="h-32 w-32">
            <AvatarImage
              src={user?.userInfo?.profilePictureUrl || undefined}
              className="object-cover"
            />
            <AvatarFallback className="text-4xl">
              {user ? getUserInitials(user) : "?"}
            </AvatarFallback>
          </Avatar>
        </div>
      )}

      {/* Add mirroring style for selfie view */}
      {isLocal && (
        <style jsx global>{`
          .mirror {
            transform: scaleX(-1);
          }
        `}</style>
      )}
    </div>
  );
}
