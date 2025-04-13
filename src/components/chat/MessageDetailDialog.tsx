"use client";

import type React from "react";

import { useState, useEffect, useRef } from "react";
import type { Message, Media } from "@/types/base";
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
  Forward,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { createPortal } from "react-dom";
import { useChatStore } from "@/stores/chatStore";
import { useConversationsStore } from "@/stores/conversationsStore";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CheckCircle2 } from "lucide-react";

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
  const [isForwardMenuOpen, setIsForwardMenuOpen] = useState(false);
  const [selectedRecipients, setSelectedRecipients] = useState<
    Array<{ type: "USER" | "GROUP"; id: string; name: string }>
  >([]);
  const [forwardSuccess, setForwardSuccess] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imagePosition, setImagePosition] = useState({ x: 0, y: 0 });
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [fileContent, setFileContent] = useState<string | null>(null);

  const { forwardMessageToRecipients } = useChatStore();
  const { conversations } = useConversationsStore();

  // Helper functions for file handling
  const isOfficeDocument = (extension?: string) => {
    if (!extension) return false;
    const officeExtensions = ["doc", "docx", "xls", "xlsx", "ppt", "pptx"];
    return officeExtensions.includes(extension.toLowerCase());
  };

  const isTextFile = (extension?: string) => {
    if (!extension) return false;
    const textExtensions = [
      "txt",
      "md",
      "json",
      "js",
      "ts",
      "html",
      "css",
      "csv",
    ];
    return textExtensions.includes(extension.toLowerCase());
  };

  const getFileIcon = (extension?: string, size = 32) => {
    const iconSize = size;
    const strokeWidth = size <= 24 ? 2 : 1.5;

    if (!extension) {
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width={iconSize}
          height={iconSize}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-gray-500"
        >
          <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
          <polyline points="14 2 14 8 20 8" />
        </svg>
      );
    }

    switch (extension.toLowerCase()) {
      case "pdf":
        return (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width={iconSize}
            height={iconSize}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-red-500"
          >
            <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
            <polyline points="14 2 14 8 20 8" />
            <path d="M9 15v-1h6v1" />
            <path d="M9 18v-1h6v1" />
            <path d="M9 12v-1h6v1" />
          </svg>
        );
      case "doc":
      case "docx":
        return (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width={iconSize}
            height={iconSize}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-blue-600"
          >
            <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
            <polyline points="14 2 14 8 20 8" />
            <path d="M9 15h6" />
            <path d="M9 18h6" />
            <path d="M9 12h6" />
          </svg>
        );
      case "xls":
      case "xlsx":
        return (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width={iconSize}
            height={iconSize}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-green-600"
          >
            <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
            <polyline points="14 2 14 8 20 8" />
            <rect x="8" y="12" width="8" height="6" />
            <path d="M8 12v-2h8v2" />
          </svg>
        );
      case "ppt":
      case "pptx":
        return (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width={iconSize}
            height={iconSize}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-orange-600"
          >
            <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
            <polyline points="14 2 14 8 20 8" />
            <circle cx="12" cy="14" r="4" />
          </svg>
        );
      case "txt":
      case "md":
      case "json":
      case "js":
      case "ts":
      case "html":
      case "css":
      case "csv":
        return (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width={iconSize}
            height={iconSize}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-gray-600"
          >
            <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="8" y1="13" x2="16" y2="13" />
            <line x1="8" y1="17" x2="16" y2="17" />
          </svg>
        );
      default:
        return (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width={iconSize}
            height={iconSize}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-gray-500"
          >
            <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
        );
    }
  };

  // Reset states when dialog opens
  useEffect(() => {
    if (isOpen) {
      setSelectedRecipients([]);
      setForwardSuccess(false);
      setIsForwardMenuOpen(false);
    }
  }, [isOpen]);

  // Fetch text file content when needed
  useEffect(() => {
    let currentMedia: Media | null = null;
    if (message?.content.media && message.content.media.length > 0) {
      currentMedia = message.content.media[currentMediaIndex];
    } else if (message?.content.image) {
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
    } else if (message?.content.video) {
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
    if (currentMedia && isTextFile(currentMedia.metadata.extension)) {
      setFileContent(null); // Reset content while loading

      fetch(currentMedia.url)
        .then((response) => response.text())
        .then((text) => {
          setFileContent(text);
        })
        .catch((error) => {
          console.error("Error fetching text file:", error);
          setFileContent("Error loading file content.");
        });
    }
  }, [message, currentMediaIndex]);

  useEffect(() => {
    setMounted(true);

    // Khi dialog mở, ngăn cuộn trang
    if (isOpen) {
      document.body.style.overflow = "hidden";
    }

    // Reset zoom when dialog opens or closes
    setZoomLevel(1);
    setImagePosition({ x: 0, y: 0 });

    return () => {
      // Khi dialog đóng, cho phép cuộn trang trở lại
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const handleForwardMessage = async () => {
    if (!message || selectedRecipients.length === 0) return;

    const recipients = selectedRecipients.map((recipient) => ({
      type: recipient.type,
      id: recipient.id,
    }));

    const success = await forwardMessageToRecipients(message.id, recipients);

    if (success) {
      setForwardSuccess(true);
      // Auto close the forward menu after success
      setTimeout(() => {
        setIsForwardMenuOpen(false);
        setSelectedRecipients([]);
        setForwardSuccess(false);
      }, 2000);
    }
  };

  const toggleRecipient = (
    type: "USER" | "GROUP",
    id: string,
    name: string,
  ) => {
    setSelectedRecipients((prev) => {
      const exists = prev.some((r) => r.id === id && r.type === type);

      if (exists) {
        return prev.filter((r) => !(r.id === id && r.type === type));
      } else {
        return [...prev, { type, id, name }];
      }
    });
  };

  if (!message || !mounted || !isOpen) return null;

  const handleDownload = (media: Media) => {
    // Use fetch to get the file as a blob
    fetch(media.url)
      .then((response) => response.blob())
      .then((blob) => {
        // Create a blob URL for the file
        const blobUrl = URL.createObjectURL(blob);

        // Create a temporary anchor element
        const link = document.createElement("a");
        link.href = blobUrl;
        link.download = media.fileName;

        // Append to body, click, and clean up
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // Release the blob URL
        setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
      })
      .catch((error) => {
        console.error("Download failed:", error);
      });
  };

  const handlePrevMedia = () => {
    if (message?.content.media && message.content.media.length > 1) {
      setCurrentMediaIndex((prev) =>
        prev === 0 ? message.content.media!.length - 1 : prev - 1,
      );
      resetZoom();
    }
  };

  const handleNextMedia = () => {
    if (message?.content.media && message.content.media.length > 1) {
      setCurrentMediaIndex((prev) =>
        prev === message.content.media!.length - 1 ? 0 : prev + 1,
      );
      resetZoom();
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (!currentMedia || currentMedia.type !== "IMAGE") return;

    e.preventDefault();

    // Determine zoom direction
    const zoomDirection = e.deltaY < 0 ? 1 : -1;

    // Calculate new zoom level
    const newZoomLevel = Math.max(
      1,
      Math.min(2.5, zoomLevel + zoomDirection * 0.1),
    );

    // Only update if zoom level changed
    if (newZoomLevel !== zoomLevel) {
      setZoomLevel(newZoomLevel);

      // Reset position when zooming back to 1
      if (newZoomLevel === 1) {
        setImagePosition({ x: 0, y: 0 });
      }
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoomLevel > 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX, y: e.clientY });
      // Change cursor style
      if (containerRef.current) {
        containerRef.current.style.cursor = "grabbing";
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && zoomLevel > 1) {
      const dx = e.clientX - dragStart.x;
      const dy = e.clientY - dragStart.y;

      setImagePosition({
        x: imagePosition.x + dx / zoomLevel,
        y: imagePosition.y + dy / zoomLevel,
      });

      setDragStart({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    // Reset cursor style
    if (containerRef.current) {
      containerRef.current.style.cursor = "grab";
    }
  };

  const resetZoom = () => {
    setZoomLevel(1);
    setImagePosition({ x: 0, y: 0 });
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

  // Add zoom control functions
  const zoomIn = () => {
    const newZoomLevel = Math.min(2.5, zoomLevel + 0.25);
    setZoomLevel(newZoomLevel);
  };

  const zoomOut = () => {
    const newZoomLevel = Math.max(1, zoomLevel - 0.25);
    setZoomLevel(newZoomLevel);
    if (newZoomLevel === 1) {
      setImagePosition({ x: 0, y: 0 });
    }
  };

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
          <Popover open={isForwardMenuOpen} onOpenChange={setIsForwardMenuOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/10 rounded-full h-8 w-8"
              >
                <Forward className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="end">
              {!forwardSuccess ? (
                <div className="max-h-80 overflow-auto">
                  <div className="p-3 border-b">
                    <h3 className="font-medium">Chuyển tiếp tới</h3>
                    {selectedRecipients.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {selectedRecipients.map((recipient) => (
                          <div
                            key={`${recipient.type}-${recipient.id}`}
                            className="bg-blue-100 text-blue-800 text-xs rounded-full px-2 py-1 flex items-center gap-1"
                          >
                            <span>{recipient.name}</span>
                            <button
                              className="text-blue-600 hover:text-blue-800"
                              onClick={() =>
                                toggleRecipient(
                                  recipient.type,
                                  recipient.id,
                                  recipient.name,
                                )
                              }
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="divide-y">
                    {conversations.map((conversation) => (
                      <div
                        key={conversation.contact.id}
                        className={`p-3 flex items-center justify-between hover:bg-gray-50 cursor-pointer ${
                          selectedRecipients.some(
                            (r) => r.id === conversation.contact.id,
                          )
                            ? "bg-blue-50"
                            : ""
                        }`}
                        onClick={() =>
                          toggleRecipient(
                            conversation.type as "USER" | "GROUP",
                            conversation.contact.id,
                            conversation.contact.userInfo?.fullName ||
                              "Unknown",
                          )
                        }
                      >
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarImage
                              src={
                                conversation.contact.userInfo
                                  ?.profilePictureUrl || undefined
                              }
                            />
                            <AvatarFallback>
                              {conversation.contact.userInfo?.fullName
                                ?.slice(0, 2)
                                .toUpperCase() || "??"}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium">
                              {conversation.contact.userInfo?.fullName}
                            </p>
                            <p className="text-xs text-gray-500">
                              {conversation.type === "GROUP"
                                ? "Nhóm"
                                : "Người dùng"}
                            </p>
                          </div>
                        </div>
                        {selectedRecipients.some(
                          (r) => r.id === conversation.contact.id,
                        ) && <CheckCircle2 className="h-5 w-5 text-blue-600" />}
                      </div>
                    ))}
                  </div>
                  <div className="p-3 border-t">
                    <Button
                      className="w-full"
                      disabled={selectedRecipients.length === 0}
                      onClick={handleForwardMessage}
                    >
                      Chuyển tiếp
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="p-4 text-center">
                  <CheckCircle2 className="h-8 w-8 text-green-600 mx-auto mb-2" />
                  <p className="font-medium">Đã chuyển tiếp thành công!</p>
                </div>
              )}
            </PopoverContent>
          </Popover>

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
                <div
                  ref={containerRef}
                  className="relative max-h-full max-w-full w-auto h-auto overflow-hidden"
                  onWheel={handleWheel}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                  style={{ cursor: zoomLevel > 1 ? "grab" : "default" }}
                >
                  <Image
                    ref={imageRef}
                    src={currentMedia.url || "/placeholder.svg"}
                    alt={currentMedia.fileName}
                    className="object-contain max-h-[80vh] w-auto h-auto transition-transform duration-100"
                    width={1200}
                    height={800}
                    unoptimized
                    style={{
                      maxWidth: "90vw",
                      transform: `scale(${zoomLevel}) translate(${imagePosition.x}px, ${imagePosition.y}px)`,
                      transformOrigin: "center",
                    }}
                  />
                  {zoomLevel > 1 && (
                    <div className="absolute top-4 right-4 text-white text-[10px] px-2 py-0.5 rounded drop-shadow-[0_0_2px_rgba(0,0,0,0.8)]">
                      {Math.round(zoomLevel * 100)}%
                    </div>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute bottom-4 right-4 bg-white/20 text-white hover:bg-white/40 rounded-full"
                    onClick={() => currentMedia && handleDownload(currentMedia)}
                  >
                    <Download className="h-5 w-5" />
                  </Button>
                  {zoomLevel > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute bottom-4 left-4 bg-white/20 text-white hover:bg-white/40 rounded-full"
                      onClick={resetZoom}
                    >
                      <X className="h-5 w-5" />
                    </Button>
                  )}
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
                <div className="bg-white rounded-lg max-w-5xl w-full max-h-[80vh] flex flex-col overflow-hidden">
                  {/* Clean header with file info and download button */}
                  <div className="p-3 border-b flex items-center justify-between bg-gray-50">
                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0">
                        {getFileIcon(currentMedia.metadata.extension, 24)}
                      </div>
                      <div className="truncate">
                        <h3 className="font-medium text-base truncate max-w-[300px]">
                          {currentMedia.fileName}
                        </h3>
                        <p className="text-xs text-gray-500">
                          {currentMedia.metadata.sizeFormatted}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        currentMedia && handleDownload(currentMedia)
                      }
                      className="flex items-center gap-1.5"
                    >
                      <Download className="h-4 w-4" />
                      <span>Tải xuống</span>
                    </Button>
                  </div>

                  {/* Content area */}
                  <div className="flex-1 overflow-auto min-h-[300px] max-h-[calc(80vh-60px)]">
                    {currentMedia.metadata.extension === "pdf" ? (
                      <iframe
                        src={`${currentMedia.url}#toolbar=0`}
                        className="w-full h-full min-h-[500px] border-0"
                        title={currentMedia.fileName}
                      />
                    ) : isOfficeDocument(currentMedia.metadata.extension) ? (
                      <iframe
                        src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(currentMedia.url)}`}
                        className="w-full h-full min-h-[500px] border-0"
                        title={currentMedia.fileName}
                      />
                    ) : isTextFile(currentMedia.metadata.extension) ? (
                      <div className="p-4 font-mono text-sm whitespace-pre-wrap h-full overflow-auto">
                        {fileContent || (
                          <div className="flex items-center justify-center h-full">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                        <div className="mb-4 p-6 bg-gray-50 rounded-full">
                          {getFileIcon(currentMedia.metadata.extension, 64)}
                        </div>
                        <p className="text-gray-500 mb-4">
                          Không thể hiển thị trực tiếp tệp này. Vui lòng tải
                          xuống để xem.
                        </p>
                      </div>
                    )}
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
                        src={media.url || "/placeholder.svg"}
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
                            src={media.thumbnailUrl || "/placeholder.svg"}
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
                      {getFileIcon(media.metadata.extension, 32)}
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
      {currentMedia && currentMedia.type === "IMAGE" && (
        <div className="fixed right-0 top-1/2 -translate-y-1/2 bg-black/30 rounded-l-md p-1 flex flex-col gap-1 z-50">
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/10 rounded-full h-8 w-8"
            onClick={zoomIn}
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
          <div className="w-1 h-20 bg-white/20 rounded-full mx-auto relative">
            <div
              className="w-1 bg-white rounded-full absolute bottom-0"
              style={{
                height: `${((zoomLevel - 1) / 1.5) * 100}%`,
                maxHeight: "100%",
              }}
            ></div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/10 rounded-full h-8 w-8"
            onClick={zoomOut}
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Thumbnails at bottom */}
      {hasMultipleMedia && !showGrid && (
        <div className="absolute bottom-16 left-0 right-0 flex justify-center overflow-x-auto py-2 px-4 bg-black/40">
          <div className="flex gap-2 max-w-full">
            {message.content.media?.map((media, index) => (
              <div
                key={media.fileId}
                className={`relative cursor-pointer transition-all ${
                  index === currentMediaIndex
                    ? "border-2 border-white scale-110 z-10"
                    : "border border-white/30 opacity-70 hover:opacity-100"
                }`}
                onClick={() => {
                  setCurrentMediaIndex(index);
                  resetZoom();
                }}
              >
                {media.type === "IMAGE" ? (
                  <Image
                    src={media.url || "/placeholder.svg"}
                    alt={media.fileName}
                    className="object-cover w-14 h-14"
                    width={56}
                    height={56}
                    unoptimized
                  />
                ) : media.type === "VIDEO" ? (
                  <div className="w-14 h-14 bg-gray-800 flex items-center justify-center">
                    {media.thumbnailUrl ? (
                      <Image
                        src={media.thumbnailUrl || "/placeholder.svg"}
                        alt={media.fileName}
                        className="object-cover w-full h-full"
                        width={56}
                        height={56}
                        unoptimized
                      />
                    ) : (
                      <div className="flex items-center justify-center w-full h-full">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="text-white"
                        >
                          <polygon points="5 3 19 12 5 21 5 3" />
                        </svg>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="w-14 h-14 bg-gray-100 flex items-center justify-center">
                    {getFileIcon(media.metadata.extension, 20)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>,
    document.body,
  );
}
