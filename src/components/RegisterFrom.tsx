import React, { useState } from "react";
import useAuthStore from "@/stores/authStore";
import { useRouter } from "next/navigation";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Smartphone, Lock } from "lucide-react";

export default function RegisterForm() {
  const { register, login } = useAuthStore();
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await register(phoneNumber, password, fullName);
    alert("Đăng ký thành công!");
    await login({ phoneNumber, password });
    router.push("/");
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="flex flex-col gap-2 justify-center items-center">
        <div className="flex items-center gap-2 border-b border-gray-200 mb-3">
          <Smartphone className="w-5 h-5" />
          <Input
            className="w-[350px] h-[50px]"
            type="fullName"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Họ tên"
            required
          />
        </div>
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
          Đăng ký tài khoản
        </Button>
      </div>
    </form>
  );
}
