import { useState, useEffect } from "react";
import { QRCodeCanvas } from "qrcode.react";
import api from "@/lib/api";
import { useAuthStore } from "../stores/authStore";

export default function QrLogin() {
  const [qrToken, setQrToken] = useState("");
  const { setAccessToken } = useAuthStore();
  useEffect(() => {
    const generateQrCode = async () => {
      try {
        const res = await api.post("/qrcode/generate");
        setQrToken((res.data as { qrToken: string }).qrToken);
      } catch (error) {
        console.error("Lỗi khi tạo mã QR:", error);
      }
    };

    generateQrCode();
  }, []);

  useEffect(() => {

    const interval = setInterval(async () => {
      if (!qrToken) return;
      try {
        const res = await api.get(`/qrcode/status/${qrToken}`);
        const data = res.data as { accessToken?: string };
        if (data.accessToken) {
          setAccessToken((res.data as { accessToken: string }).accessToken);
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
        <div className="flex flex-col items-center gap-9">
          <div className="h-[290px] w-[235px] flex flex-col items-center border border-gray-300 p-4 rounded-[20px] space-y-4"> 
            <div>
              <QRCodeCanvas value={qrToken} size={200} />
            </div>
            <div className="text-center">
              <p className="text-[#2a83f7] text-[18px]">Chỉ dùng để đăng nhập</p>
              <p>Bondhub trên máy tính</p>
            </div>
          </div>
          <div className="h-[105px] w-[515px] text-center border border-gray-300 p-4 rounded-[30px]">
            <p>Nâng cao hiệu quả công việc với Bondhub PC</p>
            <p>Coming soon...</p>
          </div>
        </div>
        
      ) : (
        <p>Đang tạo mã QR...</p>
      )}
    </div>
  );
}
