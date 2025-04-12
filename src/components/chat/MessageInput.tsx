"use client";

import { Button } from "@/components/ui/button";
import { useState, useRef, useEffect, DragEvent } from "react";
import {
  Paperclip,
  Smile,
  Send,
  X,
  Reply,
  ImageIcon,
  FileText,
  Play,
  Sticker,
  Gift,
  MoreHorizontal,
  Wand2,
  Trash2,
} from "lucide-react";
import { Message } from "@/types/base";
import EmojiPicker, { EmojiClickData } from "emoji-picker-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Image from "next/image";

interface MessageInputProps {
  onSendMessage: (message: string, files?: File[]) => void;
  disabled?: boolean;
  replyingTo?: Message | null;
  onCancelReply?: () => void;
}

export default function MessageInput({
  onSendMessage,
  disabled = false,
  replyingTo,
  onCancelReply,
}: MessageInputProps) {
  const [message, setMessage] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<
    { file: File; url: string; type: string }[]
  >([]);
  const [isDragging, setIsDragging] = useState(false);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const emojiButtonRef = useRef<HTMLButtonElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputContainerRef = useRef<HTMLDivElement>(null);

  // Xử lý khi chọn file
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      addFiles(newFiles);
    }
  };

  // Hàm chung để xử lý thêm files
  const addFiles = (newFiles: File[]) => {
    setSelectedFiles((prev) => [...prev, ...newFiles]);

    // Tạo preview URLs cho các file
    newFiles.forEach((file) => {
      const fileType = file.type.split("/")[0]; // image, video, application, etc.

      if (fileType === "image") {
        const url = URL.createObjectURL(file);
        setPreviewUrls((prev) => [...prev, { file, url, type: "image" }]);
      } else if (fileType === "video") {
        const url = URL.createObjectURL(file);
        setPreviewUrls((prev) => [...prev, { file, url, type: "video" }]);
      } else {
        // For other file types (documents, etc.)
        setPreviewUrls((prev) => [...prev, { file, url: "", type: "file" }]);
      }
    });
  };

  // Xử lý khi kéo file vào
  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (
    e: DragEvent<HTMLDivElement>,
    sendImmediately = false,
  ) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const newFiles = Array.from(e.dataTransfer.files);

      if (sendImmediately) {
        // Gửi ngay lập tức nếu thả vào khu vực xem tin nhắn
        onSendMessage("", newFiles);
      } else {
        // Hiển thị preview nếu thả vào ô input
        addFiles(newFiles);
      }
    }
  };

  // Xử lý khi xóa file
  const handleRemoveFile = (fileToRemove: File) => {
    setSelectedFiles((prev) => prev.filter((file) => file !== fileToRemove));
    setPreviewUrls((prev) => {
      const filtered = prev.filter((item) => item.file !== fileToRemove);
      // Revoke object URL to avoid memory leaks
      const itemToRemove = prev.find((item) => item.file === fileToRemove);
      if (itemToRemove && itemToRemove.url) {
        URL.revokeObjectURL(itemToRemove.url);
      }
      return filtered;
    });
  };

  // Xử lý khi xóa tất cả file
  const handleRemoveAllFiles = () => {
    // Revoke all object URLs
    previewUrls.forEach((item) => {
      if (item.url) URL.revokeObjectURL(item.url);
    });
    setSelectedFiles([]);
    setPreviewUrls([]);
  };

  // Xử lý khi nhấn nút đính kèm file
  const handleAttachClick = () => {
    fileInputRef.current?.click();
  };

  const handleSendMessage = () => {
    if ((message.trim() || selectedFiles.length > 0) && !disabled) {
      onSendMessage(
        message,
        selectedFiles.length > 0 ? selectedFiles : undefined,
      );
      setMessage("");
      handleRemoveAllFiles(); // Clear files after sending
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    setMessage((prev) => prev + emojiData.emoji);
  };

  // Đóng emoji picker khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        emojiPickerRef.current &&
        !emojiPickerRef.current.contains(event.target as Node) &&
        emojiButtonRef.current &&
        !emojiButtonRef.current.contains(event.target as Node)
      ) {
        setShowEmojiPicker(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Helper function to get a preview of the message content
  const getMessagePreview = (message: Message): string => {
    if (message.content.text) {
      return message.content.text;
    }

    if (message.content.media && message.content.media.length > 0) {
      const mediaCount = message.content.media.length;
      const firstMedia = message.content.media[0];

      if (mediaCount === 1) {
        if (firstMedia.type === "IMAGE") {
          return `[Hình ảnh: ${firstMedia.fileName}]`;
        } else if (firstMedia.type === "VIDEO") {
          return `[Video: ${firstMedia.fileName}]`;
        } else {
          return `[Tệp: ${firstMedia.fileName}]`;
        }
      } else {
        // Multiple media items
        if (firstMedia.type === "IMAGE") {
          return `[${mediaCount} hình ảnh]`;
        } else if (firstMedia.type === "VIDEO") {
          return `[${mediaCount} video]`;
        } else {
          return `[${mediaCount} tệp]`;
        }
      }
    }

    if (message.content.image) {
      return "[Hình ảnh]";
    }

    if (message.content.video) {
      return "[Video]";
    }

    return "";
  };

  return (
    <div className="border-t bg-white flex flex-col">
      {/* Reply preview */}
      {replyingTo && (
        <div className="px-3 py-2 border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-gray-100 p-1 rounded-full">
              <Reply className="h-4 w-4 text-gray-600" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Trả lời</span>
              <Avatar className="h-5 w-5">
                <AvatarImage
                  src={
                    replyingTo.sender?.userInfo?.profilePictureUrl || undefined
                  }
                />
                <AvatarFallback>
                  {replyingTo.sender?.userInfo?.fullName
                    ?.slice(0, 2)
                    .toUpperCase() || "??"}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm text-gray-600 truncate max-w-[200px]">
                {replyingTo.recalled
                  ? "Tin nhắn đã được thu hồi"
                  : getMessagePreview(replyingTo)}
              </span>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 rounded-full hover:bg-gray-100"
            onClick={onCancelReply}
          >
            <X className="h-4 w-4 text-gray-500" />
          </Button>
        </div>
      )}

      {/* File preview area */}
      {previewUrls.length > 0 && (
        <div className="px-3 py-2 border-t flex flex-wrap gap-2 items-center">
          <div className="flex-1 flex flex-wrap gap-2">
            {previewUrls.map((item, index) => (
              <div key={index} className="relative group">
                {item.type === "image" ? (
                  <div className="w-16 h-16 rounded overflow-hidden border">
                    <Image
                      src={item.url}
                      alt={item.file.name}
                      width={500}
                      height={500}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : item.type === "video" ? (
                  <div className="w-16 h-16 rounded overflow-hidden border bg-gray-100 flex items-center justify-center">
                    <video
                      src={item.url}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                      <Play className="h-6 w-6 text-white" />
                    </div>
                  </div>
                ) : (
                  <div className="w-16 h-16 rounded overflow-hidden border bg-gray-100 flex flex-col items-center justify-center p-1">
                    <FileText className="h-6 w-6 text-gray-500" />
                    <span className="text-xs text-gray-500 truncate w-full text-center mt-1">
                      {item.file.name.split(".").pop()?.toUpperCase()}
                    </span>
                  </div>
                )}
                <button
                  className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => handleRemoveFile(item.file)}
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
          {previewUrls.length > 0 && (
            <Button
              variant="ghost"
              size="icon"
              className="text-red-500 hover:text-red-700 hover:bg-red-50"
              onClick={handleRemoveAllFiles}
            >
              <Trash2 />
            </Button>
          )}
        </div>
      )}

      <div
        className="flex flex-col border-t"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={(e) => handleDrop(e)}
      >
        {/* Hidden file input */}
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          onChange={handleFileChange}
          multiple
          accept="image/*,video/*,application/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
        />

        {/* Toolbar buttons - now above the input */}
        <div className="flex items-center px-2 py-1 border-b bg-gray-50">
          <Button
            variant="ghost"
            size="icon"
            className="text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md h-9 w-9 mr-0.5"
            disabled={disabled}
            onClick={handleAttachClick}
          >
            <Sticker className="h-5 w-5" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md h-9 w-9 mr-0.5"
            disabled={disabled}
            onClick={handleAttachClick}
          >
            <ImageIcon className="h-5 w-5" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md h-9 w-9 mr-0.5"
            disabled={disabled}
            onClick={handleAttachClick}
          >
            <Paperclip className="h-5 w-5" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md h-9 w-9 mr-0.5"
            disabled={disabled}
          >
            <Gift className="h-5 w-5" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md h-9 w-9"
            disabled={disabled}
          >
            <Wand2 className="h-5 w-5" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md h-9 w-9 ml-auto"
            disabled={disabled}
          >
            <MoreHorizontal className="h-5 w-5" />
          </Button>
        </div>

        {/* Input field and send button */}
        <div
          className={`flex items-center p-2 ${isDragging ? "bg-blue-50 border border-dashed border-blue-300 rounded-md" : ""}`}
          ref={inputContainerRef}
        >
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder={
                disabled ? "Chọn một cuộc trò chuyện" : "Nhập tin nhắn..."
              }
              className="w-full p-2 pl-3 pr-10 rounded-md focus:outline-none focus:ring-none"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={disabled}
            />

            <div className="absolute right-2 top-1/2 -translate-y-1/2">
              <Button
                variant="ghost"
                size="icon"
                className={`h-7 w-7 rounded-full ${showEmojiPicker ? "text-blue-500" : "text-gray-500"} hover:text-blue-500 hover:bg-transparent`}
                disabled={disabled}
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                ref={emojiButtonRef}
              >
                <Smile className="h-5 w-5" />
              </Button>
            </div>

            {showEmojiPicker && (
              <div
                className="absolute bottom-12 right-0 z-50 shadow-lg rounded-lg overflow-hidden transition-all duration-200 transform origin-bottom-right"
                ref={emojiPickerRef}
              >
                <EmojiPicker
                  onEmojiClick={handleEmojiClick}
                  width={320}
                  height={400}
                  searchPlaceHolder="Tìm kiếm emoji..."
                  previewConfig={{ showPreview: false }}
                  lazyLoadEmojis={true}
                  skinTonesDisabled
                />
              </div>
            )}
          </div>

          {/* Send button */}
          <Button
            variant={message.trim() ? "default" : "ghost"}
            size="icon"
            className={
              message.trim()
                ? "bg-blue-500 hover:bg-blue-600 text-white rounded-full h-9 w-9 ml-2"
                : "text-gray-400 rounded-full h-9 w-9 ml-2"
            }
            onClick={handleSendMessage}
            disabled={disabled || !message.trim()}
          >
            <Send className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
