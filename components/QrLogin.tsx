import { useState, useEffect } from "react";
import { QRCodeCanvas } from "qrcode.react";
import api from "@/lib/api";
import { useAuthStore } from "../stores/authStore";

export default function QrLogin() {
  const [qrCode, setQrCode] = useState("");
  const { setAccessToken } = useAuthStore();

  useEffect(() => {
    // Gọi API lấy mã QR khi component được render
    api.get("/qr/generate").then((res) => setQrCode(res.data.qrCode));

    // Lắng nghe server trả về kết quả đăng nhập (có thể dùng WebSocket nếu cần)
    const interval = setInterval(async () => {
      if (!qrCode) return;
      try {
        const res = await api.post("/qr/login-status", { qrCode });
        if (res.data.accessToken) {
          setAccessToken(res.data.accessToken);
          clearInterval(interval);
        }
      } catch (error) {}
    }, 3000); // Kiểm tra mỗi 3 giây

    return () => clearInterval(interval);
  }, [qrCode, setAccessToken]);

  return (
    <div className="flex flex-col items-center">
      {qrCode && <QRCodeCanvas value={qrCode} size={200} />}
    </div>
  );
}
