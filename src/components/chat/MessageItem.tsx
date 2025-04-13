"use client";

import { useState, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Image from "next/image";
import { formatMessageTime } from "@/utils/dateUtils";
import { Message, Media, ReactionType, UserInfo } from "@/types/base";
import MediaGrid from "./MediaGrid";

import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/authStore";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "../ui/separator";
import { useChatStore } from "@/stores/chatStore";
import {
  Copy,
  Download,
  Reply,
  Trash,
  MoreHorizontal,
  RotateCcw,
  Pin,
  Info,
  FileText,
  File,
  Mail,
  Video,
  Image as ImageIcon,
  ThumbsUp,
  Forward,
  X,
} from "lucide-react";

interface MediaItemProps {
  media: Media;
  onClick?: () => void;
}

// Component to render different types of media
function MediaItem({ media, onClick }: MediaItemProps) {
  const handleDownload = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Tạo một thẻ a ẩn để tải file
    const link = document.createElement("a");
    link.href = media.url;
    link.download = media.fileName; // Đặt tên file khi tải về
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getFileIcon = () => {
    const { type, metadata } = media;
    if (type === "IMAGE") return <ImageIcon className="h-5 w-5" />;
    if (type === "VIDEO") return <Video className="h-5 w-5" />;

    // For documents, show specific icons based on extension
    const ext = metadata.extension.toLowerCase();
    if (ext === "pdf") return <FileText className="h-5 w-5" />;
    return <File className="h-5 w-5" />;
  };

  const formatFileSize = (size: string) => {
    return size;
  };

  switch (media.type) {
    case "IMAGE":
      return (
        <div
          className="relative rounded-lg overflow-hidden max-w-full isolate cursor-pointer hover:opacity-90"
          onClick={onClick}
        >
          <Image
            src={media.url}
            alt={media.fileName}
            className="w-full rounded-lg object-cover max-h-[300px]"
            width={300}
            height={200}
            unoptimized
          />
          <div className="absolute inset-0 bg-black/0 hover:bg-black/10 transition-all duration-200"></div>
          <div className="absolute top-2 left-2 bg-black/50 text-white text-xs px-1.5 py-0.5 rounded">
            HD
          </div>
          <button
            className="absolute bottom-2 right-2 bg-white/80 p-1 rounded-full shadow-sm hover:bg-white/100 transition-opacity opacity-0 hover:opacity-100"
            onClick={handleDownload}
          >
            <Download className="h-4 w-4" />
          </button>
        </div>
      );

    case "VIDEO":
      return (
        <div
          className="relative rounded-lg overflow-hidden max-w-full isolate cursor-pointer hover:opacity-90"
          onClick={onClick}
        >
          <video
            src={media.url}
            className="w-full rounded-lg max-h-[300px]"
            style={{ maxWidth: "100%" }}
          />
          <div className="absolute top-2 left-2 bg-black/50 text-white text-xs px-1.5 py-0.5 rounded z-10">
            Video
          </div>
          <button
            className="absolute bottom-2 right-2 bg-white/80 p-1 rounded-full shadow-sm hover:bg-white/100 transition-opacity opacity-0 hover:opacity-100 z-10"
            onClick={handleDownload}
          >
            <Download className="h-4 w-4" />
          </button>
        </div>
      );

    // For documents and other file types
    default:
      return (
        <div
          className="flex items-center p-2 bg-gray-100 rounded-lg overflow-hidden hover:bg-gray-200 transition-colors isolate cursor-pointer"
          onClick={onClick}
        >
          <div className="mr-3 p-2 bg-white rounded-md flex-shrink-0 shadow-sm">
            {getFileIcon()}
          </div>
          <div className="flex-1 min-w-0 overflow-hidden">
            <p className="text-sm font-medium truncate">{media.fileName}</p>
            <p className="text-xs text-gray-500 truncate">
              {formatFileSize(media.metadata.sizeFormatted)}
            </p>
          </div>
          <button
            className="ml-2 p-1.5 bg-white rounded-full flex-shrink-0 shadow-sm hover:bg-gray-50 transition-opacity opacity-0 hover:opacity-100"
            onClick={handleDownload}
          >
            <Download className="h-4 w-4" />
          </button>
        </div>
      );
  }
}

interface MessageItemProps {
  message: Message;
  isCurrentUser: boolean;
  showAvatar?: boolean;
  onReply?: (message: Message) => void;
  onMessageClick?: (message: Message) => void;
  highlight?: string;
  userInfo?: UserInfo; // Thêm userInfo cho người gửi
}

// Helper functions for reaction handling
const getReactionEmojis = () => ({
  [ReactionType.LIKE]: "👍",
  [ReactionType.LOVE]: "❤️",
  [ReactionType.HAHA]: "😂",
  [ReactionType.WOW]: "😮",
  [ReactionType.SAD]: "😢",
  [ReactionType.ANGRY]: "😡",
});

// Helper function to generate avatar initials from name
const getInitialsFromName = (
  name?: string | null,
  email?: string | null,
  id?: string | null,
  fallback: string = "U",
): string => {
  if (name) {
    // Remove diacritics (accent marks) from Vietnamese characters
    return name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // Remove accent marks
      .split(" ")
      .map((w) => w[0])
      .join("")
      .toUpperCase();
  } else if (email) {
    return email.slice(0, 2).toUpperCase();
  } else if (id) {
    return id.slice(0, 2).toUpperCase();
  }
  return fallback;
};

// Define a type for reaction objects
type ReactionObject = {
  userId: string;
  reactionType?: ReactionType;
  reaction?: string;
  count?: number;
};

const getReactionTypeFromObject = (reaction: ReactionObject): ReactionType => {
  // Check if the reaction object has a reactionType property
  if ("reactionType" in reaction && reaction.reactionType) {
    return reaction.reactionType;
  }
  // Check if the reaction object has a reaction property
  else if ("reaction" in reaction && typeof reaction.reaction === "string") {
    return reaction.reaction as ReactionType;
  }
  // Default to LIKE if neither property is found
  return ReactionType.LIKE;
};

const getReactionCount = (reaction: ReactionObject): number => {
  // Check if the reaction has a count property
  if ("count" in reaction && typeof reaction.count === "number") {
    return reaction.count;
  }
  return 1; // Default count
};

const processReactions = (reactions: ReactionObject[]) => {
  const reactionCounts: Record<string, number> = {};
  let totalReactions = 0;

  // Process each reaction to handle different API response formats
  reactions.forEach((reaction) => {
    const reactionType = getReactionTypeFromObject(reaction);
    const count = getReactionCount(reaction);

    reactionCounts[reactionType] = (reactionCounts[reactionType] || 0) + count;
    totalReactions += count;
  });

  return { reactionCounts, totalReactions };
};

export default function MessageItem({
  message,
  isCurrentUser,
  showAvatar = true,
  onReply,
  onMessageClick,
  highlight,
  userInfo,
}: MessageItemProps) {
  const [isHovered, setIsHovered] = useState(false);
  const formattedTime = formatMessageTime(message.createdAt);
  const currentUser = useAuthStore((state) => state.user);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const chatStore = useChatStore();

  // Biến để tái sử dụng về sau
  const isRead = message.readBy.includes(message.receiverId || "");
  const isSent = message.id && !message.id.startsWith("temp-");

  // Đánh dấu tin nhắn đã đọc khi hiển thị (nếu chưa đọc và không phải tin nhắn của người dùng hiện tại)
  useEffect(() => {
    if (!isCurrentUser && !isRead && isSent && message.id) {
      // Chỉ đánh dấu đã đọc nếu tin nhắn không phải của người dùng hiện tại và chưa được đọc
      chatStore.markMessageAsReadById(message.id);
    }
  }, [isCurrentUser, isRead, isSent, message.id, chatStore]);

  // Get current user's reaction
  const getUserReaction = () => {
    return message.reactions?.find((r) => r.userId === currentUser?.id);
  };

  const handleCopyMessage = () => {
    if (message.content.text) {
      navigator.clipboard.writeText(message.content.text);
    }
  };

  const handleDeleteMessage = async () => {
    try {
      await chatStore.deleteMessageById(message.id);
    } catch (error) {
      console.error("Error deleting message:", error);
    }
  };

  const handleMarkAsUnread = async () => {
    try {
      if (message.id) {
        await chatStore.markMessageAsUnreadById(message.id);
      }
    } catch (error) {
      console.error("Error marking message as unread:", error);
    }
  };

  const handleRecallMessage = async () => {
    try {
      await chatStore.recallMessageById(message.id);
      // Force a re-render
      setIsHovered(false);
    } catch (error) {
      console.error("Error recalling message:", error);
    }
  };

  const handleReply = () => {
    if (onReply) {
      onReply(message);
    }
  };

  const handleMessageClick = () => {
    if (onMessageClick) {
      onMessageClick(message);
    }
  };

  const handleReaction = async (reactionType: ReactionType) => {
    try {
      const success = await chatStore.addReactionToMessageById(
        message.id,
        reactionType,
      );
      if (success) {
        setShowReactionPicker(false);
      }
    } catch (error) {
      console.error("Error reacting to message:", error);
    }
  };

  const handleRemoveReaction = async () => {
    try {
      await chatStore.removeReactionFromMessageById(message.id);
    } catch (error) {
      console.error("Error removing reaction:", error);
    }
  };

  const handleForwardMessage = () => {
    // For now, this is just a placeholder. In a real implementation, you would open a dialog to select recipients
    console.log("Forward message functionality will be expanded later");
  };

  // Function to highlight search text in message content
  const renderHighlightedText = (text: string, searchText: string) => {
    if (!searchText || !text) return text;

    try {
      // Use case-insensitive regex to find matches
      const regex = new RegExp(
        `(${searchText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`,
        "gi",
      );

      // Split the text by matches
      const parts = text.split(regex);

      return parts.map((part, i) => {
        // Check if this part matches the search term
        if (part.toLowerCase() === searchText.toLowerCase()) {
          return (
            <span key={i} className="bg-yellow-200 px-0.5 rounded">
              {part}
            </span>
          );
        }
        return part;
      });
    } catch {
      // If any error in regex, return plain text
      return text;
    }
  };

  const isDeletedForSelf = message.deletedBy.includes(currentUser?.id || "");

  if (isDeletedForSelf) {
    return null;
  }

  return (
    <div
      className={`flex group ${isCurrentUser ? "justify-end" : "justify-start"} mb-2 relative`}
    >
      {!isCurrentUser && showAvatar && (
        <div className="mr-2 flex-shrink-0">
          <Avatar className="h-8 w-8">
            <AvatarImage
              src={
                userInfo?.profilePictureUrl ||
                message.sender?.userInfo?.profilePictureUrl ||
                "/placeholder-avatar.svg"
              }
            />
            <AvatarFallback>
              {getInitialsFromName(
                userInfo?.fullName || message.sender?.userInfo?.fullName,
                message.sender?.email,
                message.sender?.id,
              )}
            </AvatarFallback>
          </Avatar>
        </div>
      )}

      <div
        className={`max-w-[70%] ${!isCurrentUser && !showAvatar ? "ml-10" : ""} relative overflow-visible group before:content-[''] before:absolute before:top-[-10px] before:h-[calc(100%+20px)] ${isCurrentUser ? "before:right-full before:w-12" : 'after:content-[""] after:absolute after:top-[-10px] after:h-[calc(100%+20px)] after:left-full after:w-12'}`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Hover action buttons */}
        {!message.recalled && (
          <div
            className={`absolute ${isCurrentUser ? "right-full mr-1" : "left-full ml-1"} top-1/2 -translate-y-1/2 z-30 transition-opacity duration-200 ease-in-out flex ${isCurrentUser ? "flex-row" : "flex-row-reverse"} gap-0.5 before:content-[''] before:absolute before:top-[-10px] before:bottom-[-10px] ${isCurrentUser ? "before:right-[-5px] before:left-[-5px]" : "before:left-[-5px] before:right-[-5px]"} before:w-2 before:z-20`}
            style={{
              opacity: isHovered ? 1 : 0,
              pointerEvents: isHovered ? "auto" : "none",
            }}
            onMouseEnter={() => setIsHovered(true)}
          >
            {/* Reply button - only for messages not from current user */}
            {!isCurrentUser && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-full bg-white shadow-sm hover:bg-gray-100"
                onClick={handleReply}
              >
                <Reply className="h-4 w-4 text-gray-600" />
              </Button>
            )}

            {/* Forward button */}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-full bg-white shadow-sm hover:bg-gray-100"
              onClick={handleForwardMessage}
            >
              <Forward className="h-4 w-4 text-gray-600" />
            </Button>

            {/* Empty div to maintain spacing */}
            <div></div>

            {/* Options button */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 rounded-full bg-white shadow-sm hover:bg-gray-100"
                >
                  <MoreHorizontal className="h-4 w-4 text-gray-600" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="">
                {!message.recalled && (
                  <>
                    <DropdownMenuItem onClick={handleCopyMessage}>
                      <Copy className="h-4 w-4 mr-2" />
                      <span>Sao chép</span>
                    </DropdownMenuItem>
                    <Separator />
                  </>
                )}
                {!isCurrentUser && !message.recalled && (
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
                {!message.recalled && (
                  <DropdownMenuItem onClick={handleMarkAsUnread}>
                    <Mail className="h-4 w-4 mr-2" />
                    <span>Đánh dấu chưa đọc</span>
                  </DropdownMenuItem>
                )}
                <Separator />
                {isCurrentUser && !message.recalled && (
                  <>
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={handleRecallMessage}
                    >
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
        )}

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
        {/* Tin nhắn văn bản */}
        {(message.recalled || message.content.text) && (
          <div
            className={`rounded-2xl px-3 py-2 break-words w-fit overflow-hidden ${
              isCurrentUser
                ? message.recalled
                  ? "bg-gray-100 text-gray-500 italic"
                  : "bg-blue-500 text-white ml-auto"
                : message.recalled
                  ? "bg-gray-100 text-gray-500 italic"
                  : "bg-gray-200 text-gray-800"
            } ${!message.recalled ? "cursor-pointer hover:opacity-90" : ""} ${
              message.content.media?.length ||
              message.content.image ||
              message.content.video
                ? "mb-2"
                : ""
            }`}
            onClick={!message.recalled ? handleMessageClick : undefined}
          >
            {message.recalled ? (
              <div className="flex items-center italic text-sm text-gray-500">
                <RotateCcw className="h-3 w-3 mr-1" />
                Tin nhắn đã bị thu hồi
              </div>
            ) : (
              <div className="text-sm">
                {highlight
                  ? renderHighlightedText(
                      message.content.text || "",
                      highlight || "",
                    )
                  : message.content.text}
              </div>
            )}
          </div>
        )}

        {/* Media content - outside of message bubble */}
        {!message.recalled && (
          <>
            {/* Legacy image support */}
            {message.content.image && (
              <div
                className="mt-1 relative rounded-lg overflow-hidden max-w-full isolate cursor-pointer hover:opacity-90"
                onClick={handleMessageClick}
              >
                <Image
                  src={message.content.image}
                  alt="Image"
                  className="w-full rounded-lg object-cover max-h-[300px]"
                  width={300}
                  height={200}
                />
                <button
                  className="absolute bottom-2 right-2 bg-white/80 p-1 rounded-full shadow-sm hover:bg-white/100 transition-opacity opacity-0 hover:opacity-100"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const link = document.createElement("a");
                    link.href = message.content.image || "";
                    link.download = "image.jpg"; // Default name
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }}
                >
                  <Download className="h-4 w-4" />
                </button>
              </div>
            )}

            {/* Legacy video support */}
            {message.content.video && (
              <div
                className="mt-1 relative rounded-lg overflow-hidden max-w-full isolate cursor-pointer hover:opacity-90"
                onClick={handleMessageClick}
              >
                <video
                  src={message.content.video}
                  controls
                  className="w-full rounded-lg max-h-[300px]"
                  style={{ maxWidth: "100%" }}
                />
                <button
                  className="absolute bottom-2 right-2 bg-white/80 p-1 rounded-full shadow-sm hover:bg-white/100 transition-opacity opacity-0 hover:opacity-100 z-10"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const link = document.createElement("a");
                    link.href = message.content.video || "";
                    link.download = "video.mp4"; // Default name
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }}
                >
                  <Download className="h-4 w-4" />
                </button>
              </div>
            )}

            {/* New media array support */}
            {message.content.media && message.content.media.length > 0 && (
              <div
                className="mt-2 w-full overflow-hidden cursor-pointer hover:opacity-90"
                onClick={handleMessageClick}
              >
                {message.content.media.length === 1 ? (
                  <MediaItem
                    media={message.content.media[0]}
                    onClick={handleMessageClick}
                  />
                ) : (
                  <MediaGrid
                    media={message.content.media}
                    onClick={handleMessageClick}
                    onDownload={(media) => {
                      const link = document.createElement("a");
                      link.href = media.url;
                      link.download = media.fileName;
                      link.target = "_blank";
                      link.rel = "noopener noreferrer";
                      link.setAttribute("download", media.fileName);
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                    }}
                  />
                )}
              </div>
            )}
          </>
        )}
        <div className="flex justify-between items-center mt-1">
          <div
            className={`text-xs text-gray-500 ${isCurrentUser ? "text-right" : "text-left"} flex items-center gap-1`}
          >
            {formattedTime}
            {isCurrentUser && (
              <span className="ml-1">
                {isRead ? (
                  <span title="Đã đọc" className="text-blue-500">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M18 6 7 17l-5-5" />
                      <path d="m22 10-7.5 7.5L13 16" />
                    </svg>
                  </span>
                ) : isSent ? (
                  <span title="Đã gửi" className="text-gray-400">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="m5 12 5 5L20 7" />
                    </svg>
                  </span>
                ) : (
                  <span title="Đang gửi" className="text-gray-300">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <circle cx="12" cy="12" r="10" />
                    </svg>
                  </span>
                )}
              </span>
            )}
          </div>

          {/* Reaction summary and buttons */}
          <div className="flex items-center gap-1">
            {!message.recalled &&
              message.reactions &&
              message.reactions.length > 0 && (
                <div className="flex items-center bg-white rounded-full shadow-sm px-1 py-0.5 text-xs">
                  {/* Group reactions by type and display unique reaction types */}
                  {(() => {
                    // Process reactions using helper function
                    const { reactionCounts, totalReactions } = processReactions(
                      message.reactions,
                    );

                    // Get emoji mapping
                    const reactionEmojis = getReactionEmojis();

                    // Display unique reaction types
                    return (
                      <>
                        {Object.entries(reactionCounts).map(([type, count]) => (
                          <span
                            key={type}
                            className="mr-0.5"
                            title={`${count} ${type.toLowerCase()}`}
                          >
                            {reactionEmojis[type as ReactionType]}
                          </span>
                        ))}
                        <span className="text-gray-600 font-medium ml-0.5">
                          {totalReactions}
                        </span>
                      </>
                    );
                  })()}
                </div>
              )}

            {/* Reaction buttons - only show if message is not recalled */}
            {!message.recalled &&
              (() => {
                // Get current user's reaction
                const userReaction = getUserReaction();

                // Get emoji mapping
                const reactionEmojis = getReactionEmojis();

                if (userReaction) {
                  // Get the emoji for the current reaction
                  const reactionType = getReactionTypeFromObject(userReaction);

                  const emoji = reactionEmojis[reactionType];

                  // When user has already reacted, show two buttons: add more and remove
                  return (
                    <div className="flex gap-1 ml-1">
                      {/* Button to add more of the same reaction */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5 rounded-full bg-blue-50 shadow-sm hover:bg-blue-100 p-0"
                        onClick={() => handleReaction(reactionType)}
                        title={`Thêm biểu cảm ${reactionType.toLowerCase()}`}
                      >
                        <span className="text-xs">{emoji || "👍"}</span>
                      </Button>

                      {/* Button to remove reaction */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5 rounded-full bg-white shadow-sm hover:bg-gray-100 p-0"
                        onClick={handleRemoveReaction}
                        title="Xóa biểu cảm"
                      >
                        <X className="h-3 w-3 text-red-500" />
                      </Button>
                    </div>
                  );
                } else {
                  // When user hasn't reacted yet, show reaction button with picker
                  return (
                    <div className="relative ml-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5 rounded-full shadow-sm hover:bg-gray-100 bg-white p-0"
                        onMouseEnter={() => setShowReactionPicker(true)}
                        title="Thêm biểu cảm"
                      >
                        <ThumbsUp className="h-3 w-3 text-gray-600" />
                      </Button>

                      {/* Reaction picker - visible only when hovering the reaction button */}
                      {showReactionPicker && (
                        <div
                          className="absolute bottom-full right-0 mb-2 bg-white rounded-full shadow-lg p-1 flex items-center gap-1 z-50"
                          onMouseEnter={() => setShowReactionPicker(true)}
                          onMouseLeave={() => setShowReactionPicker(false)}
                        >
                          <button
                            className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center transition-all duration-150 hover:scale-125 hover:shadow-md group/reaction"
                            onClick={() => handleReaction(ReactionType.LIKE)}
                          >
                            <span className="text-xl">👍</span>
                            <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-black/75 text-white text-xs px-1.5 py-0.5 rounded opacity-0 group-hover/reaction:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                              Thích
                            </span>
                          </button>
                          <button
                            className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center transition-all duration-150 hover:scale-125 hover:shadow-md group/reaction"
                            onClick={() => handleReaction(ReactionType.LOVE)}
                          >
                            <span className="text-xl">❤️</span>
                            <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-black/75 text-white text-xs px-1.5 py-0.5 rounded opacity-0 group-hover/reaction:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                              Yêu thích
                            </span>
                          </button>
                          <button
                            className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center transition-all duration-150 hover:scale-125 hover:shadow-md group/reaction"
                            onClick={() => handleReaction(ReactionType.HAHA)}
                          >
                            <span className="text-xl">😂</span>
                            <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-black/75 text-white text-xs px-1.5 py-0.5 rounded opacity-0 group-hover/reaction:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                              Haha
                            </span>
                          </button>
                          <button
                            className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center transition-all duration-150 hover:scale-125 hover:shadow-md group/reaction"
                            onClick={() => handleReaction(ReactionType.WOW)}
                          >
                            <span className="text-xl">😮</span>
                            <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-black/75 text-white text-xs px-1.5 py-0.5 rounded opacity-0 group-hover/reaction:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                              Wow
                            </span>
                          </button>
                          <button
                            className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center transition-all duration-150 hover:scale-125 hover:shadow-md group/reaction"
                            onClick={() => handleReaction(ReactionType.SAD)}
                          >
                            <span className="text-xl">😢</span>
                            <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-black/75 text-white text-xs px-1.5 py-0.5 rounded opacity-0 group-hover/reaction:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                              Buồn
                            </span>
                          </button>
                          <button
                            className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center transition-all duration-150 hover:scale-125 hover:shadow-md group/reaction"
                            onClick={() => handleReaction(ReactionType.ANGRY)}
                          >
                            <span className="text-xl">😡</span>
                            <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-black/75 text-white text-xs px-1.5 py-0.5 rounded opacity-0 group-hover/reaction:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                              Phẫn nộ
                            </span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                }
              })()}
          </div>
        </div>
      </div>

      {isCurrentUser && showAvatar && (
        <div className="ml-2 flex-shrink-0">
          <Avatar className="h-8 w-8">
            <AvatarImage
              src={
                currentUser?.userInfo?.profilePictureUrl ||
                "/placeholder-avatar.svg"
              }
              className="object-cover"
            />
            <AvatarFallback>
              {getInitialsFromName(
                currentUser?.userInfo?.fullName,
                currentUser?.email,
                currentUser?.id,
                "C",
              )}
            </AvatarFallback>
          </Avatar>
        </div>
      )}
    </div>
  );
}
