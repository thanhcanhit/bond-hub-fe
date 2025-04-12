"use client";

import { useState, useEffect } from "react";
import { Message, Media } from "@/types/base";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatMessageTime, formatMessageDate } from "@/utils/dateUtils";
import Image from "next/image";
import {
  Download,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Share2,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { createPortal } from "react-dom";

interface MessageDetailDialogProps {
  message: Message | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function MessageDetailDialog({
  message,
  isOpen,
  onClose,
}: MessageDetailDialogProps) {
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const [showGrid, setShowGrid] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    // Khi dialog mở, ngăn cuộn trang
    if (isOpen) {
      document.body.style.overflow = "hidden";
    }

    return () => {
      // Khi dialog đóng, cho phép cuộn trang trở lại
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!message || !mounted || !isOpen) return null;

  const handleDownload = (media: Media) => {
    const link = document.createElement("a");
    link.href = media.url;
    link.download = media.fileName;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.setAttribute("download", media.fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrevMedia = () => {
    if (message?.content.media && message.content.media.length > 1) {
      setCurrentMediaIndex((prev) =>
        prev === 0 ? message.content.media!.length - 1 : prev - 1,
      );
    }
  };

  const handleNextMedia = () => {
    if (message?.content.media && message.content.media.length > 1) {
      setCurrentMediaIndex((prev) =>
        prev === message.content.media!.length - 1 ? 0 : prev + 1,
      );
    }
  };

  // Xác định media hiện tại để hiển thị
  let currentMedia: Media | null = null;
  if (message.content.media && message.content.media.length > 0) {
    currentMedia = message.content.media[currentMediaIndex];
  } else if (message.content.image) {
    currentMedia = {
      url: message.content.image,
      type: "IMAGE",
      fileId: "legacy-image",
      fileName: "image.jpg",
      metadata: {
        path: "",
        size: 0,
        mimeType: "image/jpeg",
        extension: "jpg",
        bucketName: "",
        uploadedAt: new Date().toISOString(),
        sizeFormatted: "",
      },
    };
  } else if (message.content.video) {
    currentMedia = {
      url: message.content.video,
      type: "VIDEO",
      fileId: "legacy-video",
      fileName: "video.mp4",
      metadata: {
        path: "",
        size: 0,
        mimeType: "video/mp4",
        extension: "mp4",
        bucketName: "",
        uploadedAt: new Date().toISOString(),
        sizeFormatted: "",
      },
    };
  }

  const hasMultipleMedia =
    message.content.media && message.content.media.length > 1;

  // Sử dụng createPortal để render dialog trực tiếp vào body
  return createPortal(
    <div className="fixed inset-0 z-50 bg-black/95 flex flex-col overflow-hidden">
      <header className="p-4 flex flex-row items-center justify-between bg-black/80 text-white">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Avatar className="h-8 w-8">
              <AvatarImage
                src={message.sender?.userInfo?.profilePictureUrl || undefined}
              />
              <AvatarFallback>
                {message.sender?.userInfo?.fullName
                  ?.slice(0, 2)
                  .toUpperCase() || "??"}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="text-sm font-medium">
                {message.sender?.userInfo?.fullName || "Người dùng"}
              </h3>
              <p className="text-xs text-gray-400">
                {formatMessageTime(message.createdAt)}
              </p>
            </div>
          </div>

          <div className="bg-gray-500/50 px-3 py-1 rounded-full text-xs text-white">
            {formatMessageDate(message.createdAt)}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/10 rounded-full h-8 w-8"
            onClick={() =>
              navigator.share &&
              navigator.share({ title: "Chia sẻ", url: window.location.href })
            }
          >
            <Share2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/10 rounded-full h-8 w-8"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {!showGrid ? (
        // Hiển thị media đơn lẻ
        <div className="flex-1 flex items-center justify-center relative overflow-hidden">
          {currentMedia && (
            <>
              {currentMedia.type === "IMAGE" ? (
                <div className="relative max-h-full max-w-full w-auto h-auto">
                  <Image
                    src={currentMedia.url}
                    alt={currentMedia.fileName}
                    className="object-contain max-h-[80vh] w-auto h-auto"
                    width={1200}
                    height={800}
                    unoptimized
                    style={{ maxWidth: "90vw" }}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute bottom-4 right-4 bg-white/20 text-white hover:bg-white/40 rounded-full"
                    onClick={() => currentMedia && handleDownload(currentMedia)}
                  >
                    <Download className="h-5 w-5" />
                  </Button>
                </div>
              ) : currentMedia.type === "VIDEO" ? (
                <div className="relative max-h-full max-w-full w-auto h-auto">
                  <video
                    src={currentMedia.url}
                    controls
                    className="max-h-[80vh] w-auto h-auto"
                    style={{ maxWidth: "90vw" }}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute bottom-4 right-4 bg-white/20 text-white hover:bg-white/40 rounded-full"
                    onClick={() => currentMedia && handleDownload(currentMedia)}
                  >
                    <Download className="h-5 w-5" />
                  </Button>
                </div>
              ) : (
                <div className="bg-white p-8 rounded-lg">
                  <div className="flex flex-col items-center">
                    <div className="mb-4 p-4 bg-gray-100 rounded-full">
                      {currentMedia.metadata.extension === "pdf" ? (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="48"
                          height="48"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                          <polyline points="14 2 14 8 20 8" />
                          <path d="M9 15v-1h6v1" />
                          <path d="M9 18v-1h6v1" />
                          <path d="M9 12v-1h6v1" />
                        </svg>
                      ) : (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="48"
                          height="48"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                          <polyline points="14 2 14 8 20 8" />
                        </svg>
                      )}
                    </div>
                    <h3 className="text-lg font-medium mb-1">
                      {currentMedia.fileName}
                    </h3>
                    <p className="text-sm text-gray-500 mb-4">
                      {currentMedia.metadata.sizeFormatted}
                    </p>
                    <Button
                      onClick={() =>
                        currentMedia && handleDownload(currentMedia)
                      }
                      className="flex items-center gap-2"
                    >
                      <Download className="h-4 w-4" />
                      <span>Tải xuống</span>
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Nút điều hướng giữa các media */}
          {hasMultipleMedia && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/30 text-white hover:bg-black/50 rounded-full h-10 w-10"
                onClick={handlePrevMedia}
              >
                <ChevronLeft className="h-6 w-6" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/30 text-white hover:bg-black/50 rounded-full h-10 w-10"
                onClick={handleNextMedia}
              >
                <ChevronRight className="h-6 w-6" />
              </Button>
            </>
          )}
        </div>
      ) : (
        // Hiển thị grid tất cả media
        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-3 gap-1 max-w-4xl mx-auto">
            {message.content.media &&
              message.content.media.map((media, index) => (
                <div
                  key={media.fileId}
                  className={`relative aspect-square cursor-pointer ${index === currentMediaIndex ? "ring-2 ring-blue-500" : ""}`}
                  onClick={() => {
                    setCurrentMediaIndex(index);
                    setShowGrid(false);
                  }}
                >
                  {media.type === "IMAGE" ? (
                    <>
                      <div className="absolute top-1 left-1 z-10 bg-black/50 text-white text-xs px-1 py-0.5 rounded">
                        HD
                      </div>
                      <Image
                        src={media.url}
                        alt={media.fileName}
                        className="object-cover w-full h-full"
                        width={150}
                        height={150}
                        unoptimized
                      />
                    </>
                  ) : media.type === "VIDEO" ? (
                    <>
                      <div className="absolute top-1 left-1 z-10 bg-black/50 text-white text-xs px-1 py-0.5 rounded">
                        HD
                      </div>
                      <div className="w-full h-full bg-gray-800 flex items-center justify-center relative">
                        {media.thumbnailUrl ? (
                          <Image
                            src={media.thumbnailUrl}
                            alt={media.fileName}
                            className="object-cover w-full h-full"
                            width={150}
                            height={150}
                            unoptimized
                          />
                        ) : (
                          <video
                            src={media.url}
                            className="object-cover w-full h-full"
                            style={{ objectFit: "cover" }}
                          />
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="w-full h-full bg-gray-100 flex flex-col items-center justify-center p-2">
                      <div className="absolute top-1 left-1 z-10 bg-black/50 text-white text-xs px-1 py-0.5 rounded">
                        HD
                      </div>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="32"
                        height="32"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                        <polyline points="14 2 14 8 20 8" />
                      </svg>
                      <span className="text-xs mt-1 text-center truncate w-full">
                        {media.fileName}
                      </span>
                    </div>
                  )}
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Phần nội dung tin nhắn */}
      {message.content.text && (
        <div className="p-4 bg-white shadow-md mb-4 mx-auto rounded-lg max-w-4xl">
          <p className="text-gray-800 font-medium">{message.content.text}</p>
        </div>
      )}

      {/* Thanh điều khiển phía dưới */}
      <div className="p-3 bg-black/80 flex items-center justify-between border-t border-gray-700">
        <div className="flex items-center gap-2">
          <div className="text-white text-sm">
            {currentMediaIndex + 1}/{message.content.media?.length || 1}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Nút chuyển đổi giữa chế độ xem đơn lẻ và grid */}
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/10 rounded-full h-8 w-8"
            onClick={() => setShowGrid(!showGrid)}
          >
            {showGrid ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <div className="grid grid-cols-2 gap-0.5">
                <div className="w-1.5 h-1.5 bg-white rounded-sm"></div>
                <div className="w-1.5 h-1.5 bg-white rounded-sm"></div>
                <div className="w-1.5 h-1.5 bg-white rounded-sm"></div>
                <div className="w-1.5 h-1.5 bg-white rounded-sm"></div>
              </div>
            )}
          </Button>

          {/* Nút tải xuống */}
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/10 rounded-full h-8 w-8"
            onClick={() => currentMedia && handleDownload(currentMedia)}
          >
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Thanh cuộn bên phải */}
      <div className="fixed right-0 top-1/2 -translate-y-1/2 bg-black/30 rounded-l-md p-1 flex flex-col gap-1 z-50">
        <Button
          variant="ghost"
          size="icon"
          className="text-white hover:bg-white/10 rounded-full h-8 w-8"
        >
          <ChevronUp className="h-4 w-4" />
        </Button>
        <div className="w-1 h-20 bg-white/20 rounded-full mx-auto"></div>
        <Button
          variant="ghost"
          size="icon"
          className="text-white hover:bg-white/10 rounded-full h-8 w-8"
        >
          <ChevronDown className="h-4 w-4" />
        </Button>
      </div>
    </div>,
    document.body,
  );
}
