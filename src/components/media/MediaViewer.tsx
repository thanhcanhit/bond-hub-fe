"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Media, User } from "@/types/base";
import Image from "next/image";
import { ChevronUp, ChevronDown } from "lucide-react";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { getUserDataById } from "@/actions/user.action";

interface MediaViewerProps {
  isOpen: boolean;
  onClose: () => void;
  media: (Media & {
    createdAt?: Date;
    sender?: {
      id: string;
      userInfo?: {
        fullName?: string;
        profilePictureUrl?: string;
      };
    };
    senderId?: string;
  })[];
  initialIndex?: number;
  chatName?: string;
}

export default function MediaViewer({
  isOpen,
  onClose,
  media,
  initialIndex = 0,
  chatName = "Cloud của tôi",
}: MediaViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isLoading, setIsLoading] = useState(true);

  // Group media by date
  const mediaByDate = useMemo(() => {
    const groups: { [key: string]: (Media & { createdAt?: Date })[] } = {};

    media.forEach((item) => {
      if (!item.createdAt) return;

      const date = new Date(item.createdAt);
      const dateKey = `${date.getDate()}/${date.getMonth() + 1}`;

      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }

      groups[dateKey].push(item);
    });

    return Object.entries(groups).map(([date, items]) => ({
      date,
      items,
    }));
  }, [media]);

  // Reset current index when media array changes
  useEffect(() => {
    setCurrentIndex(initialIndex);
  }, [media, initialIndex]);

  // Reset loading state when current index changes
  useEffect(() => {
    setIsLoading(true);
  }, [currentIndex]);

  const currentMedia = media[currentIndex];
  const isVideo = currentMedia?.metadata?.extension?.match(/mp4|webm|mov/i);

  // State để lưu thông tin người gửi
  const [senderInfo, setSenderInfo] = useState<User | null>(null);

  // Lấy thông tin người gửi
  useEffect(() => {
    if (!currentMedia) return;

    console.log("Current Media:", currentMedia);

    // Nếu đã có thông tin người gửi đầy đủ trong currentMedia.sender
    if (currentMedia.sender?.userInfo?.fullName) {
      console.log("Using sender info from media:", currentMedia.sender);
      setSenderInfo(currentMedia.sender as User);
      return;
    }

    // Nếu có sender.id hoặc senderId, gọi API để lấy thông tin
    const senderId = currentMedia.sender?.id || currentMedia.senderId;
    if (senderId) {
      console.log("Fetching sender info for ID:", senderId);

      const fetchSenderInfo = async () => {
        try {
          const result = await getUserDataById(senderId);
          if (result.success && result.user) {
            console.log("Sender info fetched:", result.user);
            setSenderInfo(result.user);
          }
        } catch (error) {
          console.error("Error fetching sender info:", error);
        }
      };

      fetchSenderInfo();
    } else {
      console.log("No sender ID available");
      // Trong tin nhắn riêng, người gửi có thể là người đối diện (chatName)
      // Nhưng chúng ta không có đủ thông tin để hiển thị
    }
  }, [currentMedia]);

  // Define navigation functions
  const handlePrevious = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    } else {
      // Loop to the end if at the beginning
      setCurrentIndex(media.length - 1);
    }
  }, [currentIndex, media.length]);

  const handleNext = useCallback(() => {
    if (currentIndex < media.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      // Loop to the beginning if at the end
      setCurrentIndex(0);
    }
  }, [currentIndex, media.length]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case "ArrowLeft":
          handlePrevious();
          break;
        case "ArrowRight":
          handleNext();
          break;
        case "Escape":
          onClose();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, handlePrevious, handleNext, onClose]);

  // Function to handle media download
  const handleDownload = async () => {
    try {
      // Fetch the media
      const response = await fetch(currentMedia.url);
      const blob = await response.blob();

      // Create a download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download =
        currentMedia.fileName || `file.${currentMedia.metadata.extension}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading media:", error);
    }
  };

  if (!currentMedia) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[100vw] max-h-[100vh] w-screen h-screen p-0 overflow-hidden bg-black border-none flex flex-col !rounded-none">
        <DialogTitle>
          {/* Top bar */}
          <div className="h-10 bg-[#333333] flex items-center justify-center">
            <div className="text-white font-semibold">{chatName}</div>
          </div>
          <VisuallyHidden>Xem hình ảnh/video</VisuallyHidden>
        </DialogTitle>

        <div className="flex flex-col -mt-4 space-y-0 flex-1">
          <div className="flex flex-row justify-between flex-1">
            <div className="flex flex-row relative flex-1">
              {/* Main content area */}
              <div className="flex flex-1 items-center justify-between flex-1 relative py-5">
                {isVideo ? (
                  <video
                    src={currentMedia.url}
                    controls
                    autoPlay
                    className="max-h-[calc(70vh-20px)] max-w-[calc(70vw-80px)]"
                    onLoadStart={() => setIsLoading(true)}
                    onLoadedData={() => setIsLoading(false)}
                  />
                ) : (
                  <div className="flex items-center justify-center">
                    {/* {isLoading && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-8 h-8 border-4 border-t-transparent border-white rounded-full animate-spin"></div>
                      </div>
                    )} */}
                    <div className="flex items-center justify-center">
                      <Image
                        src={currentMedia.url}
                        alt={currentMedia.fileName || "Media"}
                        width={1200}
                        height={800}
                        className={`object-contain max-h-[70vh] max-w-[100vw] ${
                          isLoading ? "opacity-0" : "opacity-100"
                        }`}
                        onLoad={() => setIsLoading(false)}
                        unoptimized
                      />
                    </div>
                  </div>
                )}
              </div>
              {/* Navigation buttons */}
              <div className="flex flex-col items-center justify-center space-y-1 mr-3 absolute right-0 top-1/2 -translate-y-1/2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full bg-black/50 text-white hover:bg-black/70"
                  onClick={handlePrevious}
                >
                  <ChevronUp className="h-5 w-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full bg-black/50 text-white hover:bg-black/70"
                  onClick={handleNext}
                >
                  <ChevronDown className="h-5 w-5" />
                </Button>
              </div>
            </div>

            {/* Sidebar with thumbnails */}
            <div className="w-[120px] bg-[#212121] border-l border-gray-800 flex flex-col items-center overflow-hidden h-full">
              {/* Date header */}
              <div className="p-1 border-b border-gray-800 text-white w-full">
                <div className="text-xs text-gray-400 text-center">14/04</div>
              </div>

              {/* Thumbnails navigation */}
              <div
                className="overflow-y-auto items-center h-[calc(100vh-130px)] w-full hide-scrollbar"
                style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
              >
                <style jsx>{`
                  .hide-scrollbar::-webkit-scrollbar {
                    display: none;
                  }
                `}</style>
                {mediaByDate.map((group, groupIndex) => (
                  <div key={groupIndex} className="mb-2">
                    <div className="space-y-2 px-1">
                      {group.items.map((item) => {
                        // Find the index of this item in the full media array
                        const mediaIndex = media.findIndex(
                          (m) => m.fileId === item.fileId,
                        );
                        const isActive = mediaIndex === currentIndex;

                        return (
                          <div
                            key={item.fileId}
                            className={`relative justidfy-center m-2 items-center cursor-pointer overflow-hidden rounded-md border border-gray-500 ${isActive ? "border-2 " : ""}`}
                            onClick={() =>
                              mediaIndex >= 0 && setCurrentIndex(mediaIndex)
                            }
                          >
                            <div className="aspect-square w-[90px] h-[90px] ">
                              <Image
                                src={item.url}
                                alt={item.fileName || "Thumbnail"}
                                width={50}
                                height={50}
                                className="w-full h-full object-cover"
                                unoptimized
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Bottom controls */}
          <div className="bg-[#1a1a1a] text-white h-[40px] flex items-center justify-between px-4 mt-auto border-t border-gray-800">
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 rounded-full overflow-hidden bg-gray-700 flex items-center justify-center">
                  {senderInfo?.userInfo?.profilePictureUrl ? (
                    <Image
                      src={senderInfo.userInfo.profilePictureUrl}
                      alt={senderInfo.userInfo?.fullName || "User"}
                      width={24}
                      height={24}
                      className="w-full h-full object-cover"
                      unoptimized
                    />
                  ) : (
                    <span className="text-xs text-white">
                      {senderInfo?.userInfo?.fullName?.charAt(0) || "U"}
                    </span>
                  )}
                </div>
                <div className="text-xs text-gray-300 flex items-center">
                  <span>{senderInfo?.userInfo?.fullName || "Như Tâm"}</span>
                  <span className="mx-2 text-gray-500">|</span>
                  <span className="text-gray-400">
                    {currentMedia.createdAt
                      ? new Date(currentMedia.createdAt).toLocaleTimeString(
                          "vi-VN",
                          {
                            hour: "2-digit",
                            minute: "2-digit",
                          },
                        ) +
                        " " +
                        new Date(currentMedia.createdAt).toLocaleDateString(
                          "vi-VN",
                          {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                          },
                        )
                      : ""}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-white hover:bg-gray-800 rounded-full"
                onClick={handleDownload}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="7 10 12 15 17 10"></polyline>
                  <line x1="12" y1="15" x2="12" y2="3"></line>
                </svg>
              </Button>
              <div className="h-5 w-[1px] bg-gray-700"></div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-white hover:bg-gray-800 rounded-full"
                onClick={() => {}}
                title="Tính năng đang phát triển"
                disabled
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path>
                  <polyline points="16 6 12 2 8 6"></polyline>
                  <line x1="12" y1="2" x2="12" y2="15"></line>
                </svg>
              </Button>
              <div className="h-5 w-[1px] bg-gray-700"></div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-white hover:bg-gray-800 rounded-full"
                onClick={() => {}}
                title="Tính năng đang phát triển"
                disabled
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10"></circle>
                  <circle cx="12" cy="12" r="3"></circle>
                </svg>
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
