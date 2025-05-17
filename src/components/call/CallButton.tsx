"use client";

import { Button } from "@/components/ui/button";
import { Phone, Video } from "lucide-react";
import { User, Group } from "@/types/base";
import { toast } from "sonner";
import { useCallStore } from "@/stores/callStore";
import { useRouter } from "next/navigation";

interface CallButtonProps {
  target: User | Group;
  targetType?: "USER" | "GROUP";
  variant?: "icon" | "default";
  size?: "sm" | "md" | "lg";
  showVideoCall?: boolean;
}

export default function CallButton({
  target,
  targetType = "USER",
  variant = "default",
  size = "md",
  showVideoCall = true,
}: CallButtonProps) {
  const { startCall, startGroupCall, isLoading } = useCallStore();
  const router = useRouter();

  const handleCall = async () => {
    try {
      // Hiển thị toast thông báo đang gọi
      const callingToast = toast.loading(
        `Đang gọi ${
          targetType === "USER"
            ? (target as User).userInfo?.fullName || "người dùng"
            : (target as Group).name || "nhóm"
        }...`,
        { duration: 60000 }, // Thời gian tối đa 60 giây
      );

      // Gọi API khởi tạo cuộc gọi dựa trên loại đối tượng
      const success =
        targetType === "USER"
          ? await startCall(target.id, "AUDIO")
          : await startGroupCall(target.id, "AUDIO");

      // Đóng toast thông báo đang gọi
      toast.dismiss(callingToast);

      if (!success) {
        toast.error("Không thể khởi tạo cuộc gọi");
        return;
      }

      // Lấy thông tin cuộc gọi từ store
      const { currentCall } = useCallStore.getState();
      if (!currentCall) {
        toast.error("Lỗi khởi tạo cuộc gọi: Không có thông tin cuộc gọi");
        return;
      }

      // Lưu thông tin cuộc gọi vào localStorage để có thể truy cập từ cửa sổ khác
      localStorage.setItem(
        "pendingCall",
        JSON.stringify({
          callId: currentCall.id,
          roomId: currentCall.roomId,
          type: "AUDIO",
          targetId: target.id,
          targetType,
        }),
      );

      // Mở trang cuộc gọi trực tiếp với trạng thái "đang gọi"
      const callUrl =
        targetType === "USER"
          ? `/call/${currentCall.roomId}?callId=${currentCall.id}&targetId=${target.id}&type=AUDIO&direction=outgoing`
          : `/call/${currentCall.roomId}?callId=${currentCall.id}&groupId=${target.id}&type=AUDIO&direction=outgoing`;

      // Mở cửa sổ trình duyệt mới cho cuộc gọi
      const callWindow = window.open(callUrl, "_blank", "width=400,height=600");
      if (!callWindow) {
        toast.error(
          "Trình duyệt đã chặn cửa sổ pop-up. Vui lòng cho phép pop-up để sử dụng tính năng gọi điện.",
        );

        // Kết thúc cuộc gọi nếu không mở được cửa sổ
        useCallStore.getState().endCall().catch(console.error);

        // Xóa thông tin cuộc gọi đang chờ
        localStorage.removeItem("pendingCall");
        return;
      }

      // Lắng nghe sự kiện khi người nhận từ chối cuộc gọi
      const handleCallRejected = (event: Event) => {
        const customEvent = event as CustomEvent;
        const callData = customEvent.detail;

        // Kiểm tra xem đây có phải là cuộc gọi hiện tại không
        if (callData.callId === currentCall.id) {
          toast.error(`Cuộc gọi đã bị từ chối`);

          // Xóa thông tin cuộc gọi đang chờ
          localStorage.removeItem("pendingCall");

          // Xóa event listener
          window.removeEventListener(
            "call:rejected",
            handleCallRejected as EventListener,
          );
        }
      };

      // Đăng ký lắng nghe sự kiện từ chối
      window.addEventListener(
        "call:rejected",
        handleCallRejected as EventListener,
      );

      // Không sử dụng timeout tự động hủy cuộc gọi
    } catch (error) {
      console.error("Error initiating call:", error);
      toast.error("Đã xảy ra lỗi khi khởi tạo cuộc gọi");
    }
  };

  const handleVideoCall = async () => {
    try {
      // Hiển thị toast thông báo đang gọi
      const callingToast = toast.loading(
        `Đang gọi video ${
          targetType === "USER"
            ? (target as User).userInfo?.fullName || "người dùng"
            : (target as Group).name || "nhóm"
        }...`,
        { duration: 60000 }, // Thời gian tối đa 60 giây
      );

      // Gọi API khởi tạo cuộc gọi dựa trên loại đối tượng
      const success =
        targetType === "USER"
          ? await startCall(target.id, "VIDEO")
          : await startGroupCall(target.id, "VIDEO");

      // Đóng toast thông báo đang gọi
      toast.dismiss(callingToast);

      if (!success) {
        toast.error("Không thể khởi tạo cuộc gọi video");
        return;
      }

      // Lấy thông tin cuộc gọi từ store
      const { currentCall } = useCallStore.getState();
      if (!currentCall) {
        toast.error("Lỗi khởi tạo cuộc gọi: Không có thông tin cuộc gọi");
        return;
      }

      // Lưu thông tin cuộc gọi vào localStorage để có thể truy cập từ cửa sổ khác
      localStorage.setItem(
        "pendingCall",
        JSON.stringify({
          callId: currentCall.id,
          roomId: currentCall.roomId,
          type: "VIDEO",
          targetId: target.id,
          targetType,
        }),
      );

      // Mở trang cuộc gọi trực tiếp với trạng thái "đang gọi"
      const callUrl =
        targetType === "USER"
          ? `/video-call/${currentCall.roomId}?callId=${currentCall.id}&targetId=${target.id}&type=VIDEO&direction=outgoing`
          : `/video-call/${currentCall.roomId}?callId=${currentCall.id}&groupId=${target.id}&type=VIDEO&direction=outgoing`;

      // Mở cửa sổ trình duyệt mới cho cuộc gọi
      const callWindow = window.open(callUrl, "_blank", "width=800,height=600");
      if (!callWindow) {
        toast.error(
          "Trình duyệt đã chặn cửa sổ pop-up. Vui lòng cho phép pop-up để sử dụng tính năng gọi video.",
        );

        // Kết thúc cuộc gọi nếu không mở được cửa sổ
        useCallStore.getState().endCall().catch(console.error);

        // Xóa thông tin cuộc gọi đang chờ
        localStorage.removeItem("pendingCall");
        return;
      }

      // Lắng nghe sự kiện khi người nhận từ chối cuộc gọi
      const handleCallRejected = (event: Event) => {
        const customEvent = event as CustomEvent;
        const callData = customEvent.detail;

        // Kiểm tra xem đây có phải là cuộc gọi hiện tại không
        if (callData.callId === currentCall.id) {
          toast.error(`Cuộc gọi video đã bị từ chối`);

          // Xóa thông tin cuộc gọi đang chờ
          localStorage.removeItem("pendingCall");

          // Xóa event listener
          window.removeEventListener(
            "call:rejected",
            handleCallRejected as EventListener,
          );
        }
      };

      // Đăng ký lắng nghe sự kiện từ chối
      window.addEventListener(
        "call:rejected",
        handleCallRejected as EventListener,
      );

      // Không sử dụng timeout tự động hủy cuộc gọi
    } catch (error) {
      console.error("Error initiating video call:", error);
      toast.error("Đã xảy ra lỗi khi khởi tạo cuộc gọi video");
    }
  };

  if (variant === "icon") {
    return (
      <>
        <div className="flex gap-2">
          <Button
            onClick={handleCall}
            variant="ghost"
            size="icon"
            disabled={isLoading}
            className={`rounded-full ${size === "sm" ? "h-8 w-8" : size === "lg" ? "h-12 w-12" : "h-10 w-10"}`}
          >
            <Phone
              className={`${size === "sm" ? "h-4 w-4" : size === "lg" ? "h-6 w-6" : "h-5 w-5"}`}
            />
          </Button>

          {showVideoCall && (
            <Button
              onClick={handleVideoCall}
              variant="ghost"
              size="icon"
              disabled={isLoading}
              className={`rounded-full ${size === "sm" ? "h-8 w-8" : size === "lg" ? "h-12 w-12" : "h-10 w-10"}`}
            >
              <Video
                className={`${size === "sm" ? "h-4 w-4" : size === "lg" ? "h-6 w-6" : "h-5 w-5"}`}
              />
            </Button>
          )}
        </div>
      </>
    );
  }

  return (
    <>
      <div className="flex gap-2">
        <Button
          onClick={handleCall}
          variant="outline"
          disabled={isLoading}
          className={`
            flex items-center gap-2
            ${size === "sm" ? "text-xs py-1 px-2" : size === "lg" ? "text-base py-2 px-4" : "text-sm py-1.5 px-3"}
          `}
        >
          <Phone
            className={`${size === "sm" ? "h-3 w-3" : size === "lg" ? "h-5 w-5" : "h-4 w-4"}`}
          />
          Gọi điện
        </Button>

        {showVideoCall && (
          <Button
            onClick={handleVideoCall}
            variant="outline"
            disabled={isLoading}
            className={`
              flex items-center gap-2
              ${size === "sm" ? "text-xs py-1 px-2" : size === "lg" ? "text-base py-2 px-4" : "text-sm py-1.5 px-3"}
            `}
          >
            <Video
              className={`${size === "sm" ? "h-3 w-3" : size === "lg" ? "h-5 w-5" : "h-4 w-4"}`}
            />
            Gọi video
          </Button>
        )}
      </div>
    </>
  );
}
