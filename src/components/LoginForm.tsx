import React, { useState, useEffect } from "react";
// import { useRouter } from "next/navigation";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Smartphone, Lock } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { toast } from "sonner";
import ForgotPasswordFlow from "./password/ForgotPasswordFlow";
import { getDeviceInfo } from "@/utils/helpers";
import Loading from "./Loading";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export default function LoginForm() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showForgotPasswordDialog, setShowForgotPasswordDialog] =
    useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuthStore();
  // const router = useRouter();

  // Handle hydration
  useEffect(() => {
    useAuthStore.persist.rehydrate();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const { deviceType, deviceName } = getDeviceInfo();
      console.log("Attempting login with:", {
        identifier,
        deviceName,
        deviceType,
      });

      const isSuccess = await login(
        identifier,
        password,
        deviceName,
        deviceType,
      );

      console.log("Login result:", isSuccess);

      if (isSuccess) {
        toast.success("Đăng nhập thành công!");
        // Không cần chuyển hướng tại đây, AuthProvider sẽ tự động chuyển hướng
        // router.push("/dashboard");

        // Chỉ ẩn loading sau 1 giây để tránh nháy màn hình
        setTimeout(() => {
          setIsLoading(false);
        }, 1000);
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
              className="w-full h-[40px] pl-8 sm:h-[50px] border-none shadow-none focus:outline-none focus:ring-0 focus-visible:ring-0"
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="Số điện thoại hoặc Email"
              required
            />
          </div>
          <div className="flex items-center gap-2 border-b border-gray-200 mb-7 w-full max-w-[350px] mx-auto">
            <Lock className="w-4 h-4 sm:w-5 sm:h-5" />
            <Input
              className="w-full h-[40px] pl-8 sm:h-[50px] border-none shadow-none focus:outline-none focus:ring-0 focus-visible:ring-0"
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
