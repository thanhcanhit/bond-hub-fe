"use client";

import type React from "react";

import { useState, useEffect, useRef } from "react";
import type { Message, Media, UserInfo } from "@/types/base";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatMessageTime } from "@/utils/dateUtils";
import { getUserInitials } from "@/utils/userUtils";
import Image from "next/image";
import {
  Download,
  X,
  ChevronLeft,
  ChevronRight,
  Share2,
  Forward,
  ZoomIn,
  ZoomOut,
  PanelRightClose,
  PanelRightOpen,
  RefreshCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { createPortal } from "react-dom";
import { useChatStore } from "@/stores/chatStore";
import { useConversationsStore } from "@/stores/conversationsStore";
import { useAuthStore } from "@/stores/authStore";
import { Popover, PopoverContent } from "@/components/ui/popover";
import { CheckCircle2 } from "lucide-react";

interface MessageDetailDialogProps {
  message: Message | null;
  isOpen: boolean;
  onClose: () => void;
  userInfo?: UserInfo; // Add userInfo for the sender
}

export default function MessageDetailDialog({
  message,
  isOpen,
  onClose,
  userInfo,
}: MessageDetailDialogProps) {
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
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
  const [showSidebar, setShowSidebar] = useState(true);
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [fileContent, setFileContent] = useState<string | null>(null);

  const { forwardMessageToRecipients } = useChatStore();
  const { conversations } = useConversationsStore();
  const currentUser = useAuthStore((state) => state.user);

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
      setShowSidebar(true);
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
      Math.min(3, zoomLevel + zoomDirection * 0.1),
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
      e.preventDefault();
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
      e.preventDefault();

      // Calculate the movement delta
      const dx = e.clientX - dragStart.x;
      const dy = e.clientY - dragStart.y;

      // Update drag start position for next move
      setDragStart({ x: e.clientX, y: e.clientY });

      // Update image position with smooth transition
      requestAnimationFrame(() => {
        setImagePosition((prev) => ({
          x: prev.x + dx,
          y: prev.y + dy,
        }));
      });
    }
  };

  const handleMouseUp = () => {
    if (isDragging) {
      setIsDragging(false);
      // Reset cursor style
      if (containerRef.current) {
        containerRef.current.style.cursor = "grab";
      }
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
    const newZoomLevel = Math.min(3, zoomLevel + 0.25);
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
    <div className="fixed inset-0 z-50 bg-black flex flex-col overflow-hidden">
      {/* Header */}
      <header className="h-12 flex items-center justify-between px-4 bg-black/90 text-white border-b border-gray-800">
        <div className="text-sm font-medium truncate">
          {currentMedia?.fileName ||
            (message.senderId === currentUser?.id
              ? currentUser?.userInfo?.fullName || "Bạn"
              : userInfo?.fullName ||
                message.sender?.userInfo?.fullName ||
                "Tin nhắn")}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/10 rounded-full h-8 w-8 hover:text-white"
            onClick={() => setShowSidebar(!showSidebar)}
          >
            {showSidebar ? (
              <PanelRightClose className="h-4 w-4" />
            ) : (
              <PanelRightOpen className="h-4 w-4" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/10 rounded-full h-8 w-8 hover:text-white"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* Main content area with sidebar */}
      <div className="flex flex-1 overflow-hidden">
        {/* Main content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 flex items-center justify-center relative overflow-hidden">
            {currentMedia && (
              <>
                {currentMedia.type === "IMAGE" ? (
                  <div
                    ref={containerRef}
                    className="relative max-h-full max-w-full w-auto h-auto "
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
                      className="object-contain max-h-[calc(100vh-96px)] w-auto h-auto will-change-transform"
                      width={1200}
                      height={800}
                      unoptimized
                      style={{
                        maxWidth: "100%",
                        transform: `scale(${zoomLevel})`,
                        transformOrigin: "center",
                        translate: `${imagePosition.x}px ${imagePosition.y}px`,
                        transition: isDragging
                          ? "none"
                          : "transform 0.1s ease-out, translate 0.1s ease-out",
                      }}
                    />
                    {zoomLevel > 1 && (
                      <div className="absolute top-4 right-4 text-white text-[10px] px-2 py-0.5 rounded drop-shadow-[0_0_2px_rgba(0,0,0,0.8)]">
                        {Math.round(zoomLevel * 100)}%
                      </div>
                    )}
                    {zoomLevel > 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute bottom-4 left-4 bg-white/20 text-white hover:bg-white/40 rounded-full"
                        onClick={resetZoom}
                      >
                        <RefreshCcw className="h-5 w-5" />
                      </Button>
                    )}
                  </div>
                ) : currentMedia.type === "VIDEO" ? (
                  <div className="relative max-h-full max-w-full w-auto h-auto">
                    <video
                      src={currentMedia.url}
                      controls
                      className="max-h-[calc(100vh-96px)] w-auto h-auto"
                      style={{ maxWidth: "100%" }}
                    />
                  </div>
                ) : (
                  <div className="bg-white rounded-lg max-w-5xl w-full max-h-[calc(100vh-96px)] flex flex-col overflow-hidden">
                    {/* Clean header with file info only */}
                    <div className="p-3 border-b flex items-center bg-gray-50">
                      <div className="flex items-center gap-3">
                        <div className="flex-shrink-0">
                          {getFileIcon(currentMedia.metadata.extension, 24)}
                        </div>
                        <div className="truncate">
                          <h3 className="font-medium text-base truncate max-w-[500px]">
                            {currentMedia.fileName}
                          </h3>
                          <p className="text-xs text-gray-500">
                            {currentMedia.metadata.sizeFormatted}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Content area */}
                    <div
                      className={`flex-1 ${
                        currentMedia.metadata.extension === "pdf"
                          ? "overflow-hidden"
                          : "overflow-auto"
                      } min-h-[300px] max-h-[calc(100vh-144px)]`}
                    >
                      {currentMedia.metadata.extension === "pdf" ? (
                        <iframe
                          src={`${currentMedia.url}#toolbar=0`}
                          className="w-full h-full min-h-[500px] border-0"
                          title={currentMedia.fileName}
                          style={{ height: "calc(100vh - 144px)" }}
                        />
                      ) : isOfficeDocument(currentMedia.metadata.extension) ? (
                        <iframe
                          src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(
                            currentMedia.url,
                          )}`}
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
                  className="absolute left-12 top-1/2 -translate-y-1/2 bg-black/30 text-white hover:bg-black/50 rounded-full h-10 w-10"
                  onClick={handlePrevMedia}
                >
                  <ChevronLeft className="h-6 w-6" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-12 top-1/2 -translate-y-1/2 bg-black/30 text-white hover:bg-black/50 rounded-full h-10 w-10"
                  onClick={handleNextMedia}
                >
                  <ChevronRight className="h-6 w-6" />
                </Button>
              </>
            )}
          </div>

          {/* Footer controls */}
          <div className="h-12 flex items-center justify-between px-4 bg-black/90 border-t border-gray-800">
            <div className="flex items-center gap-2">
              <div className="text-white text-sm">
                {currentMediaIndex + 1}/{message.content.media?.length || 1}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Nút tải xuống */}
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/10 rounded-full h-8 w-8 hover:text-white"
                onClick={() => currentMedia && handleDownload(currentMedia)}
              >
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        {showSidebar && (
          <div className="w-72 border-l border-gray-800 bg-black/80 flex flex-col overflow-hidden">
            {/* Sender info */}
            <div className="p-3 border-b border-gray-800">
              <div className="flex items-center gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage
                    src={
                      message.senderId === currentUser?.id
                        ? currentUser?.userInfo?.profilePictureUrl || undefined
                        : userInfo?.profilePictureUrl ||
                          message.sender?.userInfo?.profilePictureUrl ||
                          undefined
                    }
                    className="object-cover"
                  />
                  <AvatarFallback>
                    {message.senderId === currentUser?.id
                      ? getUserInitials(currentUser)
                      : getUserInitials(message.sender)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-sm font-medium text-white">
                    {message.senderId === currentUser?.id
                      ? currentUser?.userInfo?.fullName || "Bạn"
                      : userInfo?.fullName ||
                        message.sender?.userInfo?.fullName ||
                        "Người dùng"}
                  </h3>
                  <p className="text-xs text-gray-400">
                    {formatMessageTime(message.createdAt)}
                  </p>
                </div>
              </div>
              {message.content.text && (
                <p className="mt-2 text-sm text-gray-300 break-words">
                  {message.content.text}
                </p>
              )}
            </div>

            {/* Media thumbnails */}
            {hasMultipleMedia && (
              <div className="flex-1 overflow-y-auto p-2">
                <div className="grid grid-cols-2 gap-2">
                  {message.content.media?.map((media, index) => (
                    <div
                      key={media.fileId}
                      className={`relative aspect-square cursor-pointer rounded overflow-hidden ${
                        index === currentMediaIndex
                          ? "ring-2 ring-blue-500"
                          : ""
                      }`}
                      onClick={() => {
                        setCurrentMediaIndex(index);
                      }}
                    >
                      {media.type === "IMAGE" ? (
                        <Image
                          src={media.url || "/placeholder.svg"}
                          alt={media.fileName}
                          className="object-cover w-full h-full"
                          width={120}
                          height={120}
                          unoptimized
                        />
                      ) : media.type === "VIDEO" ? (
                        <div className="w-full h-full bg-gray-800 flex items-center justify-center relative">
                          {media.thumbnailUrl ? (
                            <Image
                              src={media.thumbnailUrl || "/placeholder.svg"}
                              alt={media.fileName}
                              className="object-cover w-full h-full"
                              width={120}
                              height={120}
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
                        <div className="w-full h-full bg-gray-700 flex flex-col items-center justify-center p-2">
                          {getFileIcon(media.metadata.extension, 24)}
                          <span className="text-xs mt-1 text-center truncate w-full text-white">
                            {media.fileName}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Sidebar actions */}
            <div className="p-3 border-t border-gray-800 flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                className="text-white hover:bg-white/10 hover:text-white"
                onClick={() =>
                  navigator.share &&
                  navigator.share({
                    title: "Chia sẻ",
                    url: window.location.href,
                  })
                }
              >
                <Share2 className="h-4 w-4 mr-2" />
                Chia sẻ
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-white hover:bg-white/10 hover:text-white"
                onClick={() => setIsForwardMenuOpen(true)}
              >
                <Forward className="h-4 w-4 mr-2" />
                Chuyển tiếp
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Zoom controls */}
      {currentMedia && currentMedia.type === "IMAGE" && (
        <div className="fixed right-4 top-1/2 -translate-y-1/2 bg-black/50 rounded-full p-1 flex flex-col gap-1 z-50">
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/10 rounded-full h-8 w-8 hover:text-white"
            onClick={zoomIn}
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
          <div className="w-1 h-20 bg-white/20 rounded-full mx-auto relative">
            <div
              className="w-1 bg-white rounded-full absolute bottom-0"
              style={{
                height: `${((zoomLevel - 1) / 2) * 100}%`,
                maxHeight: "100%",
              }}
            ></div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/10 rounded-full h-8 w-8 hover:text-white"
            onClick={zoomOut}
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Forward popover */}
      <Popover open={isForwardMenuOpen} onOpenChange={setIsForwardMenuOpen}>
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
                        conversation.contact.userInfo?.fullName || "Unknown",
                      )
                    }
                  >
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage
                          src={
                            conversation.contact.userInfo?.profilePictureUrl ||
                            undefined
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
    </div>,
    document.body,
  );
}
