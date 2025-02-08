import React, { useState } from "react";
import { useAuthStore } from "@/stores/authStore";
import { useRouter } from "next/navigation";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Smartphone, Lock } from "lucide-react";

export default function LoginForm() {
  const { loginWithPhoneNumber } = useAuthStore();
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [showSetPasswordForm, setShowSetPasswordForm] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await loginWithPhoneNumber(phoneNumber, password);
      alert("Đăng nhập thành công!");
      router.push("/");
    } catch (error : any) {
      if (error.request) {
        console.log("Request:", error.request); // Lỗi request (không có response)
        alert("Lỗi kết nối đến server");
      } 
      alert("Sai email hoặc mật khẩu!");
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
    <form onSubmit={handleSubmit} >
      {showSetPasswordForm ?
        <div className="flex flex-col gap-2 justify-center items-center">
          <p className="text-center mb-3">Nhập số điện thoại của bạn</p>
          <div className="flex items-center gap-2 border-b border-gray-200 mb-3">
            <Smartphone className="w-5 h-5" />
            <Input
              className="w-[350px] h-[50px]"
              type="phoneNumber"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="Số điện thoại"
              required />
          </div>
          <Button
            className="w-[373px] h-[50px] bg-[#80c7f9] hover:bg-[#0068ff] text-white font-semibold rounded-md mb-3"
            >Tiếp tục</Button>

          <a className="cursor-pointer self-start hover:text-[#80c7f9] hover:underline hover:underline-offset-2" onClick={() => handleSelect('back')}> &lt;&lt; Quay lại</a>
        </div>
        : <div className="flex flex-col gap-2 justify-center items-center">
          <div className="flex items-center gap-2 border-b border-gray-200 mb-3">
            <Smartphone className="w-5 h-5" />
            <Input
              className="w-[350px] h-[50px]"
              type="phoneNumber"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="Số điện thoại"
              required />
          </div>
          <div className="flex items-center gap-2 border-b border-gray-200 mb-7">
            <Lock className="w-5 h-5" />
            <Input
              className="w-[350px] h-[50px]"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mật khẩu"
              required
            />
          </div>

          <Button
            className="w-[373px] h-[50px] bg-[#80c7f9] hover:bg-[#0068ff] text-white font-semibold rounded-md mb-3"
            type="submit">Đăng nhập với mật khẩu</Button>

          <a className="cursor-pointer" onClick={() => handleSelect('forget-password')}>Quên mật khẩu</a>
        </div>
      }
      
      
    </form>
  );
}