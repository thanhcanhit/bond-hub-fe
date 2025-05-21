"use client";

import { useState, useEffect, useRef } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { User, UserInfo, Media, GroupRole } from "@/types/base";
import { getLinkIcon, getLinkTitle } from "@/utils/link-utils";
import MediaViewer from "@/components/media/MediaViewer";
import {
  X,
  Bell,
  Pin,
  FileImage,
  ChevronRight,
  Trash,
  Video,
  ChevronDown,
  Users,
} from "lucide-react";
import MediaGalleryView from "./MediaGalleryView";
// Removed ScrollArea import to fix infinite update loop
import ProfileDialog from "@/components/profile/ProfileDialog";
import CreateGroupDialog from "@/components/group/CreateGroupDialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useChatStore } from "@/stores/chatStore";
import { useAuthStore } from "@/stores/authStore";
import { toast } from "sonner";

interface ContactInfoProps {
  contact?:
    | (User & { userInfo: UserInfo; online?: boolean; lastSeen?: Date })
    | null;
  group?: {
    id: string;
    name: string;
    avatarUrl?: string | null;
    createdAt?: Date;
    memberIds?: string[];
    memberUsers?: Array<{
      id: string;
      fullName: string;
      profilePictureUrl?: string | null;
      role: GroupRole;
    }>;
  } | null;
  onClose: () => void;
  isOverlay?: boolean;
}

export default function ContactInfo({
  contact,
  onClose,
  isOverlay = false,
}: ContactInfoProps) {
  const [mediaFiles, setMediaFiles] = useState<(Media & { createdAt: Date })[]>(
    [],
  );
  const [documents, setDocuments] = useState<(Media & { createdAt: Date })[]>(
    [],
  );
  const [showMediaGallery, setShowMediaGallery] = useState(false);
  const [showMediaViewer, setShowMediaViewer] = useState(false);
  const [selectedMediaIndex, setSelectedMediaIndex] = useState(0);
  const [links, setLinks] = useState<
    { url: string; title: string; timestamp: Date }[]
  >([]);
  const [isLoadingMedia, setIsLoadingMedia] = useState(true);
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [activeGalleryTab, setActiveGalleryTab] = useState<
    "media" | "files" | "links"
  >("media");
  const [showCreateGroupDialog, setShowCreateGroupDialog] = useState(false);

  // Sử dụng ref để lưu trữ ID liên hệ trước đó - phải đặt ở ngoài useEffect
  const prevContactIdRef = useRef<string | null>(null);

  // Reset media gallery, viewer, and create group dialog when contact changes
  // Tối ưu hóa để tránh vòng lặp vô hạn
  useEffect(() => {
    if (!contact?.id) return;

    // Chỉ reset khi ID liên hệ thay đổi
    if (prevContactIdRef.current !== contact.id) {
      console.log(
        `[ContactInfo] Contact changed from ${prevContactIdRef.current} to ${contact.id}, resetting state`,
      );

      // Cập nhật ID liên hệ hiện tại
      prevContactIdRef.current = contact.id;

      // Reset các state
      setShowMediaGallery(false);
      setShowMediaViewer(false);
      setShowCreateGroupDialog(false);
    }
  }, [contact?.id]);

  const messages = useChatStore((state) => state.messages);
  const currentUser = useAuthStore((state) => state.user);

  // Lấy media từ tin nhắn - tối ưu hóa để tránh vòng lặp vô hạn
  useEffect(() => {
    if (!contact?.id) return;

    // Lưu ID liên hệ hiện tại vào biến local
    const currentContactId = contact.id;

    // Tạo một ID duy nhất cho lần chạy này của useEffect
    const effectId = Math.random().toString(36).substring(2, 9);

    console.log(
      `[ContactInfo:${effectId}] Starting media extraction for contact ${currentContactId}`,
    );

    // Sử dụng setTimeout để tránh nhiều lần render liên tiếp
    const timeoutId = setTimeout(() => {
      setIsLoadingMedia(true);

      // Lọc media từ tin nhắn hiện có
      const extractMediaFromMessages = () => {
        const imageAndVideoFiles: (Media & {
          createdAt: Date;
          sender?: unknown;
          senderId?: string;
        })[] = [];
        const documentFiles: (Media & {
          createdAt: Date;
          sender?: unknown;
          senderId?: string;
        })[] = [];
        const extractedLinks: {
          url: string;
          title: string;
          timestamp: Date;
        }[] = [];

        messages.forEach((message) => {
          // Bỏ qua các tin nhắn đã thu hồi
          if (message.recalled) return;

          // Xử lý media
          if (message.content.media && message.content.media.length > 0) {
            message.content.media.forEach((media) => {
              if (!media.metadata || !media.metadata.extension) return;
              const extension = media.metadata.extension.toLowerCase();
              if (
                [
                  "jpg",
                  "jpeg",
                  "png",
                  "gif",
                  "webp",
                  "mp4",
                  "webm",
                  "mov",
                ].includes(extension)
              ) {
                imageAndVideoFiles.push({
                  ...media,
                  createdAt: new Date(message.createdAt),
                  senderId: message.senderId,
                  sender: message.sender,
                });
              } else {
                documentFiles.push({
                  ...media,
                  createdAt: new Date(message.createdAt),
                  senderId: message.senderId,
                  sender: message.sender,
                });
              }
            });
          }

          // Xử lý links trong text
          if (message.content.text) {
            const urlRegex = /(https?:\/\/[^\s]+)/g;
            const matches = message.content.text.match(urlRegex);
            if (matches) {
              matches.forEach((url) => {
                // Get domain for display
                const domain = url.replace(/^https?:\/\//, "").split("/")[0];

                // Use the utility function to get a better title
                const title = getLinkTitle(domain, url);

                extractedLinks.push({
                  url,
                  title,
                  timestamp: new Date(message.createdAt),
                });
              });
            }
          }
        });

        // Sắp xếp media từ mới đến cũ
        imageAndVideoFiles.sort(
          (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
        );
        documentFiles.sort(
          (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
        );
        extractedLinks.sort(
          (a, b) => b.timestamp.getTime() - a.timestamp.getTime(),
        );

        setMediaFiles(imageAndVideoFiles.slice(0, 20)); // Giới hạn 20 file
        setDocuments(documentFiles.slice(0, 10)); // Giới hạn 10 file
        setLinks(extractedLinks.slice(0, 10)); // Giới hạn 10 link
        setIsLoadingMedia(false);
      };

      extractMediaFromMessages();
    }, 100); // Thêm độ trễ nhỏ để tránh nhiều lần render liên tiếp

    // Cleanup function để tránh memory leak và cập nhật state sau khi component unmount
    return () => {
      clearTimeout(timeoutId);
      console.log(
        `[ContactInfo:${effectId}] Cleanup for contact ${currentContactId}`,
      );
    };
  }, [contact?.id]); // Loại bỏ messages từ dependencies để tránh vòng lặp vô hạn

  if (!contact) {
    return null;
  }

  if (showMediaGallery) {
    return (
      <MediaGalleryView
        mediaFiles={mediaFiles}
        documents={documents}
        links={links}
        initialTab={activeGalleryTab}
        onClose={() => setShowMediaGallery(false)}
      />
    );
  }

  return (
    <div
      className={`h-full flex flex-col bg-white ${!isOverlay ? "border-l" : ""}`}
    >
      <div className="p-4 flex items-center justify-between border-b">
        <h2 className="font-semibold">Thông tin hội thoại</h2>
        <Button
          variant="ghost"
          size="icon"
          className={`${isOverlay ? "bg-gray-100 hover:bg-gray-200" : "rounded-full"}`}
          onClick={onClose}
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="space-y-2 bg-[#ebecf0]">
          {/* Thông tin người dùng */}
          <div className="flex flex-col items-center text-center bg-white p-2">
            <Avatar
              className="h-20 w-20 mb-3 cursor-pointer"
              onClick={() => setShowProfileDialog(true)}
            >
              <AvatarImage
                src={contact.userInfo?.profilePictureUrl || undefined}
                className="object-cover"
              />
              <AvatarFallback className="text-xl">
                {contact.userInfo?.fullName?.slice(0, 2).toUpperCase() || "??"}
              </AvatarFallback>
            </Avatar>
            <div className="flex items-center justify-center gap-2">
              <h2 className="text-lg font-semibold">
                {contact.userInfo?.fullName}
              </h2>
            </div>

            {/* Các chức năng chính */}
            <div className="grid grid-cols-3 gap-4 w-full m-2">
              <div className="flex flex-col items-center">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 rounded-full bg-blue-50 text-blue-500 mb-1 opacity-60"
                  onClick={() => toast.info("Tính năng này chưa được hỗ trợ")}
                >
                  <Bell className="h-6 w-6" />
                </Button>
                <span className="text-xs">Tắt thông báo</span>
              </div>

              <div className="flex flex-col items-center">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 rounded-full bg-blue-50 text-blue-500 mb-1 opacity-60"
                  onClick={() => toast.info("Tính năng này chưa được hỗ trợ")}
                >
                  <Pin className="h-6 w-6" />
                </Button>
                <span className="text-xs">Ghim hội thoại</span>
              </div>

              <div className="flex flex-col items-center">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 rounded-full bg-blue-50 text-blue-500 mb-1"
                  onClick={() => setShowCreateGroupDialog(true)}
                >
                  <Users className="h-6 w-6" />
                </Button>
                <span className="text-xs">Tạo nhóm chat</span>
              </div>
            </div>
          </div>

          {/* Ảnh/Video */}
          <Collapsible defaultOpen className="overflow-hidden bg-white">
            <CollapsibleTrigger className="flex items-center justify-between w-full p-3 hover:bg-gray-50">
              <div className="flex items-center">
                <span className="font-semibold">Ảnh/Video</span>
              </div>
              <ChevronDown className="h-5 w-5 text-gray-500" />
            </CollapsibleTrigger>
            <CollapsibleContent>
              {isLoadingMedia ? (
                <div className="p-4 text-center">
                  <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
                  <p className="text-sm text-gray-500 mt-2">Đang tải...</p>
                </div>
              ) : mediaFiles.length > 0 ? (
                <div className="p-3">
                  <div className="grid grid-cols-4 gap-1">
                    {mediaFiles.slice(0, 8).map((media, index) => (
                      <div
                        key={index}
                        className="aspect-square relative overflow-hidden border border-gray-200 rounded-md cursor-pointer"
                        onClick={() => {
                          setSelectedMediaIndex(index);
                          setShowMediaViewer(true);
                        }}
                      >
                        {media.metadata?.extension?.match(/mp4|webm|mov/i) ||
                        media.type === "VIDEO" ? (
                          <>
                            <div className="w-full h-full bg-black">
                              <video
                                src={media.url}
                                className="object-cover w-full h-full"
                                preload="metadata"
                                muted
                              />
                            </div>
                            <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                              <Video className="h-6 w-6 text-white" />
                            </div>
                          </>
                        ) : (
                          <div
                            className="w-full h-full bg-cover bg-center"
                            style={{ backgroundImage: `url(${media.url})` }}
                          ></div>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="mt-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-sm font-semibold w-full bg-[#e5e7eb] hover:bg-gray-300"
                      onClick={() => {
                        setActiveGalleryTab("media");
                        setShowMediaGallery(true);
                      }}
                    >
                      Xem tất cả
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="p-4 text-center">
                  <p className="text-sm text-gray-500">
                    Không có ảnh hoặc video nào
                  </p>
                </div>
              )}
            </CollapsibleContent>
          </Collapsible>

          {/* File */}
          <Collapsible defaultOpen className="overflow-hidden bg-white">
            <CollapsibleTrigger className="flex items-center justify-between w-full p-3 hover:bg-gray-50">
              <div className="flex items-center">
                <span className="font-semibold">File</span>
              </div>
              <ChevronDown className="h-5 w-5 text-gray-500" />
            </CollapsibleTrigger>
            <CollapsibleContent>
              {isLoadingMedia ? (
                <div className="p-4 text-center">
                  <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
                  <p className="text-sm text-gray-500 mt-2">Đang tải...</p>
                </div>
              ) : documents.length > 0 ? (
                <div className="space-y-2 pb-2">
                  {documents.slice(0, 3).map((doc, index) => (
                    <div
                      key={index}
                      className="flex items-center py-2 px-4 hover:bg-gray-200 cursor-pointer"
                      onClick={() => window.open(doc.url, "_blank")}
                    >
                      <div className="bg-blue-100 p-2 rounded-md mr-3">
                        <FileImage className="h-5 w-5 text-blue-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {doc.fileName}
                        </p>
                        <p className="text-xs text-gray-500">
                          {doc.metadata?.sizeFormatted ||
                            `${Math.round((doc.metadata?.size || 0) / 1024)} KB`}
                        </p>
                      </div>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  {documents.length > 3 && (
                    <div className="mt-2 px-2 text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-sm font-semibold w-full bg-[#e5e7eb] hover:bg-gray-300"
                        onClick={() => {
                          setActiveGalleryTab("files");
                          setShowMediaGallery(true);
                        }}
                      >
                        Xem tất cả
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-4 text-center">
                  <p className="text-sm text-gray-500">Không có file nào</p>
                </div>
              )}
            </CollapsibleContent>
          </Collapsible>

          {/* Link */}
          <Collapsible defaultOpen className="overflow-hidden bg-white">
            <CollapsibleTrigger className="flex items-center justify-between w-full p-3 hover:bg-gray-50">
              <div className="flex items-center">
                <span className="font-semibold">Link</span>
              </div>
              <ChevronDown className="h-5 w-5 text-gray-500" />
            </CollapsibleTrigger>
            <CollapsibleContent>
              {isLoadingMedia ? (
                <div className="p-4 text-center">
                  <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
                  <p className="text-sm text-gray-500 mt-2">Đang tải...</p>
                </div>
              ) : links.length > 0 ? (
                <div className="space-y-2 pb-2">
                  {links.slice(0, 3).map((link, index) => {
                    // Extract domain from URL
                    const domain = link.url
                      .replace(/^https?:\/\//, "")
                      .split("/")[0];
                    // Format date as DD/MM
                    const date = new Date(link.timestamp);
                    const formattedDate = `${date.getDate().toString().padStart(2, "0")}/${(date.getMonth() + 1).toString().padStart(2, "0")}`;

                    return (
                      <div
                        key={index}
                        className="flex items-center py-2 px-4 hover:bg-gray-200 cursor-pointer"
                        onClick={() =>
                          window.open(link.url, "_blank", "noopener,noreferrer")
                        }
                      >
                        <div className="w-10 h-10 rounded-md mr-3 flex items-center justify-center overflow-hidden">
                          {getLinkIcon(domain)}
                        </div>
                        <div className="flex-1 min-w-0 mr-2">
                          <p className="font-medium text-sm truncate max-w-[180px]">
                            {getLinkTitle(
                              domain,
                              link.title.length > 40
                                ? link.title.substring(0, 40) + "..."
                                : link.title,
                            )}
                          </p>
                          <p className="text-xs text-blue-500 truncate">
                            {domain}
                          </p>
                        </div>
                        <div className="text-xs text-gray-500 whitespace-nowrap">
                          {formattedDate}
                        </div>
                      </div>
                    );
                  })}
                  {links.length > 3 && (
                    <div className="mt-2 px-2 text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-sm font-semibold w-full bg-[#e5e7eb] hover:bg-gray-300"
                        onClick={() => {
                          setActiveGalleryTab("links");
                          setShowMediaGallery(true);
                        }}
                      >
                        Xem tất cả
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-4 text-center">
                  <p className="text-sm text-gray-500">Không có link nào</p>
                </div>
              )}
            </CollapsibleContent>
          </Collapsible>

          {/* Cài đặt hội thoại */}
          <div className="space-y-1 bg-white p-2">
            <Button
              variant="ghost"
              className="w-full justify-start text-red-500 pl-2"
              onClick={() => toast.info("Tính năng này chưa được hỗ trợ")}
            >
              <Trash className="h-5 w-5 mr-3" />
              <span>Xóa cuộc trò chuyện</span>
            </Button>
          </div>
        </div>
      </div>

      {showProfileDialog && contact && (
        <ProfileDialog
          user={contact}
          isOpen={showProfileDialog}
          onOpenChange={setShowProfileDialog}
          isOwnProfile={contact.id === currentUser?.id}
        />
      )}

      {/* Create Group Dialog */}
      {contact && (
        <CreateGroupDialog
          isOpen={showCreateGroupDialog}
          onOpenChange={setShowCreateGroupDialog}
          preSelectedFriendId={contact.id}
        />
      )}

      {/* Media Viewer */}
      {showMediaViewer && mediaFiles.length > 0 && (
        <MediaViewer
          isOpen={showMediaViewer}
          onClose={() => setShowMediaViewer(false)}
          media={mediaFiles.map((media) => ({
            ...media,
            // Ensure type is set correctly for videos
            type:
              media.metadata?.extension?.match(/mp4|webm|mov/i) ||
              media.type === "VIDEO"
                ? "VIDEO"
                : "IMAGE",
          }))}
          initialIndex={selectedMediaIndex}
          chatName={contact.userInfo?.fullName || "Hội thoại"}
        />
      )}
    </div>
  );
}
