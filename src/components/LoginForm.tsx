import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Smartphone, Lock } from "lucide-react";
import { DeviceType } from "@/types/base";
import { useAuthStore } from "@/stores/authStore";

// Hàm để xác định deviceType dựa trên userAgent
const getDeviceType = (): DeviceType => {
  if (typeof window === "undefined") return DeviceType.OTHER; // Trường hợp không xác định được

  const userAgent = navigator.userAgent.toLowerCase();

  // Logic đơn giản để xác định thiết bị
  if (/mobile|iphone|android/.test(userAgent)) {
    return DeviceType.MOBILE;
  } else if (/tablet|ipad/.test(userAgent)) {
    return DeviceType.TABLET;
  } else if (/mac|win|linux/.test(userAgent)) {
    return DeviceType.DESKTOP;
  } else {
    return DeviceType.OTHER;
  }
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
      const deviceType = getDeviceType();
      const isSuccess = await login(phoneNumber, password, deviceType);
      if (isSuccess) {
        // Debug: Check localStorage
        console.log("Auth Storage:", localStorage.getItem("auth-storage"));
        console.log("Store State:", useAuthStore.getState());

        router.push("/dashboard");
      }
    } catch (error) {
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
    <form onSubmit={handleSubmit}>
      {showSetPasswordForm ? (
        <div className="flex flex-col gap-2 justify-center items-center">
          <p className="text-center mb-3">Nhập số điện thoại của bạn</p>
          <div className="flex items-center gap-2 border-b border-gray-200 mb-3">
            <Smartphone className="w-5 h-5" />
            <Input
              className="w-[350px] h-[50px]"
              type="text"
              name="phoneNumber"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="Số điện thoại"
              required
            />
          </div>
          <Button className="w-[373px] h-[50px] bg-[#80c7f9] hover:bg-[#0068ff] text-white font-semibold rounded-md mb-3">
            Tiếp tục
          </Button>

          <a
            className="cursor-pointer self-start hover:text-[#80c7f9] hover:underline hover:underline-offset-2"
            onClick={() => handleSelect("back")}
          >
            {" "}
            &lt;&lt; Quay lại
          </a>
        </div>
      ) : (
        <div className="flex flex-col gap-2 justify-center items-center">
          <div className="flex items-center gap-2 border-b border-gray-200 mb-3">
            <Smartphone className="w-5 h-5" />
            <Input
              className="w-[350px] h-[50px]"
              type="phoneNumber"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="Số điện thoại"
              required
            />
          </div>
          <div className="flex items-center gap-2 border-b border-gray-200 mb-7">
            <Lock className="w-5 h-5" />
            <Input
              className="w-[350px] h-[50px]"
              type="password"
              name="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mật khẩu"
              required
            />
          </div>

          <Button
            className="w-[373px] h-[50px] bg-[#80c7f9] hover:bg-[#0068ff] text-white font-semibold rounded-md mb-3"
            type="submit"
          >
            Đăng nhập với mật khẩu
          </Button>

          <a
            className="cursor-pointer"
            onClick={() => handleSelect("forget-password")}
          >
            Quên mật khẩu
          </a>
        </div>
      )}
    </form>
  );
}
