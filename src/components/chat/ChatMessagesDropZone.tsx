"use client";

import { ReactNode, DragEvent, useState } from "react";

interface ChatMessagesDropZoneProps {
  children: ReactNode;
  onFileDrop: (files: File[]) => void;
}

export default function ChatMessagesDropZone({
  children,
  onFileDrop,
}: ChatMessagesDropZoneProps) {
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files);
      onFileDrop(files);
    }
  };

  return (
    <div
      className={`relative flex-1 overflow-y-auto ${
        isDraggingOver ? "bg-blue-50" : ""
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isDraggingOver && (
        <div className="absolute inset-0 bg-blue-100/50 border-2  border-blue-300 flex items-center justify-center z-10">
          <div className="bg-white p-4 rounded-lg shadow-lg">
            <p className="text-blue-600 font-medium">Thả để gửi ngay lập tức</p>
          </div>
        </div>
      )}
      {children}
    </div>
  );
}
