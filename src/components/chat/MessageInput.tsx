"use client";

import { Button } from "@/components/ui/button";
import { useState, useRef, useEffect } from "react";
import {
  Paperclip,
  Smile,
  Send,
  Mic,
  X,
  Reply,
  ImageIcon,
  FileText,
  Play,
} from "lucide-react";
import { Message } from "@/types/base";
import EmojiPicker, { EmojiClickData } from "emoji-picker-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

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
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const emojiButtonRef = useRef<HTMLButtonElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Xử lý khi chọn file
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
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
                    <img
                      src={item.url}
                      alt={item.file.name}
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
              size="sm"
              className="text-red-500 hover:text-red-700 hover:bg-red-50"
              onClick={handleRemoveAllFiles}
            >
              Xóa tất cả
            </Button>
          )}
        </div>
      )}

      <div className="p-3 flex items-center gap-2">
        {/* Hidden file input */}
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          onChange={handleFileChange}
          multiple
          accept="image/*,video/*,application/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
        />
        <Button
          variant="ghost"
          size="icon"
          className="text-gray-500 hover:text-blue-500 hover:bg-blue-50"
          disabled={disabled}
          onClick={handleAttachClick}
        >
          <Paperclip className="h-5 w-5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="text-gray-500 hover:text-blue-500 hover:bg-blue-50"
          disabled={disabled}
          onClick={handleAttachClick}
        >
          <ImageIcon className="h-5 w-5" />
        </Button>
        <div className="flex-1 relative">
          <input
            type="text"
            placeholder={
              disabled ? "Chọn một cuộc trò chuyện" : "Nhập tin nhắn..."
            }
            className="w-full p-2 pl-3 pr-10 rounded-full border border-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={disabled}
          />
          <Button
            variant="ghost"
            size="icon"
            className={`absolute right-2 top-1/2 transform -translate-y-1/2 ${showEmojiPicker ? "text-blue-500" : "text-gray-500"} hover:text-blue-500 transition-colors`}
            disabled={disabled}
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            ref={emojiButtonRef}
          >
            <Smile className="h-5 w-5" />
          </Button>

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
        {message.trim() ? (
          <Button
            variant="ghost"
            size="icon"
            className="text-blue-500"
            onClick={handleSendMessage}
            disabled={disabled}
          >
            <Send className="h-5 w-5" />
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            className="text-gray-500"
            disabled={disabled}
          >
            <Mic className="h-5 w-5" />
          </Button>
        )}
      </div>
    </div>
  );
}
