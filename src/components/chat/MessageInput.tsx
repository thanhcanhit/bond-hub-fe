"use client";

import { Button } from "@/components/ui/button";
import { useState, useRef, useEffect, DragEvent, useCallback } from "react";
import {
  Paperclip,
  Smile,
  Send,
  X,
  Reply,
  ImageIcon,
  FileText,
  Play,
  Trash2,
  AlertCircle,
  Music,
  Mic,
  Loader2,
  Sparkles,
} from "lucide-react";
import AudioRecorder from "./AudioRecorder";
import { toast } from "sonner";
import { Message } from "@/types/base";
import EmojiPicker, { EmojiClickData } from "emoji-picker-react";
import { useChatStore } from "@/stores/chatStore";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Image from "next/image";
import { enhanceMessage } from "@/actions/ai.action";

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
  const [isTyping, setIsTyping] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [isEnhancedMessage, setIsEnhancedMessage] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const emojiButtonRef = useRef<HTMLButtonElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const documentInputRef = useRef<HTMLInputElement>(null);
  const inputContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const sendTypingIndicator = useChatStore(
    (state) => state.sendTypingIndicator,
  );
  const messages = useChatStore((state) => state.messages);
  const selectedContact = useChatStore((state) => state.selectedContact);

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

  // Tự động điều chỉnh chiều cao của textarea
  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      const newHeight = Math.min(textarea.scrollHeight, 100); // Giới hạn chiều cao tối đa là 100px (khoảng 4 dòng)
      textarea.style.height = `${newHeight}px`;
    }
  };

  // Xử lý khi chọn file
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      // Kiểm tra xem có phải là file an toàn không
      const safeFiles = newFiles.filter((file) => isSafeFile(file));

      if (safeFiles.length !== newFiles.length) {
        const rejectedCount = newFiles.length - safeFiles.length;
        toast.error(
          `${rejectedCount} file không được chấp nhận do không an toàn`,
          {
            description:
              "Chỉ chấp nhận hình ảnh, video, âm thanh và các tài liệu văn phòng phổ biến",
            icon: <AlertCircle className="h-5 w-5" />,
          },
        );
      }

      addFiles(safeFiles);
    }
  };

  // Kiểm tra xem file có an toàn không
  const isSafeFile = (file: File): boolean => {
    const fileType = file.type.split("/")[0]; // image, video, audio, application, etc.
    const fileExtension = `.${file.name.split(".").pop()?.toLowerCase() || ""}`;

    // Chấp nhận hình ảnh, video và âm thanh
    if (fileType === "image" || fileType === "video" || fileType === "audio") {
      return true;
    }

    // Kiểm tra các định dạng tài liệu an toàn
    if (safeDocumentTypes.includes(fileExtension)) {
      return true;
    }

    return false;
  };

  // Hàm chung để xử lý thêm files - sử dụng useCallback để tránh re-render không cần thiết
  const addFiles = useCallback((newFiles: File[]) => {
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
      } else if (fileType === "audio") {
        const url = URL.createObjectURL(file);
        setPreviewUrls((prev) => [...prev, { file, url, type: "audio" }]);
      } else {
        // For other file types (documents, etc.)
        setPreviewUrls((prev) => [...prev, { file, url: "", type: "file" }]);
      }
    });
  }, []);

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
      // Lọc các file an toàn
      const safeFiles = newFiles.filter((file) => isSafeFile(file));

      if (safeFiles.length !== newFiles.length) {
        const rejectedCount = newFiles.length - safeFiles.length;
        toast.error(
          `${rejectedCount} file không được chấp nhận do không an toàn`,
          {
            description:
              "Chỉ chấp nhận hình ảnh, video, âm thanh và các tài liệu văn phòng phổ biến",
            icon: <AlertCircle className="h-5 w-5" />,
          },
        );
      }

      if (sendImmediately) {
        // Gửi ngay lập tức nếu thả vào khu vực xem tin nhắn
        onSendMessage("", safeFiles);
      } else {
        // Hiển thị preview nếu thả vào ô input
        addFiles(safeFiles);
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

  // Xử lý khi nhấn nút đính kèm hình ảnh/video
  const handleImageAttachClick = () => {
    imageInputRef.current?.click();
  };

  // Xử lý khi nhấn nút đính kèm âm thanh
  const handleAudioAttachClick = () => {
    audioInputRef.current?.click();
  };

  // Xử lý khi nhấn nút đính kèm tài liệu
  const handleDocumentAttachClick = () => {
    documentInputRef.current?.click();
  };

  const handleSendMessage = () => {
    if ((message.trim() || selectedFiles.length > 0) && !disabled) {
      // Stop typing indicator when sending message
      if (isTyping && sendTypingIndicator) {
        setIsTyping(false);
        sendTypingIndicator(false);

        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
          typingTimeoutRef.current = null;
        }
      }

      onSendMessage(
        message,
        selectedFiles.length > 0 ? selectedFiles : undefined,
      );
      setMessage("");
      setIsEnhancedMessage(false);
      handleRemoveAllFiles(); // Clear files after sending
    }
  };

  // Handle textarea change
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    // If user starts typing after AI enhancement, clear the enhanced status
    if (isEnhancedMessage) {
      setIsEnhancedMessage(false);
    }
    // Điều chỉnh chiều cao sau khi nội dung thay đổi
    setTimeout(adjustTextareaHeight, 0);
    // Send typing indicator
    handleTyping();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      // Prevent immediate sending of enhanced messages if they haven't been modified
      if (isEnhancing) {
        e.preventDefault();
        return;
      }

      e.preventDefault();
      handleSendMessage();
    }
  };

  // Handle typing indicator
  const handleTyping = useCallback(() => {
    if (!isTyping && sendTypingIndicator) {
      setIsTyping(true);
      sendTypingIndicator(true);
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout to stop typing indicator after 2 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      if (isTyping && sendTypingIndicator) {
        setIsTyping(false);
        sendTypingIndicator(false);
      }
    }, 2000);
  }, [isTyping, sendTypingIndicator]);

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

  // Điều chỉnh chiều cao của textarea khi component mount và khi message thay đổi
  useEffect(() => {
    adjustTextareaHeight();
  }, [message]);

  // Xử lý sự kiện paste để hỗ trợ dán ảnh trực tiếp
  const handlePaste = useCallback(
    (e: ClipboardEvent) => {
      if (disabled) return;

      const items = e.clipboardData?.items;
      if (!items) return;

      let hasImageItems = false;
      const imageFiles: File[] = [];

      // Kiểm tra xem có ảnh trong clipboard không
      for (let i = 0; i < items.length; i++) {
        const item = items[i];

        // Chỉ xử lý các item loại image
        if (item.type.startsWith("image/")) {
          hasImageItems = true;
          const file = item.getAsFile();
          if (file) {
            // Đổi tên file để dễ nhận biết
            const timestamp = Date.now();
            const newFile = new File([file], `screenshot_${timestamp}.png`, {
              type: file.type,
              lastModified: timestamp,
            });
            imageFiles.push(newFile);
          }
        }
      }

      // Nếu có ảnh, thêm vào danh sách file đính kèm
      if (hasImageItems && imageFiles.length > 0) {
        e.preventDefault(); // Ngăn chặn hành vi paste mặc định
        addFiles(imageFiles);
        toast.success(`Đã thêm ${imageFiles.length} ảnh từ clipboard`);
      }
    },
    [disabled, addFiles],
  );

  // Cleanup typing timeout when component unmounts
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        // Make sure to send typing stopped when unmounting
        if (isTyping && sendTypingIndicator) {
          sendTypingIndicator(false);
        }
      }
    };
  }, [isTyping, sendTypingIndicator]);

  // Thêm event listener cho sự kiện paste
  useEffect(() => {
    // Thêm event listener cho textarea
    const textareaElement = textareaRef.current;
    if (textareaElement) {
      textareaElement.addEventListener("paste", handlePaste);
    }

    // Cleanup khi component unmount
    return () => {
      if (textareaElement) {
        textareaElement.removeEventListener("paste", handlePaste);
      }
    };
  }, [handlePaste]);

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

  // Xử lý tăng cường tin nhắn bằng AI
  const handleEnhanceMessage = async () => {
    // Prevent enhancing if already processing or empty message
    if (!message.trim() || disabled || isEnhancing) return;

    // Check for minimum character requirement (10 characters)
    if (message.trim().length < 10) {
      toast.error("Không thể tăng cường", {
        description: "Tin nhắn cần có ít nhất 10 ký tự để tăng cường bằng AI",
      });
      return;
    }

    setIsEnhancing(true);
    try {
      // Store original message in case enhancement fails
      const originalMessage = message;

      // Lấy 5 tin nhắn gần nhất để cung cấp ngữ cảnh cho AI
      const recentMessages = messages
        .slice(-5)
        .filter((m) => !m.recalled) // Lọc bỏ các tin nhắn đã thu hồi
        .map((m) => ({
          content: m.content.text || "",
          type: m.sender?.id === selectedContact?.id ? "contact" : "user",
          senderId: m.sender?.id || "",
          senderName: m.sender?.userInfo?.fullName || "",
        }))
        .filter((m) => m.content.trim() !== ""); // Lọc bỏ tin nhắn rỗng

      // Temporary clear message to prevent double sending
      setMessage("");

      const result = await enhanceMessage(
        originalMessage,
        recentMessages.length > 0 ? recentMessages : undefined,
      );

      if (result.success && result.enhancedMessage) {
        // Mark message as enhanced to prevent automatic duplication
        setIsEnhancedMessage(true);
        setMessage(result.enhancedMessage);
        toast.success("Tin nhắn đã được tăng cường", {
          description: "Nội dung đã được cải thiện bởi AI",
        });
        // Focus input after enhancement
        setTimeout(() => {
          textareaRef.current?.focus();
        }, 0);
      } else {
        // Restore original message if enhancement failed
        setMessage(originalMessage);
        toast.error("Không thể tăng cường tin nhắn", {
          description: result.error || "Đã xảy ra lỗi khi tăng cường tin nhắn",
        });
      }
    } catch {
      // Restore message in case of error
      setMessage(message);
      toast.error("Không thể tăng cường tin nhắn", {
        description: "Đã xảy ra lỗi khi kết nối đến dịch vụ AI",
      });
    } finally {
      setIsEnhancing(false);
    }
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
                ) : item.type === "audio" ? (
                  <div className="w-16 h-16 rounded overflow-hidden border bg-gray-100 flex flex-col items-center justify-center p-1">
                    <Music className="h-6 w-6 text-gray-500" />
                    <span className="text-xs text-gray-500 truncate w-full text-center mt-1">
                      {item.file.name.split(".").pop()?.toUpperCase()}
                    </span>
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
        {/* Hidden file inputs */}
        <input
          type="file"
          ref={imageInputRef}
          className="hidden"
          onChange={handleFileChange}
          multiple
          accept="image/*,video/*"
        />
        <input
          type="file"
          ref={audioInputRef}
          className="hidden"
          onChange={handleFileChange}
          multiple
          accept="audio/*"
        />
        <input
          type="file"
          ref={documentInputRef}
          className="hidden"
          onChange={handleFileChange}
          multiple
          accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.rtf,.odt,.ods,.odp"
        />

        {/* Toolbar buttons - now above the input */}
        <div className="flex items-center py-0.5 px-2 border-b">
          <Button
            variant="ghost"
            size="icon"
            disabled={disabled}
            onClick={handleImageAttachClick}
            title="Đính kèm hình ảnh hoặc video"
          >
            <ImageIcon className="h-5 w-5" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            disabled={disabled}
            onClick={handleAudioAttachClick}
            title="Đính kèm âm thanh"
          >
            <Music className="h-5 w-5" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            disabled={disabled}
            onClick={handleDocumentAttachClick}
            title="Đính kèm tài liệu"
          >
            <Paperclip className="h-5 w-5" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            disabled={disabled}
            onClick={() => setIsRecording(true)}
            title="Ghi âm tin nhắn"
          >
            <Mic className="h-5 w-5" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            disabled={disabled || !message.trim() || isEnhancing}
            onClick={handleEnhanceMessage}
            title={
              message.trim().length < 10
                ? "Tin nhắn cần ít nhất 10 ký tự để tăng cường"
                : "Tăng cường tin nhắn bằng AI"
            }
            className={isEnhancing ? "text-blue-500" : ""}
          >
            {isEnhancing ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Sparkles className="h-5 w-5" />
            )}
          </Button>
        </div>

        {/* Audio recorder */}
        {isRecording && (
          <AudioRecorder
            onSend={(audioBlob, duration) => {
              console.log(
                "Received audio blob from recorder:",
                audioBlob,
                "duration:",
                duration,
              );

              // Create filename with duration info if available
              const timestamp = Date.now();
              const fileName = duration
                ? `audio_message_${timestamp}_duration_${duration}.mp3`
                : `audio_message_${timestamp}.mp3`;

              // Convert blob to File object with correct MIME type
              const audioFile = new File([audioBlob], fileName, {
                type: audioBlob.type || "audio/mpeg",
                lastModified: timestamp,
              });

              // Add custom property for duration if available
              if (duration) {
                Object.defineProperty(audioFile, "duration", {
                  value: duration,
                  writable: false,
                });
              }

              console.log(
                "Created audio file:",
                audioFile,
                "with duration:",
                duration,
              );

              // Send the audio file
              onSendMessage("", [audioFile]);
              setIsRecording(false);
            }}
            onCancel={() => setIsRecording(false)}
          />
        )}

        {/* Input field and send button */}
        {!isRecording && (
          <div
            className={`flex items-center p-2 ${isDragging ? "bg-blue-50 border border-dashed border-blue-300 rounded-md" : ""}`}
            ref={inputContainerRef}
          >
            <div className="flex-1 relative">
              <textarea
                ref={textareaRef}
                placeholder={
                  disabled ? "Chọn một cuộc trò chuyện" : "Nhập tin nhắn..."
                }
                className="w-full p-2 pl-3 pr-10 rounded-md focus:outline-none focus:ring-none resize-none overflow-auto"
                value={message}
                onChange={handleTextareaChange}
                onKeyDown={handleKeyDown}
                disabled={disabled}
                rows={1}
                style={{ maxHeight: "100px", minHeight: "40px" }}
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
              variant={
                message.trim() || selectedFiles.length > 0 ? "default" : "ghost"
              }
              size="icon"
              className={
                message.trim() || selectedFiles.length > 0
                  ? "bg-blue-500 hover:bg-blue-600 text-white rounded-full h-9 w-9 ml-2"
                  : "text-gray-400 rounded-full h-9 w-9 ml-2"
              }
              onClick={handleSendMessage}
              disabled={
                disabled || (!message.trim() && selectedFiles.length === 0)
              }
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
