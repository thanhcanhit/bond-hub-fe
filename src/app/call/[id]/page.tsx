"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getUserDataById } from "@/actions/user.action";
import { getUserInitials } from "@/utils/userUtils";
import { Phone, Mic, MicOff } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { use } from "react";

export default function CallPage({ params }: { params: { id: string } }) {
  // Unwrap params using React.use()
  const unwrappedParams = use(params);
  const userId = unwrappedParams.id;

  const [user, setUser] = useState<any>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [callStatus, setCallStatus] = useState<
    "connecting" | "connected" | "ended"
  >("connecting");
  const [callDuration, setCallDuration] = useState(0);
  const router = useRouter();

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

  // Simulate connecting and then connected after 2 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setCallStatus("connected");
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  // Format call duration as mm:ss
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleEndCall = () => {
    setCallStatus("ended");
    toast.info(
      `Cuộc gọi với ${user?.userInfo?.fullName || "người dùng"} đã kết thúc`,
    );
    setTimeout(() => {
      window.close();
    }, 1000);
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    toast.info(isMuted ? "Đã bật micrô" : "Đã tắt micrô");
  };

  // Handle window close event
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (callStatus === "connected") {
        // Cách hiện đại để xử lý sự kiện beforeunload
        e.preventDefault();
        // Đặt một thông báo chung (nhiều trình duyệt hiện đại không hiển thị thông báo tùy chỉnh)
        const message = "Bạn có chắc chắn muốn kết thúc cuộc gọi?";
        e.returnValue = message; // Cho trình duyệt cũ
        return message; // Cho một số trình duyệt
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
