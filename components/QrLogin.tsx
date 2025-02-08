import { useState, useEffect } from "react";
import { QRCodeCanvas } from "qrcode.react";
import api from "@/lib/api";
import { useAuthStore } from "../stores/authStore";
import { useRouter } from "next/navigation";

export default function QrLogin() {
  const [qrToken, setQrToken] = useState("");
  const [expiresAt, setExpiresAt] = useState<number>(0);
  const [isQrExpired, setIsQrExpired] = useState<boolean>(false);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const { setAccessToken } = useAuthStore();
  const router = useRouter();
  const generateQrCode = async () => {
    try {
      const res = await api.post("/qrcode/generate");
      setQrToken((res.data as { qrToken: string; expires_in: number }).qrToken);
      setExpiresAt(Date.now() + res.data.expires_in * 1000);
      setIsQrExpired(false);
      console.log(res.data);
    } catch (error) {
      console.error("Lỗi khi tạo mã QR:", error);
    }
  };
  useEffect(() => {
    generateQrCode();
  }, []);

  useEffect(() => {
    const interval = setInterval(async () => {
      if (!qrToken) return;
      if (Date.now() > expiresAt) {
        setIsQrExpired(true);
        return;
      }
      try {
        const res = await api.get(`/qrcode/status/${qrToken}`);
        const data = res.data as { accessToken?: string };
        if (data.accessToken) {
          setAccessToken(data.accessToken);
          setIsLoggedIn(true);
          clearInterval(interval);
        }
      } catch (error) {
        console.error("Lỗi khi kiểm tra mã QR:", error);
      }
    }, 3000); // Kiểm tra mỗi 3 giây

    return () => clearInterval(interval);
  }, [qrToken, setAccessToken, expiresAt]);

  useEffect(() => {
    if (isLoggedIn) {
      router.push("/"); // Điều hướng tới trang chủ sau khi đăng nhập thành công
    }
  }, [isLoggedIn, router]);

  return (
    <div className="flex flex-col items-center">
      {qrToken ? (
        <div className="flex flex-col items-center gap-9">
          <div className="h-[290px] w-[235px] flex flex-col items-center border border-gray-300 p-4 rounded-[20px] space-y-4">
            <div>
              {isQrExpired ? (
                <div>
                  <p>Mã QR hết hạn</p>
                  <button
                    onClick={() => generateQrCode()}
                    className="bg-[#2a83f7] text-white px-4 py-2 rounded-[10px]"
                  >
                    Lấy mã mới
                  </button>
                </div>
              ) : (
                <QRCodeCanvas value={qrToken} size={200} />
              )}
            </div>
            <div className="text-center">
              <p className="text-[#2a83f7] text-[18px]">
                Chỉ dùng để đăng nhập
              </p>
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
