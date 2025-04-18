import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  initiateUpdateEmail,
  verifyUpdateEmailOtp,
} from "@/actions/user-update.action";
import { toast } from "sonner";
import { isEmail } from "@/utils/helpers";

enum UpdateEmailStep {
  ENTER_EMAIL,
  ENTER_OTP,
  COMPLETE,
}

interface UpdateEmailFormProps {
  currentEmail?: string | null;
  onSuccess?: () => void;
}

export default function UpdateEmailForm({
  currentEmail,
  onSuccess,
}: UpdateEmailFormProps) {
  const [step, setStep] = useState<UpdateEmailStep>(
    UpdateEmailStep.ENTER_EMAIL,
  );
  const [newEmail, setNewEmail] = useState("");
  const [updateId, setUpdateId] = useState("");
  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate email
    if (!isEmail(newEmail)) {
      toast.error("Vui lòng nhập địa chỉ email hợp lệ");
      return;
    }

    // Check if new email is the same as current email
    if (newEmail === currentEmail) {
      toast.error("Email mới không được trùng với email hiện tại");
      return;
    }

    setIsLoading(true);

    try {
      const result = await initiateUpdateEmail(newEmail);

      if (result.success) {
        setUpdateId(result.updateId);
        setStep(UpdateEmailStep.ENTER_OTP);
        toast.success(result.message);
      } else {
        toast.error(result.error || "Không thể gửi mã xác nhận");
      }
    } catch (error) {
      console.error(error);
      toast.error("Đã xảy ra lỗi khi gửi mã xác nhận");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!otp || otp.length < 4) {
      toast.error("Vui lòng nhập mã xác nhận hợp lệ");
      return;
    }

    setIsLoading(true);

    try {
      const result = await verifyUpdateEmailOtp(updateId, otp);

      if (result.success) {
        setStep(UpdateEmailStep.COMPLETE);
        toast.success(result.message);

        // Sau 1.5 giây, gọi callback nếu có
        if (onSuccess) {
          setTimeout(() => {
            onSuccess();
          }, 1500);
        }
      } else {
        toast.error(result.error || "Mã xác nhận không hợp lệ");
      }
    } catch (error) {
      console.error(error);
      toast.error("Đã xảy ra lỗi khi xác nhận mã OTP");
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setStep(UpdateEmailStep.ENTER_EMAIL);
    setNewEmail("");
    setOtp("");
    setUpdateId("");
  };

  return (
    <div className="space-y-6">
      {step === UpdateEmailStep.ENTER_EMAIL && (
        <form onSubmit={handleSendOtp} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="current-email" className="text-sm text-gray-500">
              Email hiện tại
            </Label>
            <div className="text-sm font-medium">
              {currentEmail || "Chưa cập nhật"}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="new-email" className="text-sm text-gray-500">
              Email mới
            </Label>
            <Input
              id="new-email"
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="Nhập email mới"
              required
            />
          </div>

          <Button
            type="submit"
            className="w-full bg-[#0841a3] hover:bg-[#0033a0] text-white"
            disabled={isLoading}
          >
            {isLoading ? "Đang gửi mã..." : "Gửi mã xác nhận"}
          </Button>
        </form>
      )}

      {step === UpdateEmailStep.ENTER_OTP && (
        <form onSubmit={handleVerifyOtp} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="otp" className="text-sm text-gray-500">
              Mã xác nhận
            </Label>
            <Input
              id="otp"
              type="text"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              placeholder="Nhập mã xác nhận"
              required
            />
            <p className="text-xs text-gray-500">
              Mã xác nhận đã được gửi đến email {newEmail}
            </p>
          </div>

          <div className="flex space-x-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={handleReset}
              disabled={isLoading}
            >
              Quay lại
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-[#0841a3] hover:bg-[#0033a0] text-white"
              disabled={isLoading}
            >
              {isLoading ? "Đang xác nhận..." : "Xác nhận"}
            </Button>
          </div>
        </form>
      )}

      {step === UpdateEmailStep.COMPLETE && (
        <div className="space-y-4">
          <div className="p-4 bg-green-50 rounded-md">
            <p className="text-green-600 font-medium">
              Email đã được cập nhật thành công!
            </p>
          </div>

          <Button
            type="button"
            className="w-full bg-[#0841a3] hover:bg-[#0033a0] text-white"
            onClick={() => {
              if (onSuccess) {
                onSuccess();
              } else {
                handleReset();
              }
            }}
          >
            {onSuccess ? "Hoàn tất" : "Cập nhật email khác"}
          </Button>
        </div>
      )}
    </div>
  );
}
