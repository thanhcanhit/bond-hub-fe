"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Media } from "@/types/base";
import Image from "next/image";

interface MediaGalleryViewProps {
  mediaFiles: (Media & { createdAt: Date })[];
  onClose: () => void;
}

type SortOption = "date" | "sender";
type TabType = "media" | "files" | "links";

interface MediaByDate {
  date: string;
  media: (Media & { createdAt: Date })[];
}

export default function MediaGalleryView({
  mediaFiles,
  onClose,
}: MediaGalleryViewProps) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [sortBy, setSortBy] = useState<SortOption>("date");
  const [mediaByDate, setMediaByDate] = useState<MediaByDate[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>("media");

  // Group media by date
  useEffect(() => {
    const groupMediaByDate = () => {
      const groups: { [key: string]: (Media & { createdAt: Date })[] } = {};

      // Sort media files by date (newest first)
      const sortedMedia = [...mediaFiles].sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
      );

      sortedMedia.forEach((media) => {
        const date = formatDateHeader(media.createdAt);
        if (!groups[date]) {
          groups[date] = [];
        }
        groups[date].push(media);
      });

      // Convert to array format for rendering
      const result: MediaByDate[] = Object.keys(groups).map((date) => ({
        date,
        media: groups[date],
      }));

      setMediaByDate(result);
    };

    groupMediaByDate();
  }, [mediaFiles]);

  // Format date for header (e.g., "Ngày 16 Tháng 4")
  const formatDateHeader = (date: Date): string => {
    const day = date.getDate();
    const month = date.getMonth() + 1;
    return `Ngày ${day} Tháng ${month}`;
  };

  return (
    <div className="flex flex-col bg-white h-full w-full">
      {/* Header */}
      <div className="p-4 flex  items-center justify-between border-b">
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="icon"
            className="mr-2"
            onClick={onClose}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h2 className="font-semibold">Kho lưu trữ</h2>
        </div>
        <Button variant="ghost" size="sm" className="text-sm">
          Chọn
        </Button>
      </div>

      {/* Tab buttons */}
      <div className="w-full grid grid-cols-3 border-b rounded-none h-12 flex-shrink-0">
        <button
          onClick={() => setActiveTab("media")}
          className={`text-sm ${activeTab === "media" ? "border-b-2 border-blue-500 font-medium" : ""}`}
        >
          Ảnh/Video
        </button>
        <button
          onClick={() => setActiveTab("files")}
          className={`text-sm ${activeTab === "files" ? "border-b-2 border-blue-500 font-medium" : ""}`}
        >
          Files
        </button>
        <button
          onClick={() => setActiveTab("links")}
          className={`text-sm ${activeTab === "links" ? "border-b-2 border-blue-500 font-medium" : ""}`}
        >
          Links
        </button>
      </div>

      {/* Content area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Media content */}
        {activeTab === "media" && (
          <div className="overflow-hidden flex flex-col flex-1">
            {/* Sort options */}
            {/* <div className="bg-gray-100 p-2 flex justify-between border-b flex-shrink-0">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="flex items-center gap-1 text-xs bg-gray-200 rounded-md px-4 py-1.5">
                  Người gửi <ChevronDown className="h-3 w-3 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setSortBy("sender")}>
                  Người gửi
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy("date")}>
                  Ngày gửi
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="flex items-center gap-1 text-xs bg-gray-200 rounded-md px-4 py-1.5">
                  Ngày gửi <ChevronDown className="h-3 w-3 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setSortBy("date")}>
                  Ngày gửi
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div> */}

            {/* Media content */}
            <div className="flex-1 overflow-y-auto w-full h-full">
              {mediaByDate.length > 0 ? (
                mediaByDate.map((group) => (
                  <div key={group.date} className="w-full mb-4">
                    <h3 className="font-medium text-sm px-3 py-2 sticky top-0 bg-white z-10">
                      {group.date}
                    </h3>
                    <div className="grid grid-cols-3 w-full gap-1 px-1">
                      {group.media.map((media, index) => (
                        <div
                          key={`${media.fileId}-${index}`}
                          className="aspect-square rounded-sm overflow-hidden"
                        >
                          <Image
                            src={media.url}
                            alt={media.fileName}
                            className="object-cover w-full h-full"
                            width={500}
                            height={500}
                            unoptimized
                          />
                          {media.metadata?.extension?.match(
                            /mp4|webm|mov/i,
                          ) && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                              <Video className="h-6 w-6 text-white" />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    <div className="text-xs text-gray-500 px-3 py-1">
                      {group.media.length} ảnh trong {new Date().getFullYear()}
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex-1 flex items-center justify-center h-full">
                  <p className="text-gray-500">Không có hình ảnh nào</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Files content */}
        {activeTab === "files" && (
          <div className="flex-1 overflow-hidden flex flex-col h-full">
            <div className="flex-1 flex flex-col items-center justify-center">
              <div className="w-16 h-20 bg-blue-50 rounded-lg flex items-center justify-center mb-2">
                <div className="w-10 h-12 bg-blue-100 rounded-sm relative">
                  <div className="absolute top-0 right-0 w-3 h-3 bg-blue-50 rounded-br-sm"></div>
                </div>
              </div>
              <p className="text-gray-500 text-sm">Chưa có File</p>
            </div>
          </div>
        )}

        {/* Links content */}
        {activeTab === "links" && (
          <div className="flex-1 overflow-hidden flex flex-col h-full">
            {/* Giả sử không có links - hiển thị trạng thái trống */}
            <div className="flex-1 flex flex-col items-center justify-center">
              <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-2">
                <svg
                  width="32"
                  height="32"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M9 17H7C5.89543 17 5 16.1046 5 15V9C5 7.89543 5.89543 7 7 7H9M15 17H17C18.1046 17 19 16.1046 19 15V9C19 7.89543 18.1046 7 17 7H15M9 12H15"
                    stroke="#93C5FD"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <p className="text-gray-500 text-sm">Chưa có Link</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
