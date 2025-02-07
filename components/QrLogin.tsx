import { useState, useEffect } from "react";
import { QRCodeCanvas } from "qrcode.react";
import api from "@/lib/api";
import { useAuthStore } from "../stores/authStore";

export default function QrLogin() {
  const [qrToken, setQrToken] = useState("");
  const { setAccessToken } = useAuthStore();
  useEffect(() => {
    // Gọi API để tạo mã QR khi component được mount
    const generateQrCode = async () => {
      try {
        const res = await api.post("/qrcode/generate");
        setQrToken(res.data.qrCode); // Giả định API trả về { qrCode: "token" }
      } catch (error) {
        console.error("Lỗi khi tạo mã QR:", error);
      }
    };

    generateQrCode();
  }, []);

  useEffect(() => {
    // Gọi API lấy mã QR khi component được render
    // api.get("/qr/generate").then((res) => setQrCode(res.data.qrCode));

    // Lắng nghe server trả về kết quả đăng nhập (có thể dùng WebSocket nếu cần)
    const interval = setInterval(async () => {
      if (!qrToken) return;
      try {
        const res = await api.get(`/qrcode/status/${qrToken}`);
        if (res.data.accessToken) {
          setAccessToken(res.data.accessToken);
          clearInterval(interval);
        }
      } catch (error) {
        console.error("Lỗi khi kiểm tra mã QR:", error);
      }
    }, 3000); // Kiểm tra mỗi 3 giây

    return () => clearInterval(interval);
  }, [qrToken, setAccessToken]);

  return (
    <div className="flex flex-col items-center">
      {qrToken ? (
        <QRCodeCanvas value={qrToken} size={200} />
      ) : (
        <p>Đang tạo mã QR...</p>
      )}
    </div>
  );
}
