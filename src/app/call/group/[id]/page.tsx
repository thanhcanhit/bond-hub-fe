"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getGroupById } from "@/actions/group.action";
import { Phone, Mic, MicOff, Users } from "lucide-react";
import { toast } from "sonner";
import { use } from "react";
import { Group } from "@/types/base";

export default function GroupCallPage({ params }: { params: { id: string } }) {
  // Unwrap params using React.use()
  // @ts-ignore - Bỏ qua lỗi TypeScript với use()
  const unwrappedParams = use(params);
  // @ts-ignore - Bỏ qua lỗi TypeScript với unwrappedParams
  const groupId = unwrappedParams.id;

  const [group, setGroup] = useState<Group | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [callStatus, setCallStatus] = useState<
    "connecting" | "connected" | "ended"
  >("connecting");
  const [callDuration, setCallDuration] = useState(0);

  // Fetch group data
  useEffect(() => {
    const fetchGroupData = async () => {
      try {
        const result = await getGroupById(groupId);
        if (result.success && result.group) {
          setGroup(result.group);
          document.title = `Cuộc gọi nhóm ${result.group.name || "Nhóm chat"}`;
        } else {
          toast.error("Không thể tải thông tin nhóm");
          setTimeout(() => {
            window.close();
          }, 2000);
        }
      } catch (error) {
        console.error("Error fetching group data:", error);
        toast.error("Đã xảy ra lỗi khi tải thông tin nhóm");
        setTimeout(() => {
          window.close();
        }, 2000);
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
    toast.info(`Cuộc gọi với nhóm ${group?.name || "Nhóm chat"} đã kết thúc`);
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
    <div className="flex flex-col h-screen bg-white">
      {/* Header with call status */}
      <div className="w-full bg-white p-4 flex items-center justify-between border-b">
        <div className="flex items-center">
          <span className="text-lg font-semibold">
            {callStatus === "connecting"
              ? "Đang kết nối..."
              : callStatus === "connected"
                ? formatDuration(callDuration)
                : "Cuộc gọi đã kết thúc"}
          </span>
        </div>
      </div>

      {/* Main content with avatar */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 w-full">
        <Avatar className="h-32 w-32 mb-6">
          <AvatarImage
            src={group?.avatarUrl || undefined}
            className="object-cover"
          />
          <AvatarFallback className="text-4xl">
            {group?.name?.slice(0, 2).toUpperCase() || "GR"}
          </AvatarFallback>
        </Avatar>

        <h2 className="text-xl font-semibold mb-2 flex items-center">
          <Users className="h-5 w-5 mr-2" />
          {group?.name || "Nhóm chat"}
        </h2>

        <p className="text-gray-500 mb-2">
          {group?.members?.length || 0} thành viên
        </p>

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
