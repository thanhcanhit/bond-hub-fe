"use client";

import { useState, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Group, GroupMember, User, UserInfo, Media } from "@/types/base";
import {
  X,
  Users,
  UserPlus,
  Settings,
  LogOut,
  Bell,
  Pin,
  FileImage,
  Link2,
  ChevronRight,
  Trash,
  ExternalLink,
  Image as ImageIcon,
  Video,
  File,
  ChevronDown,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import ProfileDialog from "@/components/profile/ProfileDialog";
import { getUserDataById } from "@/actions/user.action";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useChatStore } from "@/stores/chatStore";

interface GroupInfoProps {
  group: Group | null;
  onClose: () => void;
}

export default function GroupInfo({ group, onClose }: GroupInfoProps) {
  const [selectedMember, setSelectedMember] = useState<
    (User & { userInfo: UserInfo }) | null
  >(null);
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [mediaFiles, setMediaFiles] = useState<Media[]>([]);
  const [documents, setDocuments] = useState<Media[]>([]);
  const [links, setLinks] = useState<
    { url: string; title: string; timestamp: Date }[]
  >([]);
  const [isLoadingMedia, setIsLoadingMedia] = useState(true);

  const messages = useChatStore((state) => state.messages);

  // Lấy media từ tin nhắn
  useEffect(() => {
    if (group?.id) {
      setIsLoadingMedia(true);

      // Lọc media từ tin nhắn hiện có
      const extractMediaFromMessages = () => {
        const imageAndVideoFiles: Media[] = [];
        const documentFiles: Media[] = [];
        const extractedLinks: {
          url: string;
          title: string;
          timestamp: Date;
        }[] = [];

        messages.forEach((message) => {
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
                imageAndVideoFiles.push(media);
              } else {
                documentFiles.push(media);
              }
            });
          }

          // Xử lý links trong text
          if (message.content.text) {
            const urlRegex = /(https?:\/\/[^\s]+)/g;
            const matches = message.content.text.match(urlRegex);
            if (matches) {
              matches.forEach((url) => {
                extractedLinks.push({
                  url,
                  title: url,
                  timestamp: new Date(message.createdAt),
                });
              });
            }
          }
        });

        setMediaFiles(imageAndVideoFiles.slice(0, 20)); // Giới hạn 20 file
        setDocuments(documentFiles.slice(0, 10)); // Giới hạn 10 file
        setLinks(extractedLinks.slice(0, 10)); // Giới hạn 10 link
        setIsLoadingMedia(false);
      };

      extractMediaFromMessages();
    }
  }, [group?.id, messages]);

  if (!group) {
    return null;
  }

  const handleMemberClick = async (memberId: string) => {
    try {
      const result = await getUserDataById(memberId);
      if (result.success && result.user) {
        setSelectedMember(result.user as User & { userInfo: UserInfo });
        setShowProfileDialog(true);
      }
    } catch (error) {
      console.error("Error fetching member data:", error);
    }
  };

  return (
    <div className="h-full flex flex-col bg-white border-l">
      <div className="p-4 flex items-center justify-between border-b">
        <h2 className="font-semibold">Thông tin nhóm</h2>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full"
          onClick={onClose}
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* Thông tin nhóm */}
          <div className="flex flex-col items-center text-center">
            <Avatar className="h-24 w-24 mb-3">
              <AvatarImage
                src={group.avatarUrl || undefined}
                className="object-cover"
              />
              <AvatarFallback className="text-2xl">
                {group.name?.slice(0, 2).toUpperCase() || "GR"}
              </AvatarFallback>
            </Avatar>
            <h2 className="text-lg font-semibold">{group.name}</h2>

            {/* Các chức năng chính */}
            <div className="grid grid-cols-4 gap-4 w-full mt-6">
              <div className="flex flex-col items-center">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-12 w-12 rounded-full bg-blue-50 text-blue-500 mb-1"
                >
                  <Bell className="h-6 w-6" />
                </Button>
                <span className="text-xs">Bật thông báo</span>
              </div>

              <div className="flex flex-col items-center">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-12 w-12 rounded-full bg-blue-50 text-blue-500 mb-1"
                >
                  <Pin className="h-6 w-6" />
                </Button>
                <span className="text-xs">Ghim hội thoại</span>
              </div>

              <div className="flex flex-col items-center">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-12 w-12 rounded-full bg-blue-50 text-blue-500 mb-1"
                >
                  <UserPlus className="h-6 w-6" />
                </Button>
                <span className="text-xs">Thêm thành viên</span>
              </div>

              <div className="flex flex-col items-center">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-12 w-12 rounded-full bg-blue-50 text-blue-500 mb-1"
                >
                  <Settings className="h-6 w-6" />
                </Button>
                <span className="text-xs">Quản lý nhóm</span>
              </div>
            </div>
          </div>

          {/* Thành viên nhóm */}
          <Collapsible
            defaultOpen
            className="border rounded-md overflow-hidden"
          >
            <CollapsibleTrigger className="flex items-center justify-between w-full p-3 hover:bg-gray-50">
              <div className="flex items-center">
                <Users className="h-5 w-5 mr-2 text-gray-500" />
                <span className="font-medium">
                  {group.members?.length || 0} thành viên
                </span>
              </div>
              <ChevronDown className="h-5 w-5 text-gray-500" />
            </CollapsibleTrigger>
            <CollapsibleContent>
              <Separator />
              <div className="max-h-[200px] overflow-y-auto">
                {group.members?.slice(0, 5).map((member: GroupMember) => (
                  <div
                    key={member.id}
                    className="flex items-center p-3 hover:bg-gray-50 cursor-pointer"
                    onClick={() => handleMemberClick(member.userId)}
                  >
                    <Avatar className="h-10 w-10 mr-3">
                      <AvatarImage
                        src={
                          member.user?.userInfo?.profilePictureUrl || undefined
                        }
                        className="object-cover"
                      />
                      <AvatarFallback>
                        {member.user?.userInfo?.fullName
                          ?.slice(0, 2)
                          .toUpperCase() || "??"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="text-sm font-medium">
                        {member.user?.userInfo?.fullName || "Thành viên"}
                      </p>
                      <p className="text-xs text-gray-500">
                        {member.role === "LEADER"
                          ? "Trưởng nhóm"
                          : member.role === "CO_LEADER"
                            ? "Phó nhóm"
                            : "Thành viên"}
                      </p>
                    </div>
                  </div>
                ))}
                {group.members && group.members.length > 5 && (
                  <div className="p-3 text-center">
                    <Button variant="ghost" size="sm" className="text-blue-500">
                      Xem tất cả thành viên
                    </Button>
                  </div>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Ảnh/Video */}
          <Collapsible
            defaultOpen
            className="border rounded-md overflow-hidden"
          >
            <CollapsibleTrigger className="flex items-center justify-between w-full p-3 hover:bg-gray-50">
              <div className="flex items-center">
                <ImageIcon className="h-5 w-5 mr-2 text-gray-500" />
                <span className="font-medium">Ảnh/Video</span>
              </div>
              <ChevronDown className="h-5 w-5 text-gray-500" />
            </CollapsibleTrigger>
            <CollapsibleContent>
              <Separator />
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
                        className="aspect-square relative overflow-hidden rounded-md cursor-pointer"
                      >
                        <div
                          className="w-full h-full bg-cover bg-center"
                          style={{ backgroundImage: `url(${media.url})` }}
                        ></div>
                        {media.metadata?.extension?.match(/mp4|webm|mov/i) && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                            <Video className="h-6 w-6 text-white" />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  {mediaFiles.length > 8 && (
                    <div className="mt-2 text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-blue-500"
                      >
                        Xem tất cả
                      </Button>
                    </div>
                  )}
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
          <Collapsible
            defaultOpen
            className="border rounded-md overflow-hidden"
          >
            <CollapsibleTrigger className="flex items-center justify-between w-full p-3 hover:bg-gray-50">
              <div className="flex items-center">
                <File className="h-5 w-5 mr-2 text-gray-500" />
                <span className="font-medium">File</span>
              </div>
              <ChevronDown className="h-5 w-5 text-gray-500" />
            </CollapsibleTrigger>
            <CollapsibleContent>
              <Separator />
              {isLoadingMedia ? (
                <div className="p-4 text-center">
                  <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
                  <p className="text-sm text-gray-500 mt-2">Đang tải...</p>
                </div>
              ) : documents.length > 0 ? (
                <div className="p-3 space-y-2">
                  {documents.slice(0, 3).map((doc, index) => (
                    <div
                      key={index}
                      className="flex items-center p-2 border rounded-md hover:bg-gray-50 cursor-pointer"
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
                    <div className="text-center pt-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-blue-500"
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
          <Collapsible
            defaultOpen
            className="border rounded-md overflow-hidden"
          >
            <CollapsibleTrigger className="flex items-center justify-between w-full p-3 hover:bg-gray-50">
              <div className="flex items-center">
                <Link2 className="h-5 w-5 mr-2 text-gray-500" />
                <span className="font-medium">Link</span>
              </div>
              <ChevronDown className="h-5 w-5 text-gray-500" />
            </CollapsibleTrigger>
            <CollapsibleContent>
              <Separator />
              {isLoadingMedia ? (
                <div className="p-4 text-center">
                  <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
                  <p className="text-sm text-gray-500 mt-2">Đang tải...</p>
                </div>
              ) : links.length > 0 ? (
                <div className="p-3 space-y-2">
                  {links.slice(0, 3).map((link, index) => (
                    <div
                      key={index}
                      className="flex items-center p-2 border rounded-md hover:bg-gray-50 cursor-pointer"
                    >
                      <div className="bg-blue-100 p-2 rounded-md mr-3">
                        <ExternalLink className="h-5 w-5 text-blue-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {link.title}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {link.url}
                        </p>
                      </div>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  {links.length > 3 && (
                    <div className="text-center pt-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-blue-500"
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

          {/* Cài đặt nhóm */}
          <div className="space-y-4 mt-6">
            <Button
              variant="ghost"
              className="w-full justify-start text-red-500 pl-2"
            >
              <Trash className="h-5 w-5 mr-3" />
              <span>Xóa lịch sử trò chuyện</span>
            </Button>

            <Button
              variant="ghost"
              className="w-full justify-start text-red-500 pl-2"
            >
              <LogOut className="h-5 w-5 mr-3" />
              <span>Rời nhóm</span>
            </Button>
          </div>
        </div>
      </ScrollArea>

      {showProfileDialog && selectedMember && (
        <ProfileDialog
          user={selectedMember}
          isOpen={showProfileDialog}
          onOpenChange={setShowProfileDialog}
          isOwnProfile={false}
        />
      )}
    </div>
  );
}
