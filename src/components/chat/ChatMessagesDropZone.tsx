"use client";

import { ReactNode, DragEvent, useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import { AlertCircle } from "lucide-react";

interface ChatMessagesDropZoneProps {
  children: ReactNode;
  onFileDrop: (files: File[]) => void;
}

export default function ChatMessagesDropZone({
  children,
  onFileDrop,
}: ChatMessagesDropZoneProps) {
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  // Danh sách các định dạng file an toàn được chấp nhận
  const safeDocumentTypes = [
    ".pdf",
    ".doc",
    ".docx",
    ".xls",
    ".xlsx",
    ".ppt",
    ".pptx",
    ".txt",
    ".csv",
    ".rtf",
    ".odt",
    ".ods",
    ".odp",
  ];

  // Kiểm tra xem file có an toàn không
  const isSafeFile = (file: File): boolean => {
    const fileType = file.type.split("/")[0]; // image, video, application, etc.
    const fileExtension = `.${file.name.split(".").pop()?.toLowerCase() || ""}`;

    // Chấp nhận hình ảnh và video
    if (fileType === "image" || fileType === "video") {
      return true;
    }

    // Kiểm tra các định dạng tài liệu an toàn
    if (safeDocumentTypes.includes(fileExtension)) {
      return true;
    }

    return false;
  };

  // Sử dụng biến đếm để tránh hiệu ứng giật khi di chuyển chuột qua các phần tử con
  const dragCounter = useRef(0);

  // Reset trạng thái khi component unmount
  useEffect(() => {
    return () => {
      dragCounter.current = 0;
      setIsDraggingOver(false);
    };
  }, []);

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    if (dragCounter.current === 1) {
      setIsDraggingOver(true);
    }
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setIsDraggingOver(false);
    }
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current = 0;
    setIsDraggingOver(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const allFiles = Array.from(e.dataTransfer.files);

      // Lọc các file an toàn
      const safeFiles = allFiles.filter((file) => isSafeFile(file));

      // Hiển thị thông báo nếu có file bị từ chối
      if (safeFiles.length !== allFiles.length) {
        const rejectedCount = allFiles.length - safeFiles.length;
        toast.error(
          `${rejectedCount} file không được chấp nhận do không an toàn`,
          {
            description:
              "Chỉ chấp nhận hình ảnh, video và các tài liệu văn phòng phổ biến",
            icon: <AlertCircle className="h-5 w-5" />,
          },
        );
      }

      // Chỉ gửi các file an toàn
      if (safeFiles.length > 0) {
        onFileDrop(safeFiles);
      }
    }
  };

  return (
    <div
      className="relative flex-1 overflow-y-auto"
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Sử dụng CSS transition để hiệu ứng mượt mà hơn */}
      <div
        className={`absolute inset-0 bg-blue-100/50 border-2 border-blue-300 flex items-center justify-center z-10 pointer-events-none transition-opacity duration-300 ${isDraggingOver ? "opacity-100" : "opacity-0"}`}
        style={{ visibility: isDraggingOver ? "visible" : "hidden" }}
      >
        <div className="bg-white p-4 rounded-lg shadow-lg">
          <p className="text-blue-600 font-medium">Thả để gửi ngay lập tức</p>
          <p className="text-gray-500 text-sm mt-1">
            Chỉ chấp nhận hình ảnh, video và tài liệu an toàn
          </p>
        </div>
      </div>
      {children}
    </div>
  );
}
