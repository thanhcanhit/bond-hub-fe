"use client";

import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Image from "next/image";
import { formatMessageTime } from "@/data/mockData";
import { Message } from "@/types/base";
import {
  Copy,
  Download,
  Reply,
  Trash,
  MoreHorizontal,
  RotateCcw,
  Pin,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "../ui/separator";

interface MessageItemProps {
  message: Message;
  isCurrentUser: boolean;
  showAvatar?: boolean;
  onReply?: (message: Message) => void;
}

export default function MessageItem({
  message,
  isCurrentUser,
  showAvatar = true,
  onReply,
}: MessageItemProps) {
  const [isHovered, setIsHovered] = useState(false);
  const formattedTime = formatMessageTime(message.createdAt);

  const handleCopyMessage = () => {
    if (message.content.text) {
      navigator.clipboard.writeText(message.content.text);
      alert("Đã sao chép tin nhắn"); // Using alert instead of toast for simplicity
    }
  };

  const handleDeleteMessage = () => {
    // In a real app, this would call an API to delete the message
    alert("Đã xóa tin nhắn"); // Using alert instead of toast for simplicity
  };

  const handleRecallMessage = () => {
    // In a real app, this would call an API to recall the message
    alert("Đã thu hồi tin nhắn"); // Using alert instead of toast for simplicity
  };

  const handleReply = () => {
    if (onReply) {
      onReply(message);
    }
  };

  return (
    <div
      className={`flex ${isCurrentUser ? "justify-end" : "justify-start"} mb-2 group relative`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Reply button that appears on hover - only for messages not from current user */}
      {!isCurrentUser && (
        <div
          className="absolute right-0 top-1/2 -translate-y-1/2 z-20 transition-opacity duration-200 ease-in-out"
          style={{
            opacity: isHovered ? 1 : 0,
            pointerEvents: isHovered ? "auto" : "none",
          }}
        >
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full bg-white shadow-sm hover:bg-gray-100"
            onClick={handleReply}
          >
            <Reply className="h-4 w-4 text-gray-600" />
          </Button>
        </div>
      )}

      {!isCurrentUser && showAvatar && (
        <div className="mr-2 flex-shrink-0">
          <Avatar className="h-8 w-8">
            <AvatarImage
              src={message.sender.userInfo?.profilePictureUrl || ""}
            />
            <AvatarFallback>
              {message.sender.userInfo?.fullName?.slice(0, 2).toUpperCase() ||
                "??"}
            </AvatarFallback>
          </Avatar>
        </div>
      )}

      <div
        className={`max-w-[70%] ${!isCurrentUser && !showAvatar ? "ml-10" : ""} relative`}
      >
        {/* Message options dropdown */}
        <div
          className="absolute -right-6 z-20 transition-opacity duration-200 ease-in-out"
          style={{
            opacity: isHovered ? 1 : 0,
            pointerEvents: isHovered ? "auto" : "none",
          }}
        >
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 rounded-full bg-white shadow-sm hover:bg-gray-100"
              >
                <MoreHorizontal className="h-4 w-4 text-gray-600" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="">
              <DropdownMenuItem onClick={handleCopyMessage}>
                <Copy className="h-4 w-4 mr-2" />
                <span>Sao chép</span>
              </DropdownMenuItem>
              <Separator />
              {!isCurrentUser && (
                <DropdownMenuItem onClick={handleReply}>
                  <Reply className="h-4 w-4 mr-2" />
                  <span>Trả lời</span>
                </DropdownMenuItem>
              )}
              <DropdownMenuItem>
                <Pin className="h-4 w-4 mr-2" />
                <span>Ghim tin nhắn</span>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Info className="h-4 w-4 mr-2" />
                <span>Xem chi tiết</span>
              </DropdownMenuItem>
              <Separator />
              {isCurrentUser && (
                <>
                  <DropdownMenuItem onClick={handleRecallMessage}>
                    <RotateCcw className="h-4 w-4 mr-2" />
                    <span>Thu hồi</span>
                  </DropdownMenuItem>
                </>
              )}
              <DropdownMenuItem
                onClick={handleDeleteMessage}
                className="text-red-500 focus:text-red-500"
              >
                <Trash className="h-4 w-4 mr-2" />
                <span>Xóa chỉ ở phía tôi</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* If message is a reply to another message */}
        {message.repliedTo && (
          <div
            className={`text-xs mb-1 px-2 py-1 rounded-lg ${isCurrentUser ? "bg-blue-100 text-blue-800" : "bg-gray-100 text-gray-800"}`}
          >
            <div className="flex items-center gap-1">
              <Reply className="h-3 w-3" />
              <span className="font-medium">Trả lời</span>
            </div>
            <p className="truncate">Tin nhắn gốc đã bị xóa hoặc thu hồi</p>
          </div>
        )}
        <div
          className={`rounded-2xl px-3 py-2 ${
            isCurrentUser
              ? "bg-blue-500 text-white"
              : "bg-gray-200 text-gray-800"
          }`}
        >
          {message.content.text && (
            <p className="break-words">{message.content.text}</p>
          )}

          {message.content.image && (
            <div className="mt-1 relative rounded-lg overflow-hidden">
              <Image
                src={message.content.image}
                alt="Image"
                className="max-w-full rounded-lg object-cover"
                width={300}
                height={200}
              />
              <button className="absolute bottom-2 right-2 bg-white/80 p-1 rounded-full">
                <Download className="h-4 w-4" />
              </button>
            </div>
          )}

          {message.content.video && (
            <div className="mt-1 relative rounded-lg overflow-hidden">
              <video
                src={message.content.video}
                controls
                className="max-w-full rounded-lg"
              />
            </div>
          )}
        </div>
        <div
          className={`text-xs text-gray-500 mt-1 ${isCurrentUser ? "text-right" : "text-left"}`}
        >
          {formattedTime}
        </div>
      </div>

      {isCurrentUser && showAvatar && (
        <div className="ml-2 flex-shrink-0">
          <Avatar className="h-8 w-8">
            <AvatarImage
              src={message.sender.userInfo?.profilePictureUrl || ""}
            />
            <AvatarFallback>
              {message.sender.userInfo?.fullName?.slice(0, 2).toUpperCase() ||
                "??"}
            </AvatarFallback>
          </Avatar>
        </div>
      )}
    </div>
  );
}
