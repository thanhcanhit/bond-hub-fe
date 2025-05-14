"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Phone, PhoneOff } from "lucide-react";
import { getUserInitials } from "@/utils/userUtils";
import { playCallRingtone, stopAudio } from "@/utils/audioUtils";
import { User } from "@/types/base";
import { fetchUserById } from "@/actions/user";
import { acceptCall, rejectCall } from "@/actions/call.action";
import { toast } from "sonner";

export default function IncomingCallPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const callId = searchParams.get("callId");
  const initiatorId = searchParams.get("initiatorId");
  const type = searchParams.get("type") as "AUDIO" | "VIDEO";
  const roomId = searchParams.get("roomId");

  const [caller, setCaller] = useState<User | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

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
          document.title = `Cuộc gọi ${type === "VIDEO" ? "video" : "thoại"} từ ${userData.userInfo?.fullName || "Người dùng"}`;
        }
      } catch (error) {
        console.error("Error fetching caller information:", error);
      }
    };

    getCaller();
  }, [initiatorId, type]);

  // Handle accepting the call
  const handleAccept = async () => {
    if (!callId || !roomId || isProcessing) return;

    setIsProcessing(true);

    try {
      // Get token for API call
      const { useAuthStore } = await import("@/stores/authStore");
      const token = useAuthStore.getState().accessToken;

      if (!token) {
        toast.error("Bạn cần đăng nhập để chấp nhận cuộc gọi");
        window.close();
        return;
      }

      const result = await acceptCall(callId, token);

      if (result.success) {
        // Redirect to the appropriate call page
        const callUrl =
          type === "VIDEO" ? `/video-call/${roomId}` : `/call/${roomId}`;

        router.push(callUrl);
      } else {
        toast.error(result.message || "Không thể kết nối cuộc gọi");
        window.close();
      }
    } catch (error) {
      console.error("Error accepting call:", error);
      toast.error("Đã xảy ra lỗi khi kết nối cuộc gọi");
      window.close();
    }
  };

  // Handle rejecting the call
  const handleReject = async () => {
    if (!callId || isProcessing) return;

    setIsProcessing(true);

    try {
      // Get token for API call
      const { useAuthStore } = await import("@/stores/authStore");
      const token = useAuthStore.getState().accessToken;

      if (!token) {
        toast.error("Bạn cần đăng nhập để từ chối cuộc gọi");
        window.close();
        return;
      }

      await rejectCall(callId, token);
      window.close();
    } catch (error) {
      console.error("Error rejecting call:", error);
      toast.error("Đã xảy ra lỗi khi từ chối cuộc gọi");
      window.close();
    }
  };

  // If any required parameter is missing, show an error
  if (!callId || !initiatorId || !type || !roomId) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">
            Thông tin cuộc gọi không hợp lệ
          </h2>
          <p className="text-gray-600 mb-4">
            Không thể hiển thị thông tin cuộc gọi do thiếu thông tin cần thiết.
          </p>
          <button
            onClick={() => window.close()}
            className="w-full py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
          >
            Đóng
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center h-screen bg-gray-100">
      <div className="bg-blue-500 rounded-lg w-96 overflow-hidden shadow-xl">
        {/* Header */}
        <div className="p-4 text-center text-white">
          <h2 className="text-xl font-semibold">
            {type === "VIDEO" ? "Cuộc gọi video đến" : "Cuộc gọi thoại đến"}
          </h2>
        </div>

        {/* Caller Info */}
        <div className="bg-white p-8 flex flex-col items-center">
          <Avatar className="h-32 w-32 mb-6">
            <AvatarImage
              src={caller?.userInfo?.profilePictureUrl || ""}
              alt={caller?.userInfo?.fullName || "Unknown"}
            />
            <AvatarFallback className="text-3xl">
              {caller ? getUserInitials(caller) : "?"}
            </AvatarFallback>
          </Avatar>

          <h3 className="text-2xl font-bold mb-2">
            {caller?.userInfo?.fullName || "Người dùng"}
          </h3>

          <p className="text-gray-500 mb-8">
            {type === "VIDEO" ? "Cuộc gọi video" : "Cuộc gọi thoại"}
          </p>

          {/* Action Buttons */}
          <div className="flex justify-center space-x-10 w-full">
            <button
              onClick={handleReject}
              disabled={isProcessing}
              className="w-16 h-16 rounded-full bg-red-600 flex items-center justify-center disabled:opacity-70"
              aria-label="Từ chối cuộc gọi"
            >
              <PhoneOff className="text-white h-7 w-7" />
            </button>

            <button
              onClick={handleAccept}
              disabled={isProcessing}
              className="w-16 h-16 rounded-full bg-green-600 flex items-center justify-center disabled:opacity-70"
              aria-label="Chấp nhận cuộc gọi"
            >
              <Phone className="text-white h-7 w-7" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
