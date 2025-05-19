import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  initiateUpdatePhone,
  verifyUpdatePhoneOtp,
} from "@/actions/user-update.action";
import { toast } from "sonner";
import { isPhoneNumber } from "@/utils/helpers";
import { refreshUserData } from "@/hooks/useUserDataSync";

enum UpdatePhoneStep {
  ENTER_PHONE,
  ENTER_OTP,
  COMPLETE,
}

interface UpdatePhoneFormProps {
  currentPhone?: string | null;
  onSuccess?: () => void;
}

export default function UpdatePhoneForm({
  currentPhone,
  onSuccess,
}: UpdatePhoneFormProps) {
  const [step, setStep] = useState<UpdatePhoneStep>(
    UpdatePhoneStep.ENTER_PHONE,
  );
  const [newPhone, setNewPhone] = useState("");
  const [updateId, setUpdateId] = useState("");
  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate phone number
    if (!isPhoneNumber(newPhone)) {
      toast.error("Vui lòng nhập số điện thoại hợp lệ");
      return;
    }

    // Check if new phone is the same as current phone
    if (newPhone === currentPhone) {
      toast.error("Số điện thoại mới không được trùng với số hiện tại");
      return;
    }

    setIsLoading(true);

    try {
      const result = await initiateUpdatePhone(newPhone);

      if (result.success) {
        setUpdateId(result.updateId);
        setStep(UpdatePhoneStep.ENTER_OTP);
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
      const result = await verifyUpdatePhoneOtp(updateId, otp);

      if (result.success) {
        setStep(UpdatePhoneStep.COMPLETE);
        toast.success(result.message);

        // Làm mới dữ liệu người dùng từ server để đảm bảo UI hiển thị số điện thoại mới
        await refreshUserData();
        console.log(
          "Đã làm mới dữ liệu người dùng sau khi cập nhật số điện thoại",
        );

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
    setStep(UpdatePhoneStep.ENTER_PHONE);
    setNewPhone("");
    setOtp("");
    setUpdateId("");
  };

  return (
    <div className="space-y-6">
      {step === UpdatePhoneStep.ENTER_PHONE && (
        <form onSubmit={handleSendOtp} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="current-phone" className="text-sm text-gray-500">
              Số điện thoại hiện tại
            </Label>
            <div className="text-sm font-medium">
              {currentPhone || "Chưa cập nhật"}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="new-phone" className="text-sm text-gray-500">
              Số điện thoại mới
            </Label>
            <Input
              id="new-phone"
              type="tel"
              value={newPhone}
              onChange={(e) => setNewPhone(e.target.value)}
              placeholder="Nhập số điện thoại mới"
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

      {step === UpdatePhoneStep.ENTER_OTP && (
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
              Mã xác nhận đã được gửi đến số điện thoại {newPhone}
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

      {step === UpdatePhoneStep.COMPLETE && (
        <div className="space-y-4">
          <div className="p-4 bg-green-50 rounded-md">
            <p className="text-green-600 font-medium">
              Số điện thoại đã được cập nhật thành công!
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
            {onSuccess ? "Hoàn tất" : "Cập nhật số điện thoại khác"}
          </Button>
        </div>
      )}
    </div>
  );
}
