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
  // Lọc ra các media là hình ảnh
  const images = media.filter((item) => item.type === "IMAGE");
  // Lọc ra các media là video
  const videos = media.filter((item) => item.type === "VIDEO");
  // Lọc ra các media là file
  const files = media.filter(
    (item) => item.type !== "IMAGE" && item.type !== "VIDEO",
  );

  // Tất cả media hiển thị dưới dạng grid (ưu tiên hình ảnh và video)
  const gridMedia = [...images, ...videos, ...files];

  // Sắp xếp lại để đảm bảo hình ảnh và video hiển thị trước
  gridMedia.sort((a, b) => {
    // Ưu tiên hình ảnh
    if (a.type === "IMAGE" && b.type !== "IMAGE") return -1;
    if (a.type !== "IMAGE" && b.type === "IMAGE") return 1;
    // Sau đó đến video
    if (a.type === "VIDEO" && b.type !== "VIDEO" && b.type !== "IMAGE")
      return -1;
    if (a.type !== "VIDEO" && a.type !== "IMAGE" && b.type === "VIDEO")
      return 1;
    // Mặc định giữ nguyên thứ tự
    return 0;
  });

  // Xác định số cột dựa trên số lượng media
  const getGridColumns = (count: number) => {
    if (count === 1) return "grid-cols-1";
    if (count === 2) return "grid-cols-2";
    if (count === 3) return "grid-cols-3";
    if (count === 4) return "grid-cols-2 grid-rows-2";
    if (count >= 5) return "grid-cols-3 grid-rows-3";
    return "grid-cols-3"; // Mặc định 3 cột cho 5+ items
  };

  // Xác định kích thước cho mỗi item dựa trên số lượng và vị trí
  const getItemClass = (index: number, total: number) => {
    if (total === 1) return "col-span-1 row-span-1 aspect-video";
    if (total === 2) return "col-span-1 row-span-1 aspect-square";
    if (total === 3) return "col-span-1 row-span-1 aspect-square";
    if (total === 4) {
      return "col-span-1 row-span-1 aspect-square";
    }
    // Với 5+ items
    if (index === 0 && total >= 5) {
      return "col-span-2 row-span-2 aspect-square"; // Item đầu tiên lớn hơn
    }
    return "col-span-1 row-span-1 aspect-square";
  };

  // Xác định chiều cao tối đa cho grid
  const getMaxHeight = (count: number) => {
    if (count <= 2) return "max-h-[300px]";
    if (count <= 4) return "max-h-[400px]";
    return "max-h-[500px]";
  };

  // Giới hạn số lượng hiển thị
  const maxDisplay = 9;
  const hasMore = gridMedia.length > maxDisplay;
  const displayMedia = gridMedia.slice(0, maxDisplay);

  return (
    <>
      <div
        className={`grid gap-1 ${getGridColumns(gridMedia.length)} ${getMaxHeight(gridMedia.length)} overflow-y-auto`}
      >
        {displayMedia.map((item, index) => (
          <div
            key={item.fileId}
            className={`relative overflow-hidden rounded-md ${getItemClass(index, gridMedia.length)}`}
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
                  width={300}
                  height={300}
                  unoptimized
                />
                <div className="absolute inset-0 bg-black/0 hover:bg-black/20 transition-all duration-200"></div>
                <div className="absolute top-2 left-2 bg-black/50 text-white text-xs px-1.5 py-0.5 rounded">
                  HD
                </div>
                <button
                  className="absolute bottom-2 right-2 bg-white/80 p-1 rounded-full shadow-sm hover:bg-white/100 transition-opacity opacity-0 peer-hover:opacity-100 hover:opacity-100"
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
                      width={300}
                      height={300}
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
    </>
  );
}
