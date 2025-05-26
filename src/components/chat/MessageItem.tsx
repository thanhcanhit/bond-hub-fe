"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Image from "next/image";
import { formatMessageTime } from "@/utils/dateUtils";
import {
  Message,
  Media,
  ReactionType,
  UserInfo,
  MessageType,
  User,
} from "@/types/base";
import MediaGrid from "./MediaGrid";
import ForwardMessageDialog from "./ForwardMessageDialog";
import ReactionPicker from "./ReactionPicker";
import ReactionSummary from "./ReactionSummary";
import AudioVisualizer from "./AudioVisualizer";
import { summarizeText } from "@/actions/ai.action";
import { toast } from "sonner";
// import { getUserDisplayName } from "@/utils/userUtils";

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
import { useConversationsStore } from "@/stores/conversationsStore";
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
  Forward,
  CornerUpRight,
  AtSign,
  Music,
  FileDigit,
} from "lucide-react";
import { getUserInitials } from "@/utils/userUtils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface MediaItemProps {
  media: Media;
  onClick?: () => void;
}

// Component to render different types of media
function MediaItem({ media, onClick }: MediaItemProps) {
  const handleDownload = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    // Tạo một thẻ a ẩn để tải file
    const link = document.createElement("a");
    link.href = media.url;
    link.download = media.fileName; // Đặt tên file khi tải về
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Ngăn sự kiện click lan ra ngoài
    return false;
  };

  const getFileIcon = () => {
    const { type, metadata } = media;
    if (type === "IMAGE") return <ImageIcon className="h-5 w-5" />;
    if (type === "VIDEO") return <Video className="h-5 w-5" />;
    if (type === "AUDIO") return <Music className="h-5 w-5" />;

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

    case "AUDIO":
      return (
        <div
          className="flex flex-col p-2 bg-gray-100 rounded-lg overflow-hidden hover:bg-gray-200 transition-colors isolate cursor-pointer"
          onClick={onClick}
        >
          <div className="flex items-center mb-1">
            <div className="mr-2 p-1.5 bg-white rounded-md flex-shrink-0 shadow-sm">
              <Music className="h-4 w-4 text-blue-500" />
            </div>
            <p className="text-sm font-medium truncate">{media.fileName}</p>
          </div>
          <div className="w-full">
            <AudioVisualizer
              url={media.url}
              fileName={media.fileName}
              compact={true}
              onDownload={() => handleDownload()}
            />
          </div>
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

// Extend the Message type to include senderName which might be present in API responses
interface ExtendedMessage extends Message {
  senderName?: string;
}

// Helper function to get the sender name from a message
function getSenderName(
  message: Message | ExtendedMessage,
  userInfo?: UserInfo,
  conversationsUserInfo?: UserInfo | null,
): string {
  // Try to get the best available name with priority order
  const senderName =
    conversationsUserInfo?.fullName || // First priority: info from conversations store
    message.sender?.userInfo?.fullName || // Second priority: info from message sender
    userInfo?.fullName || // Third priority: info from props
    (message as ExtendedMessage).senderName || // Fourth priority: extended message info
    (message.senderId
      ? `Người dùng ${message.senderId.slice(-4)}`
      : "Thành viên nhóm");

  // Don't show "Unknown" - use a more user-friendly fallback
  return senderName === "Unknown"
    ? message.senderId
      ? `Người dùng ${message.senderId.slice(-4)}`
      : "Thành viên nhóm"
    : senderName;
}

interface MessageItemProps {
  message: Message | ExtendedMessage;
  isCurrentUser: boolean;
  showAvatar?: boolean;
  onReply?: (message: Message) => void;
  onMessageClick?: (message: Message) => void;
  highlight?: string;
  userInfo?: UserInfo; // Thêm userInfo cho người gửi
  isGroupMessage?: boolean; // Thêm flag để xác định tin nhắn nhóm
}

// Summary dialog component
interface SummaryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  originalText: string;
  summary: string;
  isLoading: boolean;
}

function SummaryDialog({
  isOpen,
  onClose,
  originalText,
  summary,
  isLoading,
}: SummaryDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <FileDigit className="h-5 w-5 mr-2 text-blue-500" />
            Tóm tắt nội dung
          </DialogTitle>
          <DialogDescription>
            Nội dung được tóm tắt bằng trí tuệ nhân tạo
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 max-h-[60vh] overflow-auto">
          {isLoading ? (
            <div className="py-8 flex justify-center items-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            <>
              <div className="bg-blue-50 p-3 rounded-md text-sm border border-blue-100">
                <h4 className="font-medium text-blue-700 mb-1">
                  Nội dung tóm tắt:
                </h4>
                <p className="text-blue-600 whitespace-pre-wrap">{summary}</p>
              </div>
              <div className="bg-gray-100 p-3 rounded-md text-sm">
                <h4 className="font-medium text-gray-700 mb-1">
                  Nội dung gốc:
                </h4>
                <p className="text-gray-600 whitespace-pre-wrap">
                  {originalText}
                </p>
              </div>
            </>
          )}
        </div>
        <div className="flex justify-between mt-4">
          <Button variant="outline" onClick={onClose}>
            Đóng
          </Button>
          {!isLoading && (
            <Button
              variant="outline"
              onClick={() => {
                navigator.clipboard.writeText(summary);
                toast.success("Đã sao chép vào clipboard");
              }}
            >
              <Copy className="h-4 w-4 mr-2" />
              Sao chép tóm tắt
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Define minimum character requirements
const MIN_SUMMARIZE_LENGTH = 50;

// Helper function to get message content text
const getMessageText = (message: Message | ExtendedMessage): string => {
  if (!message.content) return "";
  return message.content.text || "";
};

// Helper function to get message content media
const getMessageMedia = (message: Message | ExtendedMessage): Media[] => {
  if (!message.content) return [];
  return message.content.media || [];
};

export default function MessageItem({
  message,
  isCurrentUser,
  showAvatar = true,
  onReply,
  onMessageClick,
  highlight,
  userInfo,
  isGroupMessage,
}: MessageItemProps) {
  // Auto-detect if this is a group message if not explicitly provided
  const isGroup =
    isGroupMessage ||
    message.messageType === MessageType.GROUP ||
    !!message.groupId;
  const [isHovered, setIsHovered] = useState(false);
  const [isForwardDialogOpen, setIsForwardDialogOpen] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [summaryDialogOpen, setSummaryDialogOpen] = useState(false);
  const [summaryText, setSummaryText] = useState("");
  const formattedTime = formatMessageTime(message.createdAt);
  const currentUser = useAuthStore((state) => state.user);
  // Get chat store for message operations
  const chatStore = useChatStore();

  // Get user info from conversations store with proper error handling
  const conversationsStore = useConversationsStore();
  const senderInfoFromConversations = useMemo(() => {
    if (!message.senderId) return null;
    try {
      return conversationsStore.getUserInfoFromConversations(message.senderId);
    } catch (error) {
      console.error("Error getting user info from conversations:", error);
      return null;
    }
  }, [message.senderId, conversationsStore]);

  // Store chatStore in a ref to prevent re-renders
  const chatStoreRef = useRef(chatStore);
  useEffect(() => {
    chatStoreRef.current = chatStore;
  }, [chatStore]);

  // Ref to track if we've already attempted to mark this message as read
  const markAsReadAttemptedRef = useRef(new Set<string>());

  // Biến để tái sử dụng về sau
  const currentUserId = currentUser?.id || "";
  const isRead =
    Array.isArray(message.readBy) && message.readBy.includes(currentUserId);
  const isSent = message.id && !message.id.startsWith("temp-");

  // Use a ref to track when we last refreshed group data
  const lastGroupRefreshRef = useRef<Record<string, number>>({});

  // Check if we need to fetch user information for this message
  useEffect(() => {
    // Only for group messages where sender info is missing or incomplete
    if (
      isGroup &&
      !isCurrentUser &&
      message.senderId &&
      message.groupId &&
      (!message.sender?.userInfo ||
        !message.sender.userInfo.fullName ||
        message.sender.userInfo.fullName === "Unknown")
    ) {
      // Check if we've already refreshed this group recently (within 5 seconds)
      const lastRefreshTime = lastGroupRefreshRef.current[message.groupId];
      const now = Date.now();

      if (lastRefreshTime && now - lastRefreshTime < 5000) {
        console.log(
          `[MessageItem] Skipping refresh for group ${message.groupId}, last refresh was ${now - lastRefreshTime}ms ago`,
        );
        return;
      }

      console.log(
        `[MessageItem] Message ${message.id} has missing sender info, triggering group refresh`,
      );

      // Record this refresh
      lastGroupRefreshRef.current[message.groupId] = now;

      // Clean up old entries
      Object.keys(lastGroupRefreshRef.current).forEach((groupId) => {
        if (now - lastGroupRefreshRef.current[groupId] > 30000) {
          // 30 seconds
          delete lastGroupRefreshRef.current[groupId];
        }
      });

      // Use setTimeout to break potential update cycles
      setTimeout(() => {
        try {
          // Get fresh references to avoid stale closures
          const currentChatStore = useChatStore.getState();
          const conversationsStore = useConversationsStore.getState();

          // Trigger a refresh of the selected group to get updated member information
          if (
            currentChatStore.refreshSelectedGroup &&
            currentChatStore.selectedGroup?.id === message.groupId
          ) {
            console.log(
              `[MessageItem] Refreshing group data for ${message.groupId}`,
            );
            currentChatStore.refreshSelectedGroup();
          } else {
            // If not the selected group, force an update of the conversations list
            console.log(
              `[MessageItem] Forcing update of conversations to get group ${message.groupId}`,
            );
            conversationsStore.forceUpdate();
          }
        } catch (error) {
          console.error(`[MessageItem] Error refreshing group data:`, error);
        }
      }, 1000); // Increased delay to prevent rapid updates
    }
  }, [
    isGroup,
    isCurrentUser,
    message.senderId,
    message.sender?.userInfo?.fullName, // More specific dependency
    message.id,
    message.groupId,
    // Removed chatStore from dependencies to prevent infinite loops
  ]);

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
      // Silent error handling
    }
  };

  const handleMarkAsUnread = async () => {
    try {
      if (message.id) {
        await chatStore.markMessageAsUnreadById(message.id);
      }
    } catch (error) {
      // Silent error handling
    }
  };

  const handleRecallMessage = async () => {
    try {
      await chatStore.recallMessageById(message.id);
      // Force a re-render
      setIsHovered(false);
    } catch (error) {
      // Silent error handling
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
      await chatStore.addReactionToMessageById(message.id, reactionType);
    } catch (error) {
      // Silent error handling
    }
  };

  const handleRemoveReaction = async () => {
    try {
      await chatStore.removeReactionFromMessageById(message.id);
    } catch (error) {
      // Silent error handling
    }
  };

  const handleForwardMessage = () => {
    setIsForwardDialogOpen(true);
  };

  // Function to process tabs in text
  const processTabsInText = (text: string): React.ReactNode => {
    return text.split("\t").map((segment, i) => (
      <React.Fragment key={i}>
        {i > 0 && <span className="inline-block w-8"></span>}
        {segment}
      </React.Fragment>
    ));
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

      // First handle line breaks by splitting the text into lines
      const lines = text.split("\n");

      return lines.map((line, lineIndex) => {
        // Process tabs in the line
        const lineWithTabs = line.includes("\t")
          ? processTabsInText(line)
          : line;

        // If we've processed tabs, we can't apply regex highlighting
        if (line.includes("\t")) {
          return (
            <span key={lineIndex}>
              {lineWithTabs}
              {lineIndex < lines.length - 1 && <br />}
            </span>
          );
        }

        // For lines without tabs, apply the highlighting
        const parts = line.split(regex);

        const highlightedLine = parts.map((part, i) => {
          // Check if this part matches the search term
          if (part.toLowerCase() === searchText.toLowerCase()) {
            return (
              <span
                key={`${lineIndex}-${i}`}
                className="bg-yellow-200 px-0.5 rounded"
              >
                {part}
              </span>
            );
          }
          return part;
        });

        // Return the line with a line break if it's not the last line
        return (
          <span key={lineIndex}>
            {highlightedLine}
            {lineIndex < lines.length - 1 && <br />}
          </span>
        );
      });
    } catch {
      // If any error in regex, return plain text with line breaks and tabs preserved
      return text.split("\n").map((line, index) => (
        <span key={index}>
          {line.includes("\t") ? processTabsInText(line) : line}
          {index < text.split("\n").length - 1 && <br />}
        </span>
      ));
    }
  };

  const isDeletedForSelf = message.deletedBy.includes(currentUser?.id || "");

  const handleSummarizeMessage = async () => {
    // Validate message has content
    if (!message.content.text || message.content.text.trim().length === 0) {
      toast.error("Không thể tóm tắt", {
        description: "Tin nhắn không có nội dung văn bản để tóm tắt",
      });
      return;
    }

    // Check message is long enough to summarize
    if (message.content.text.trim().length < MIN_SUMMARIZE_LENGTH) {
      toast.error("Không thể tóm tắt", {
        description: `Tin nhắn cần có ít nhất ${MIN_SUMMARIZE_LENGTH} ký tự để tóm tắt`,
      });
      return;
    }

    setIsSummarizing(true);
    setSummaryDialogOpen(true);
    setSummaryText("");

    try {
      const result = await summarizeText(message.content.text, 150);

      if (result.success && result.summary) {
        setSummaryText(result.summary);
      } else {
        toast.error("Không thể tóm tắt", {
          description: result.error || "Đã xảy ra lỗi khi tóm tắt nội dung",
        });
        setSummaryDialogOpen(false);
      }
    } catch {
      toast.error("Không thể tóm tắt", {
        description: "Đã xảy ra lỗi khi kết nối đến dịch vụ AI",
      });
      setSummaryDialogOpen(false);
    } finally {
      setIsSummarizing(false);
    }
  };

  const messageText = getMessageText(message);
  const messageMedia = getMessageMedia(message);

  if (isDeletedForSelf) {
    return null;
  }

  return (
    <>
      <ForwardMessageDialog
        message={message}
        isOpen={isForwardDialogOpen}
        onOpenChange={setIsForwardDialogOpen}
      />

      <SummaryDialog
        isOpen={summaryDialogOpen}
        onClose={() => setSummaryDialogOpen(false)}
        originalText={messageText}
        summary={summaryText}
        isLoading={isSummarizing}
      />

      <div
        className={`flex group ${isCurrentUser ? "justify-end" : "justify-start"} mb-2 relative`}
      >
        {!isCurrentUser && showAvatar && (
          <div className="mr-2 flex-shrink-0">
            <Avatar className="h-8 w-8">
              <AvatarImage
                className="select-none relative object-cover"
                src={
                  // Ưu tiên thông tin từ conversations store
                  senderInfoFromConversations?.profilePictureUrl ||
                  // Sau đó đến thông tin từ sender trong message
                  message.sender?.userInfo?.profilePictureUrl ||
                  // Cuối cùng đến userInfo được truyền vào từ props
                  userInfo?.profilePictureUrl ||
                  undefined
                }
              />
              <AvatarFallback>
                {getUserInitials({
                  userInfo:
                    // Ưu tiên thông tin từ conversations store
                    senderInfoFromConversations ||
                    // Sau đó đến thông tin từ sender trong message
                    message.sender?.userInfo ||
                    // Cuối cùng đến userInfo được truyền vào từ props
                    userInfo ||
                    ({
                      fullName: isGroup ? "Thành viên" : "Người dùng",
                    } as UserInfo),
                } as User)}
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
                  disabled
                >
                  <AtSign className="h-4 w-4 text-gray-600" />
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
                      {message.content.text &&
                        message.content.text.trim().length > 0 && (
                          <DropdownMenuItem
                            onClick={handleSummarizeMessage}
                            disabled={
                              isSummarizing ||
                              message.content.text.trim().length <
                                MIN_SUMMARIZE_LENGTH
                            }
                            title={
                              message.content.text.trim().length <
                              MIN_SUMMARIZE_LENGTH
                                ? `Tin nhắn cần có ít nhất ${MIN_SUMMARIZE_LENGTH} ký tự để tóm tắt`
                                : "Tóm tắt nội dung bằng AI"
                            }
                          >
                            <FileDigit className="h-4 w-4 mr-2" />
                            <span>
                              {isSummarizing
                                ? "Đang tóm tắt..."
                                : message.content.text.trim().length <
                                    MIN_SUMMARIZE_LENGTH
                                  ? `Cần ít nhất ${MIN_SUMMARIZE_LENGTH} ký tự`
                                  : "Tóm tắt nội dung"}
                            </span>
                          </DropdownMenuItem>
                        )}
                      <Separator />
                    </>
                  )}
                  {!isCurrentUser && !message.recalled && (
                    <DropdownMenuItem disabled onClick={handleReply}>
                      <Reply className="h-4 w-4 mr-2" />
                      <span>Trả lời</span>
                    </DropdownMenuItem>
                  )}
                  {!message.recalled && (
                    <DropdownMenuItem onClick={handleForwardMessage}>
                      <Forward className="h-4 w-4 mr-2" />
                      <span>Chuyển tiếp</span>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem disabled>
                    <Pin className="h-4 w-4 mr-2" />
                    <span>Ghim tin nhắn</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem disabled>
                    <Info className="h-4 w-4 mr-2" />
                    <span>Xem chi tiết</span>
                  </DropdownMenuItem>
                  {!message.recalled && (
                    <DropdownMenuItem disabled onClick={handleMarkAsUnread}>
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

          {/* Display sender name for group messages */}
          {isGroup && !isCurrentUser && !message.recalled && (
            <div className="text-xs font-medium text-blue-600 mb-1">
              {getSenderName(message, userInfo, senderInfoFromConversations)}
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
          {(message.recalled || messageText) && (
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
                messageMedia.length ||
                message.content?.image ||
                message.content?.video
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
                  {message.forwardedFrom && (
                    <div className="flex items-center text-xs mb-1 opacity-70">
                      <CornerUpRight className="h-3 w-3 mr-1" />
                      Tin nhắn đã được chuyển tiếp
                    </div>
                  )}
                  {highlight
                    ? renderHighlightedText(messageText, highlight || "")
                    : messageText.split("\n").map((line, index) => (
                        <span key={index}>
                          {line.includes("\t") ? processTabsInText(line) : line}
                          {index < messageText.split("\n").length - 1 && <br />}
                        </span>
                      ))}
                </div>
              )}
            </div>
          )}

          {/* Media content - outside of message bubble */}
          {!message.recalled && (
            <>
              {/* Forwarded indicator for media-only messages */}
              {message.forwardedFrom && !message.content.text && (
                <div
                  className={`text-xs mb-1 px-2 py-1 rounded-lg ${isCurrentUser ? "bg-blue-100 text-blue-800" : "bg-gray-100 text-gray-800"}`}
                >
                  <div className="flex items-center gap-1">
                    <CornerUpRight className="h-3 w-3" />
                    <span className="font-medium">
                      Tin nhắn đã được chuyển tiếp
                    </span>
                  </div>
                </div>
              )}
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
                    <span title="Đã xem" className="text-gray-500">
                      Đã xem
                    </span>
                  ) : isSent ? (
                    <span title="Đã gửi" className="text-gray-400">
                      Đã gửi
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
              {/* Reaction summary */}
              {!message.recalled &&
                message.reactions &&
                message.reactions.length > 0 && (
                  <ReactionSummary reactions={message.reactions} />
                )}

              {/* Reaction buttons - only show if message is not recalled */}
              {!message.recalled && (
                <ReactionPicker
                  isCurrentUser={isCurrentUser}
                  userReaction={getUserReaction()}
                  onReaction={handleReaction}
                  onRemoveReaction={handleRemoveReaction}
                />
              )}
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
                {getUserInitials(
                  currentUser ||
                    ({
                      userInfo: {
                        fullName: "Bạn",
                      },
                    } as User),
                )}
              </AvatarFallback>
            </Avatar>
          </div>
        )}
      </div>
    </>
  );
}
