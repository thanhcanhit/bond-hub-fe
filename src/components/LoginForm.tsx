import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Smartphone, Lock } from "lucide-react";
import { DeviceType } from "@/types/base";
import * as UAParser from "ua-parser-js";
import { useAuthStore } from "@/stores/authStore";
import { toast } from "sonner";
import ForgotPasswordFlow from "./ForgotPasswordFlow";
import Loading from "./Loading";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

// Hàm để xác định deviceType dựa trên userAgent
const getDeviceInfo = () => {
  if (typeof window === "undefined") {
    return { deviceType: DeviceType.OTHER, deviceName: "Dell Latitude 5290" };
  }

  const parser = new UAParser.UAParser();
  const result = parser.getResult();

  // Xác định deviceType
  let deviceType: DeviceType;
  const device = result.device.type?.toLowerCase();
  const os = result.os.name?.toLowerCase();

  if (device === "mobile" || /iphone|android/.test(result.ua.toLowerCase())) {
    deviceType = DeviceType.MOBILE;
  } else if (device === "tablet" || /ipad/.test(result.ua.toLowerCase())) {
    deviceType = DeviceType.TABLET;
  } else if (os && /mac|win|linux/.test(os)) {
    deviceType = DeviceType.DESKTOP;
  } else {
    deviceType = DeviceType.OTHER;
  }

  // Lấy deviceName
  const deviceName =
    result.device.model || result.os.name || "Dell Latitude 5290";

  return { deviceType, deviceName };
};

export default function LoginForm() {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [showForgotPasswordDialog, setShowForgotPasswordDialog] =
    useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuthStore();
  const router = useRouter();

  // Handle hydration
  useEffect(() => {
    useAuthStore.persist.rehydrate();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const { deviceType, deviceName } = getDeviceInfo();
      const isSuccess = await login(
        phoneNumber,
        password,
        deviceName,
        deviceType,
      );
      if (isSuccess) {
        toast.success("Đăng nhập thành công!");
        router.push("/dashboard");
      } else {
        setIsLoading(false);
        toast.error("Đăng nhập thất bại! Vui lòng kiểm tra lại thông tin!");
        console.error("Login failed: No response data");
      }
    } catch (error) {
      setIsLoading(false);
      toast.error("Đăng nhập thất bại! ");
      console.error("Login error:", error);
    }
  };

  const handleForgotPassword = () => {
    setShowForgotPasswordDialog(true);
  };

  const handleForgotPasswordComplete = () => {
    setShowForgotPasswordDialog(false);
    toast.success(
      "Password has been reset. You can now log in with your new password.",
    );
  };

  return (
    <>
      {isLoading && <Loading />}
      <form onSubmit={handleSubmit} className="w-full">
        <div className="flex flex-col gap-2 justify-center items-center">
          <div className="flex items-center gap-2 border-b border-gray-200 mb-3 w-full max-w-[350px] mx-auto">
            <Smartphone className="w-4 h-4 sm:w-5 sm:h-5" />
            <Input
              className="w-full h-[40px] sm:h-[50px]"
              type="phoneNumber"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="Số điện thoại"
              required
            />
          </div>
          <div className="flex items-center gap-2 border-b border-gray-200 mb-7 w-full max-w-[350px] mx-auto">
            <Lock className="w-4 h-4 sm:w-5 sm:h-5" />
            <Input
              className="w-full h-[40px] sm:h-[50px]"
              type="password"
              name="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mật khẩu"
              required
            />
          </div>

          <Button
            className="w-full max-w-[373px] h-[40px] sm:h-[50px] bg-[#80c7f9] hover:bg-[#0068ff] text-white font-semibold rounded-md mb-3"
            type="submit"
          >
            Đăng nhập với mật khẩu
          </Button>

          <a
            className="cursor-pointer text-sm sm:text-base hover:underline"
            onClick={handleForgotPassword}
          >
            Quên mật khẩu
          </a>
        </div>
      </form>

      <Dialog
        open={showForgotPasswordDialog}
        onOpenChange={setShowForgotPasswordDialog}
      >
        <DialogContent className="sm:max-w-[500px] p-6">
          <DialogHeader>
            <DialogTitle className="text-center text-xl font-semibold mb-2">
              Quên mật khẩu
            </DialogTitle>
            <DialogDescription className="text-center">
              Làm theo các bước để đặt lại mật khẩu của bạn
            </DialogDescription>
          </DialogHeader>
          <ForgotPasswordFlow onComplete={handleForgotPasswordComplete} />
        </DialogContent>
      </Dialog>
    </>
  );
}
