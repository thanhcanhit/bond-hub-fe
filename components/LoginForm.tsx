import { useState } from "react";
import { useAuthStore } from "@/stores/authStore";
import { useRouter } from "next/navigation";

export default function LoginForm() {
  const { loginWithPhoneNumber } = useAuthStore();
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
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

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <input
        type="phoneNumber"
        value={phoneNumber}
        onChange={(e) => setPhoneNumber(e.target.value)}
        placeholder="Phone number"
        required
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Mật khẩu"
        required
      />
      <button type="submit">Đăng nhập</button>
    </form>
  );
}