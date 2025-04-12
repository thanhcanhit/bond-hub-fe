"use client";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, Download } from "lucide-react";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { QRCodeSVG } from "qrcode.react";
import { useRef } from "react";

interface QRCodeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
}

export default function QRCodeDialog({
  isOpen,
  onClose,
  userId,
}: QRCodeDialogProps) {
  const qrCodeValue = `friend-${userId}`;
  const qrRef = useRef<SVGSVGElement>(null);

  // Hàm tải xuống mã QR dưới dạng hình ảnh PNG
  const downloadQRCode = () => {
    if (!qrRef.current) return;

    try {
      // Tạo một canvas từ SVG
      const svg = qrRef.current;
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const svgData = new XMLSerializer().serializeToString(svg);
      const img = new Image();

      // Thiết lập kích thước canvas
      canvas.width = 300;
      canvas.height = 300;

      // Tạo Blob từ SVG
      const svgBlob = new Blob([svgData], {
        type: "image/svg+xml;charset=utf-8",
      });
      const url = URL.createObjectURL(svgBlob);

      img.onload = () => {
        if (!ctx) return;

        // Vẽ hình ảnh lên canvas
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(url);

        // Chuyển đổi canvas thành URL và tải xuống
        canvas.toBlob((blob) => {
          if (!blob) return;

          const downloadUrl = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = downloadUrl;
          a.download = `qrcode-${userId}.png`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(downloadUrl);
        }, "image/png");
      };

      img.src = url;
    } catch (error) {
      console.error("Error downloading QR code:", error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[400px] p-0 overflow-hidden bg-white border-none">
        <VisuallyHidden>
          <DialogTitle>Mã QR kết bạn</DialogTitle>
        </VisuallyHidden>
        <div className="relative w-full flex flex-col items-center justify-center p-6">
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 z-10"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </Button>

          <h2 className="text-xl font-semibold mb-4">Mã QR kết bạn</h2>
          <p className="text-sm text-gray-500 mb-6 text-center">
            Chia sẻ mã QR này để người khác có thể quét và kết bạn với bạn
          </p>

          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-4">
            <div className="w-[250px] h-[250px] flex items-center justify-center">
              <QRCodeSVG
                value={qrCodeValue}
                size={250}
                level="L"
                includeMargin={true}
                ref={qrRef}
                bgColor="#FFFFFF"
                fgColor="#000000"
              />
            </div>
          </div>

          <Button
            variant="outline"
            onClick={downloadQRCode}
            className="mb-4 flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Tải mã QR
          </Button>

          <div className="text-sm text-center font-medium text-gray-700 mt-2">
            Quét mã để kết bạn
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
