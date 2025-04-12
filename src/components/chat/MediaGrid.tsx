"use client";

import { Media } from "@/types/base";
import Image from "next/image";
import { Download, FileText, Play } from "lucide-react";

interface MediaGridProps {
  media: Media[];
  onDownload: (media: Media) => void;
  onClick?: () => void;
}

export default function MediaGrid({
  media,
  onDownload,
  onClick,
}: MediaGridProps) {
  const images = media.filter((item) => item.type === "IMAGE");
  const videos = media.filter((item) => item.type === "VIDEO");
  const files = media.filter(
    (item) => item.type !== "IMAGE" && item.type !== "VIDEO",
  );

  const gridMedia = [...images, ...videos, ...files];

  gridMedia.sort((a, b) => {
    if (a.type === "IMAGE" && b.type !== "IMAGE") return -1;
    if (a.type !== "IMAGE" && b.type === "IMAGE") return 1;
    if (a.type === "VIDEO" && b.type !== "VIDEO" && b.type !== "IMAGE")
      return -1;
    if (a.type !== "VIDEO" && a.type !== "IMAGE" && b.type === "VIDEO")
      return 1;
    return 0;
  });

  // Xác định layout grid dựa trên số lượng media
  const getGridLayout = (count: number) => {
    if (count === 1)
      return {
        cols: "grid-cols-1",
        itemClass: "aspect-video",
      };
    if (count === 2)
      return {
        cols: "grid-cols-2",
        itemClass: "aspect-square",
      };
    if (count === 3)
      return {
        cols: "grid-cols-3",
        itemClass: "aspect-square",
      };
    if (count === 4)
      return {
        cols: "grid-cols-2",
        itemClass: "aspect-square",
      };
    if (count <= 6)
      return {
        cols: "grid-cols-3",
        itemClass: "aspect-square",
      };
    if (count <= 9)
      return {
        cols: "grid-cols-3",
        itemClass: "aspect-square",
      };
    if (count <= 12)
      return {
        cols: "grid-cols-4",
        itemClass: "aspect-square",
      };
    return {
      cols: "grid-cols-5",
      itemClass: "aspect-square",
    };
  };

  // Xác định kích thước cho item đầu tiên
  const getFirstItemClass = (total: number) => {
    if (total <= 3) return "";
    if (total >= 4) return "col-span-2 row-span-2";
    return "";
  };

  const maxDisplay = 16; // Giới hạn tối đa 16 items
  const hasMore = gridMedia.length > maxDisplay;
  const displayMedia = gridMedia.slice(0, maxDisplay);
  const layout = getGridLayout(displayMedia.length);

  return (
    <div className={`grid gap-1 ${layout.cols} w-full`}>
      {displayMedia.map((item, index) => (
        <div
          key={item.fileId}
          className={`relative overflow-hidden rounded-md ${layout.itemClass} ${
            index === 0 ? getFirstItemClass(displayMedia.length) : ""
          }`}
        >
          {item.type === "IMAGE" ? (
            <div
              className="w-full h-full cursor-pointer isolate"
              onClick={onClick}
            >
              <Image
                src={item.url}
                alt={item.fileName}
                className="object-cover w-full h-full"
                width={200}
                height={200}
                unoptimized
              />
              <div className="absolute inset-0 bg-black/0 hover:bg-black/20 transition-all duration-200" />
              <div className="absolute top-2 left-2 bg-black/50 text-white text-xs px-1.5 py-0.5 rounded">
                HD
              </div>
              <button
                className="absolute bottom-2 right-2 bg-white/80 p-1 rounded-full shadow-sm hover:bg-white/100 transition-opacity opacity-0 hover:opacity-100"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onDownload(item);
                }}
              >
                <Download className="h-4 w-4" />
              </button>
            </div>
          ) : item.type === "VIDEO" ? (
            <div className="w-full h-full cursor-pointer isolate">
              <div className="w-full h-full relative">
                {item.thumbnailUrl ? (
                  <Image
                    src={item.thumbnailUrl}
                    alt={item.fileName}
                    className="object-cover w-full h-full"
                    width={200}
                    height={200}
                    unoptimized
                  />
                ) : (
                  <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                    <Play className="h-8 w-8 text-white" />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center hover:bg-black/50 transition-all duration-200">
                  <Play className="h-10 w-10 text-white" />
                </div>
                <div className="absolute top-2 left-2 bg-black/50 text-white text-xs px-1.5 py-0.5 rounded">
                  HD
                </div>
                <button
                  className="absolute bottom-2 right-2 bg-white/80 p-1 rounded-full shadow-sm hover:bg-white/100 transition-opacity opacity-0 hover:opacity-100"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onDownload(item);
                  }}
                >
                  <Download className="h-4 w-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="w-full h-full bg-gray-100 flex flex-col items-center justify-center p-2 hover:bg-gray-200 transition-colors duration-200 isolate">
              <FileText className="h-8 w-8 text-gray-500 mb-1" />
              <span className="text-xs text-gray-700 font-medium truncate w-full text-center">
                {item.fileName}
              </span>
              <span className="text-xs text-gray-500">
                {item.metadata.sizeFormatted}
              </span>
              <button
                className="mt-2 bg-white p-1 rounded-full shadow hover:bg-gray-100 transition-opacity opacity-0 hover:opacity-100"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onDownload(item);
                }}
              >
                <Download className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Hiển thị số lượng ảnh còn lại */}
          {index === maxDisplay - 1 && hasMore && (
            <div
              className="absolute inset-0 bg-black/60 flex items-center justify-center text-white font-bold text-xl cursor-pointer hover:bg-black/70 transition-colors"
              onClick={onClick}
            >
              +{gridMedia.length - maxDisplay}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
