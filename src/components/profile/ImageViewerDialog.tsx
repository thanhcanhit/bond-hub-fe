"use client";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import Image from "next/image";
import { X } from "lucide-react";
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
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[90vw] max-h-[90vh] p-0 overflow-hidden bg-black/90 border-none">
        <VisuallyHidden>
          <DialogTitle>Xem hình ảnh</DialogTitle>
        </VisuallyHidden>
        <div className="relative w-full h-full flex items-center justify-center">
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 z-10 bg-black/50 hover:bg-black/70 text-white rounded-full"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </Button>

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
