import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Smartphone, Lock } from "lucide-react";
import { DeviceType } from "@/types/base";
import * as UAParser from "ua-parser-js";
import { useAuthStore } from "@/stores/authStore";
import { toast } from "sonner";

// Hàm để xác định deviceType dựa trên userAgent
const getDeviceInfo = () => {
  if (typeof window === "undefined") {
    return { deviceType: DeviceType.OTHER, deviceName: "Unknown" };
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
  const deviceName = result.device.model || result.os.name || "Unknown";

  return { deviceType, deviceName };
};

export default function LoginForm() {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [showSetPasswordForm, setShowSetPasswordForm] = useState(false);
  const { login } = useAuthStore();
  const router = useRouter();

  // Handle hydration
  useEffect(() => {
    useAuthStore.persist.rehydrate();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
        toast.error("Đăng nhập thất bại! Vui lòng kiểm tra lại thông tin!");
        console.error("Login failed: No response data");
      }
    } catch (error) {
      toast.error("Đăng nhập thất bại! ");
      console.error("Login error:", error);
    }
  };

  const handleSelect = (currentValue: string) => {
    if (currentValue === "forget-password") {
      setShowSetPasswordForm(true);
    } else {
      setShowSetPasswordForm(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full">
      {showSetPasswordForm ? (
        <div className="flex flex-col gap-2 justify-center items-center">
          <p className="text-center mb-3 text-sm sm:text-base">
            Nhập số điện thoại của bạn
          </p>
          <div className="flex items-center gap-2 border-b border-gray-200 mb-3 w-full max-w-[350px] mx-auto">
            <Smartphone className="w-5 h-5w-4 h-4 sm:w-5 sm:h-5" />
            <Input
              className="w-full h-[40px] sm:h-[50px]"
              type="text"
              name="phoneNumber"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="Số điện thoại"
              required
            />
          </div>
          <Button className="w-full max-w-[373px] h-[40px] sm:h-[50px] bg-[#80c7f9] hover:bg-[#0068ff] text-white font-semibold rounded-md mb-3">
            Tiếp tục
          </Button>

          <a
            className="cursor-pointer self-start hover:text-[#80c7f9] hover:underline hover:underline-offset-2 text-sm sm:text-base"
            onClick={() => handleSelect("back")}
          >
            {" "}
            &lt;&lt; Quay lại
          </a>
        </div>
      ) : (
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
            onClick={() => handleSelect("forget-password")}
          >
            Quên mật khẩu
          </a>
        </div>
      )}
    </form>
  );
}
