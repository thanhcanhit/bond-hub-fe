"use client";

import { useState, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Phone, PhoneOff } from "lucide-react";
import { playNotificationSound } from "@/utils/audioUtils";
import { getUserInitials } from "@/utils/userUtils";
import { User } from "@/types/base";
import { fetchUserById } from "@/actions/user";

interface IncomingCallModalProps {
  callData: {
    callId: string;
    initiatorId: string;
    type: "AUDIO" | "VIDEO";
    roomId: string;
    isGroupCall: boolean;
  };
  onAccept: (callId: string) => void;
  onReject: (callId: string) => void;
}

export default function IncomingCallModal({
  callData,
  onAccept,
  onReject,
}: IncomingCallModalProps) {
  const [caller, setCaller] = useState<User | null>(null);
  const [isVisible, setIsVisible] = useState(true);

  // Fetch caller information
  useEffect(() => {
    const getCaller = async () => {
      try {
        const userData = await fetchUserById(callData.initiatorId);
        if (userData) {
          setCaller(userData);
        }
      } catch (error) {
        console.error("Error fetching caller information:", error);
      }
    };

    getCaller();
  }, [callData.initiatorId]);

  // Play notification sound when call is received
  useEffect(() => {
    // Initial sound
    playNotificationSound(0.7).catch((error) => {
      console.error("Error playing initial notification sound:", error);
    });

    // Set up interval to play sound every 3 seconds
    const soundInterval = setInterval(() => {
      playNotificationSound(0.5).catch((error) => {
        console.error("Error playing interval notification sound:", error);
      });
    }, 3000);

    return () => {
      clearInterval(soundInterval);
    };
  }, []);

  const handleAccept = () => {
    setIsVisible(false);
    onAccept(callData.callId);
  };

  const handleReject = () => {
    setIsVisible(false);
    onReject(callData.callId);
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-blue-500 rounded-lg w-80 overflow-hidden shadow-xl">
        {/* Header */}
        <div className="p-4 text-center text-white">
          <h2 className="text-xl font-semibold">
            {callData.type === "VIDEO"
              ? "Cuộc gọi video đến"
              : "Cuộc gọi thoại đến"}
          </h2>
        </div>

        {/* Caller Info */}
        <div className="bg-white p-6 flex flex-col items-center">
          <Avatar className="h-24 w-24 mb-4">
            <AvatarImage
              src={caller?.userInfo?.profilePictureUrl || ""}
              alt={caller?.userInfo?.fullName || "Unknown"}
            />
            <AvatarFallback className="text-2xl">
              {caller ? getUserInitials(caller) : "?"}
            </AvatarFallback>
          </Avatar>

          <h3 className="text-xl font-bold mb-1">
            {caller?.userInfo?.fullName || "Unknown"}
          </h3>

          <p className="text-gray-500 mb-6">
            {callData.type === "VIDEO" ? "Cuộc gọi video" : "Cuộc gọi thoại"}
          </p>

          {/* Action Buttons */}
          <div className="flex justify-center space-x-8 w-full">
            <button
              onClick={handleReject}
              className="w-14 h-14 rounded-full bg-red-600 flex items-center justify-center"
              aria-label="Từ chối cuộc gọi"
            >
              <PhoneOff className="text-white h-6 w-6" />
            </button>

            <button
              onClick={handleAccept}
              className="w-14 h-14 rounded-full bg-green-600 flex items-center justify-center"
              aria-label="Chấp nhận cuộc gọi"
            >
              <Phone className="text-white h-6 w-6" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
