"use client";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import Image from "next/image";
import { X, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

interface ImageViewerDialogProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  alt?: string;
}

export default function ImageViewerDialog({
  isOpen,
  onClose,
  imageUrl,
  alt = "Hình ảnh",
}: ImageViewerDialogProps) {
  // Function to handle image download
  const handleDownload = async () => {
    try {
      // Fetch the image
      const response = await fetch(imageUrl);
      const blob = await response.blob();

      // Create a download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;

      // Create a proper filename with .jpg extension
      let filename = "image.jpg";

      // Try to extract a meaningful name from the URL if possible
      if (imageUrl) {
        // Remove query parameters
        const urlWithoutParams = imageUrl.split("?")[0];
        // Get the last part of the path
        const urlParts = urlWithoutParams.split("/");
        const lastPart = urlParts[urlParts.length - 1];

        if (lastPart) {
          // Check if it has a file extension
          const hasExtension = /\.(jpg|jpeg|png|gif|webp)$/i.test(lastPart);

          if (hasExtension) {
            // Use the filename as is
            filename = lastPart;
          } else {
            // Add .jpg extension
            filename = `${lastPart}.jpg`;
          }
        }
      }

      // Set the download attribute with the filename
      link.setAttribute("download", filename);

      // Trigger download
      document.body.appendChild(link);
      link.click();

      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading image:", error);
    }
  };
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[90vw] max-h-[90vh] p-0 overflow-hidden bg-black/90 border-none">
        <VisuallyHidden>
          <DialogTitle>Xem hình ảnh</DialogTitle>
        </VisuallyHidden>
        <div className="relative w-full h-full flex items-center justify-center">
          <div className="absolute top-2 right-2 z-10 flex space-x-2">
            <Button
              variant="ghost"
              size="icon"
              className="bg-black/50 hover:bg-black/70 text-white rounded-full"
              onClick={handleDownload}
              title="Tải xuống"
            >
              <Download className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="bg-black/50 hover:bg-black/70 text-white rounded-full"
              onClick={onClose}
              title="Đóng"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          <div className="relative w-full h-full max-h-[85vh] flex items-center justify-center">
            <Image
              src={imageUrl}
              alt={alt}
              className="object-contain max-h-[85vh] max-w-[85vw]"
              width={1200}
              height={800}
              unoptimized={true}
              priority={true}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
