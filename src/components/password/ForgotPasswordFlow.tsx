import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  initiateForgotPassword,
  verifyForgotPasswordOtp,
  resetPassword,
} from "@/actions/auth.action";
import { toast } from "sonner";
import { Eye, EyeOff, ArrowLeft } from "lucide-react";

enum ForgotPasswordStep {
  ENTER_EMAIL,
  ENTER_OTP,
  ENTER_NEW_PASSWORD,
  COMPLETE,
}

export default function ForgotPasswordFlow({
  onComplete,
}: {
  onComplete?: () => void;
}) {
  const [step, setStep] = useState<ForgotPasswordStep>(
    ForgotPasswordStep.ENTER_EMAIL,
  );
  const [identifier, setIdentifier] = useState("");
  const [otp, setOtp] = useState("");
  const [resetId, setResetId] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const result = await initiateForgotPassword(identifier);

      if (result.success) {
        setResetId(result.resetId);
        setStep(ForgotPasswordStep.ENTER_OTP);
        toast.success(
          `OTP đã được gửi đến ${identifier.includes("@") ? "email" : "số điện thoại"} của bạn`,
        );
      } else {
        // Xử lý các loại lỗi khác nhau
        if (result.error && result.error.includes("400")) {
          toast.error("Vui lòng kiểm tra lại email/số điện thoại của bạn");
        } else if (result.error && result.error.includes("404")) {
          toast.error("Email/số điện thoại chưa được đăng ký trong hệ thống");
        } else {
          toast.error(
            result.error || "Vui lòng kiểm tra lại email/số điện thoại của bạn",
          );
        }
      }
    } catch (error) {
      console.log(error);

      // Hiển thị thông báo lỗi thân thiện thay vì lỗi kỹ thuật
      toast.error("Vui lòng kiểm tra lại email/số điện thoại của bạn");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const result = await verifyForgotPasswordOtp(resetId, otp);

      if (result.success) {
        setStep(ForgotPasswordStep.ENTER_NEW_PASSWORD);
        toast.success("OTP xác nhận thành công");
      } else {
        // Xử lý các loại lỗi khác nhau
        if (result.error && result.error.includes("400")) {
          toast.error("Mã OTP không hợp lệ");
        } else if (result.error && result.error.includes("expired")) {
          toast.error("Mã OTP đã hết hạn");
        } else {
          toast.error(result.error || "Mã OTP không hợp lệ");
        }
      }
    } catch (error) {
      console.log(error);
      // Hiển thị thông báo lỗi thân thiện
      toast.error("Mã OTP không hợp lệ");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate passwords
    if (newPassword !== confirmPassword) {
      toast.error("Mật khẩu không khớp");
      return;
    }

    if (newPassword.length < 8) {
      toast.error("Mật khẩu phải có ít nhất 8 ký tự");
      return;
    }

    setIsLoading(true);

    try {
      const result = await resetPassword(resetId, newPassword);

      if (result.success) {
        setStep(ForgotPasswordStep.COMPLETE);
        toast.success("Đặt lại mật khẩu thành công");
      } else {
        // Xử lý các loại lỗi khác nhau
        if (result.error && result.error.includes("400")) {
          toast.error("Không thể đặt lại mật khẩu. Vui lòng thử lại sau");
        } else if (result.error && result.error.includes("expired")) {
          toast.error("Phiên đặt lại mật khẩu đã hết hạn");
        } else {
          toast.error(result.error || "Không thể đặt lại mật khẩu");
        }
      }
    } catch (error) {
      console.log(error);

      // Hiển thị thông báo lỗi thân thiện
      toast.error("Không thể đặt lại mật khẩu. Vui lòng thử lại sau");
    } finally {
      setIsLoading(false);
    }
  };

  const renderStepContent = () => {
    switch (step) {
      case ForgotPasswordStep.ENTER_EMAIL:
        return (
          <form onSubmit={handleSendOtp} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="identifier">Email hoặc Số điện thoại</Label>
              <Input
                id="identifier"
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="Nhập email hoặc số điện thoại của bạn"
                className="focus:outline-none focus:ring-0 focus-visible:ring-0"
                required
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-[#80c7f9] hover:bg-[#0068ff] text-white"
              disabled={isLoading}
            >
              {isLoading ? "Đang gửi OTP..." : "Gửi OTP"}
            </Button>
          </form>
        );

      case ForgotPasswordStep.ENTER_OTP:
        return (
          <form onSubmit={handleVerifyOtp} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="otp">Nhập mã OTP</Label>
              <Input
                id="otp"
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="Nhập mã OTP đã gửi đến email hoặc số điện thoại của bạn"
                className="focus:outline-none focus:ring-0 focus-visible:ring-0"
                required
              />
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep(ForgotPasswordStep.ENTER_EMAIL)}
                disabled={isLoading}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Quay lại
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-[#80c7f9] hover:bg-[#0068ff] text-white"
                disabled={isLoading}
              >
                {isLoading ? "Đang xác nhận..." : "Xác nhận OTP"}
              </Button>
            </div>
          </form>
        );

      case ForgotPasswordStep.ENTER_NEW_PASSWORD:
        return (
          <form onSubmit={handleResetPassword} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="newPassword">Mật khẩu mới</Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="pr-10 focus:outline-none focus:ring-0 focus-visible:ring-0"
                  required
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                >
                  {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Xác nhận mật khẩu mới</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pr-10 focus:outline-none focus:ring-0 focus-visible:ring-0"
                  required
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeOff size={16} />
                  ) : (
                    <Eye size={16} />
                  )}
                </button>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep(ForgotPasswordStep.ENTER_OTP)}
                disabled={isLoading}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Quay lại
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-[#80c7f9] hover:bg-[#0068ff] text-white"
                disabled={isLoading}
              >
                {isLoading ? "Đang đặt lại mật khẩu..." : "Đặt lại mật khẩu"}
              </Button>
            </div>
          </form>
        );

      case ForgotPasswordStep.COMPLETE:
        return (
          <div className="space-y-6 text-center">
            <div className="py-8">
              <div className="mx-auto w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6 text-green-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <h3 className="mt-4 text-lg font-medium">
                Đặt lại mật khẩu thành công
              </h3>
              <p className="mt-2 text-sm text-gray-500">
                Mật khẩu của bạn đã được đặt lại thành công. Bây giờ bạn có thể
                đăng nhập với mật khẩu mới.
              </p>
            </div>

            <Button
              type="button"
              className="w-full bg-[#80c7f9] hover:bg-[#0068ff] text-white"
              onClick={onComplete}
            >
              Quay lại đăng nhập
            </Button>
          </div>
        );
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      {/* <div className="text-center mb-6">
        <h2 className="text-2xl font-bold">Reset Password</h2>
        {step !== ForgotPasswordStep.COMPLETE && (
          <p className="text-sm text-gray-500 mt-1">
            {step === ForgotPasswordStep.ENTER_EMAIL &&
              "Enter your email or phone number to receive a verification code"}
            {step === ForgotPasswordStep.ENTER_OTP &&
              "Enter the verification code sent to your email or phone number"}
            {step === ForgotPasswordStep.ENTER_NEW_PASSWORD &&
              "Create a new password for your account"}
          </p>
        )}
      </div> */}

      {renderStepContent()}
    </div>
  );
}
