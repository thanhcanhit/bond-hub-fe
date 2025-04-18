"use client";

import { useState, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Group, User, UserInfo, Media, GroupRole } from "@/types/base";
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
  ArrowLeft,
  MoreHorizontal,
  UserMinus,
  Shield,
  Ban,
} from "lucide-react";
import MediaGalleryView from "./MediaGalleryView";
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
import { useAuthStore } from "@/stores/authStore";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  deleteGroup,
  leaveGroup,
  removeGroupMember,
  updateMemberRole,
} from "@/actions/group.action";

interface GroupInfoProps {
  group: Group | null;
  onClose: () => void;
}

export default function GroupInfo({ group, onClose }: GroupInfoProps) {
  const [selectedMember, setSelectedMember] = useState<
    (User & { userInfo: UserInfo }) | null
  >(null);
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [mediaFiles, setMediaFiles] = useState<(Media & { createdAt: Date })[]>(
    [],
  );
  const [documents, setDocuments] = useState<(Media & { createdAt: Date })[]>(
    [],
  );
  const [showMediaGallery, setShowMediaGallery] = useState(false);
  const [links, setLinks] = useState<
    { url: string; title: string; timestamp: Date }[]
  >([]);
  const [isLoadingMedia, setIsLoadingMedia] = useState(true);
  const [showMembersList, setShowMembersList] = useState(false);
  const [memberDetails, setMemberDetails] = useState<{
    [key: string]: User & { userInfo: UserInfo };
  }>({});
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState<GroupRole | null>(
    null,
  );

  const messages = useChatStore((state) => state.messages);
  const currentUser = useAuthStore((state) => state.user);

  // Lấy thông tin chi tiết của các thành viên và vai trò của người dùng hiện tại
  useEffect(() => {
    if (group?.id && group.members) {
      const fetchMemberDetails = async () => {
        const newMemberDetails: {
          [key: string]: User & { userInfo: UserInfo };
        } = {};

        // Lấy thông tin chi tiết của từng thành viên
        for (const member of group.members) {
          try {
            // Kiểm tra xem đã có thông tin chi tiết chưa
            if (member.user?.userInfo) {
              newMemberDetails[member.userId] = member.user as User & {
                userInfo: UserInfo;
              };
              continue;
            }

            // Nếu chưa có, gọi API để lấy
            const result = await getUserDataById(member.userId);
            if (result.success && result.user) {
              newMemberDetails[member.userId] = result.user as User & {
                userInfo: UserInfo;
              };
            }
          } catch (error) {
            console.error(
              `Error fetching details for member ${member.userId}:`,
              error,
            );
          }

          // Kiểm tra vai trò của người dùng hiện tại
          if (currentUser && member.userId === currentUser.id) {
            setCurrentUserRole(member.role);
          }
        }

        setMemberDetails(newMemberDetails);
      };

      fetchMemberDetails();
    }
  }, [group?.id, group?.members, currentUser]);

  // Lấy media từ tin nhắn
  useEffect(() => {
    if (group?.id) {
      setIsLoadingMedia(true);

      // Lọc media từ tin nhắn hiện có
      const extractMediaFromMessages = () => {
        const imageAndVideoFiles: (Media & { createdAt: Date })[] = [];
        const documentFiles: (Media & { createdAt: Date })[] = [];
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
                imageAndVideoFiles.push({
                  ...media,
                  createdAt: new Date(message.createdAt),
                });
              } else {
                documentFiles.push({
                  ...media,
                  createdAt: new Date(message.createdAt),
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
                extractedLinks.push({
                  url,
                  title: url,
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
    }
  }, [group?.id, messages]);

  if (!group) {
    return null;
  }

  const handleMemberClick = async (memberId: string) => {
    // Kiểm tra xem đã có thông tin thành viên trong memberDetails chưa
    if (memberDetails[memberId]) {
      setSelectedMember(memberDetails[memberId]);
      setShowProfileDialog(true);
      return;
    }

    // Nếu member.user đã có đầy đủ thông tin, sử dụng luôn mà không cần gọi API
    const memberWithData = group?.members?.find(
      (m) => m.userId === memberId && m.user?.userInfo,
    );
    if (memberWithData?.user) {
      setSelectedMember(memberWithData.user as User & { userInfo: UserInfo });
      setShowProfileDialog(true);
      return;
    }

    try {
      // Nếu không có sẵn thông tin, gọi API để lấy
      const result = await getUserDataById(memberId);
      if (result.success && result.user) {
        setSelectedMember(result.user as User & { userInfo: UserInfo });
        setShowProfileDialog(true);
      }
    } catch (error) {
      console.error("Error fetching member data:", error);
      // Không hiển thị dialog nếu không thể lấy thông tin chi tiết
      console.log(
        "Không thể lấy thông tin thành viên, bỏ qua việc mở ProfileDialog",
      );
    }
  };

  if (showMediaGallery) {
    return (
      <MediaGalleryView
        mediaFiles={mediaFiles}
        onClose={() => setShowMediaGallery(false)}
      />
    );
  }

  if (showMembersList) {
    return (
      <div className="h-full flex flex-col bg-white border-l">
        <div className="p-4 flex items-center justify-between border-b">
          <div className="flex items-center">
            <Button
              variant="ghost"
              size="icon"
              className="mr-2"
              onClick={() => setShowMembersList(false)}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h2 className="font-semibold">Thành viên</h2>
          </div>
        </div>

        <div className="p-4 border-b">
          <Button className="w-full flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-black">
            <UserPlus className="h-4 w-4" />
            <span>Thêm thành viên</span>
          </Button>
        </div>

        <div className="p-4 flex justify-between items-center">
          <span className="text-sm">
            Danh sách thành viên ({group.members?.length || 0})
          </span>
          <Button variant="ghost" size="icon">
            <MoreHorizontal className="h-5 w-5" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {group.members?.map((member) => {
            const memberData = memberDetails[member.userId];
            const initials = memberData?.userInfo?.fullName
              ? memberData.userInfo.fullName.slice(0, 2).toUpperCase()
              : "??";

            return (
              <div
                key={member.userId}
                className="flex items-center p-4 hover:bg-gray-100 justify-between"
              >
                <div
                  className="flex items-center cursor-pointer"
                  onClick={() => handleMemberClick(member.userId)}
                >
                  <Avatar className="h-10 w-10 mr-3">
                    <AvatarImage
                      src={memberData?.userInfo?.profilePictureUrl || undefined}
                      className="object-cover"
                    />
                    <AvatarFallback className="bg-gray-200 text-gray-600">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">
                      {memberData?.userInfo?.fullName || "Thành viên"}
                    </p>
                    <p className="text-xs text-gray-500">
                      {member.role === "LEADER"
                        ? "Trưởng nhóm"
                        : member.role === "CO_LEADER"
                          ? "Phó nhóm"
                          : ""}
                    </p>
                  </div>
                </div>
                {/* Hiển thị menu tùy chọn cho thành viên nếu người dùng hiện tại là trưởng nhóm hoặc phó nhóm */}
                {(currentUserRole === "LEADER" ||
                  (currentUserRole === "CO_LEADER" &&
                    member.role === "MEMBER")) && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-5 w-5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {currentUserRole === "LEADER" &&
                        member.role === "MEMBER" && (
                          <DropdownMenuItem
                            onClick={() => handlePromoteMember(member.userId)}
                          >
                            <Shield className="h-4 w-4 mr-2" />
                            Thăng phó nhóm
                          </DropdownMenuItem>
                        )}
                      {currentUserRole === "LEADER" &&
                        member.role === "CO_LEADER" && (
                          <DropdownMenuItem
                            onClick={() => handleDemoteMember(member.userId)}
                          >
                            <UserMinus className="h-4 w-4 mr-2" />
                            Hạ xuống thành viên
                          </DropdownMenuItem>
                        )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => handleKickMember(member.userId)}
                        className="text-red-500 focus:text-red-500"
                      >
                        <Ban className="h-4 w-4 mr-2" />
                        Xóa khỏi nhóm
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            );
          })}
        </div>

        {showProfileDialog && selectedMember && (
          <ProfileDialog
            user={selectedMember}
            isOpen={showProfileDialog}
            onOpenChange={setShowProfileDialog}
            isOwnProfile={selectedMember.id === currentUser?.id}
          />
        )}
      </div>
    );
  }

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
                <span className="font-medium">Thành viên nhóm</span>
              </div>
              <ChevronDown className="h-5 w-5 text-gray-500" />
            </CollapsibleTrigger>
            <CollapsibleContent>
              <Separator />
              <div
                className="p-3 flex items-center hover:bg-gray-50 cursor-pointer"
                onClick={() => setShowMembersList(true)}
              >
                <Users className="h-5 w-5 mr-2 text-gray-500" />
                <span>{group.members?.length || 0} thành viên</span>
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
                        onClick={() => setShowMediaGallery(true)}
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

            {/* Nút xóa nhóm chỉ hiển thị cho trưởng nhóm */}
            {currentUserRole === "LEADER" && (
              <Button
                variant="ghost"
                className="w-full justify-start text-red-500 pl-2"
                onClick={() => setShowDeleteDialog(true)}
              >
                <Trash className="h-5 w-5 mr-3" />
                <span>Xóa nhóm</span>
              </Button>
            )}

            <Button
              variant="ghost"
              className="w-full justify-start text-red-500 pl-2"
              onClick={() => setShowLeaveDialog(true)}
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
          isOwnProfile={selectedMember.id === currentUser?.id}
        />
      )}

      {/* Alert Dialog xác nhận xóa nhóm */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Bạn có chắc chắn muốn xóa nhóm này?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Hành động này không thể hoàn tác. Tất cả tin nhắn và dữ liệu của
              nhóm sẽ bị xóa vĩnh viễn.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteGroup}
              disabled={isProcessing}
              className="bg-red-500 hover:bg-red-600"
            >
              {isProcessing ? "Đang xử lý..." : "Xóa nhóm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Alert Dialog xác nhận rời nhóm */}
      <AlertDialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Bạn có chắc chắn muốn rời nhóm này?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {currentUserRole === "LEADER"
                ? "Bạn là trưởng nhóm. Nếu rời nhóm, quyền trưởng nhóm sẽ được chuyển cho một thành viên khác."
                : "Bạn sẽ không thể xem tin nhắn của nhóm này nữa trừ khi được mời lại."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLeaveGroup}
              disabled={isProcessing}
              className="bg-red-500 hover:bg-red-600"
            >
              {isProcessing ? "Đang xử lý..." : "Rời nhóm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );

  // Hàm xử lý thăng cấp thành viên lên phó nhóm
  async function handlePromoteMember(memberId: string) {
    if (!group?.id) return;
    setIsProcessing(true);
    try {
      const result = await updateMemberRole(
        group.id,
        memberId,
        GroupRole.CO_LEADER,
      );
      if (result.success) {
        // Cập nhật UI hoặc reload dữ liệu nhóm
        alert("Đã thăng cấp thành viên thành phó nhóm");
      } else {
        alert(`Lỗi: ${result.error}`);
      }
    } catch (error) {
      console.error("Error promoting member:", error);
      alert("Đã xảy ra lỗi khi thăng cấp thành viên");
    } finally {
      setIsProcessing(false);
    }
  }

  // Hàm xử lý hạ cấp phó nhóm xuống thành viên thường
  async function handleDemoteMember(memberId: string) {
    if (!group?.id) return;
    setIsProcessing(true);
    try {
      const result = await updateMemberRole(
        group.id,
        memberId,
        GroupRole.MEMBER,
      );
      if (result.success) {
        // Cập nhật UI hoặc reload dữ liệu nhóm
        alert("Đã hạ cấp phó nhóm xuống thành viên thường");
      } else {
        alert(`Lỗi: ${result.error}`);
      }
    } catch (error) {
      console.error("Error demoting member:", error);
      alert("Đã xảy ra lỗi khi hạ cấp thành viên");
    } finally {
      setIsProcessing(false);
    }
  }

  // Hàm xử lý xóa thành viên khỏi nhóm
  async function handleKickMember(memberId: string) {
    if (!group?.id) return;
    if (!confirm("Bạn có chắc chắn muốn xóa thành viên này khỏi nhóm?")) return;

    setIsProcessing(true);
    try {
      const result = await removeGroupMember(group.id, memberId);
      if (result.success) {
        // Cập nhật UI hoặc reload dữ liệu nhóm
        alert("Đã xóa thành viên khỏi nhóm");
      } else {
        alert(`Lỗi: ${result.error}`);
      }
    } catch (error) {
      console.error("Error removing member:", error);
      alert("Đã xảy ra lỗi khi xóa thành viên");
    } finally {
      setIsProcessing(false);
    }
  }

  // Hàm xử lý xóa nhóm
  async function handleDeleteGroup() {
    if (!group?.id) return;
    setIsProcessing(true);
    try {
      const result = await deleteGroup(group.id);
      if (result.success) {
        // Đóng dialog và chuyển hướng về trang chat
        setShowDeleteDialog(false);

        // Đóng chat của nhóm này
        const chatStore = useChatStore.getState();

        // Xóa cache của nhóm này
        chatStore.clearChatCache("GROUP", group.id);

        // Đặt selectedGroup về null để đóng chat
        chatStore.setSelectedGroup(null);

        // Đóng dialog thông tin nhóm
        onClose();

        // Thông báo cho người dùng
        alert("Đã xóa nhóm thành công");
      } else {
        alert(`Lỗi: ${result.error}`);
      }
    } catch (error) {
      console.error("Error deleting group:", error);
      alert("Đã xảy ra lỗi khi xóa nhóm");
    } finally {
      setIsProcessing(false);
    }
  }

  // Hàm xử lý rời nhóm
  async function handleLeaveGroup() {
    if (!group?.id) return;
    setIsProcessing(true);
    try {
      const result = await leaveGroup(group.id);
      if (result.success) {
        // Đóng dialog xác nhận
        setShowLeaveDialog(false);

        // Đóng chat của nhóm này
        const chatStore = useChatStore.getState();

        // Xóa cache của nhóm này
        chatStore.clearChatCache("GROUP", group.id);

        // Đặt selectedGroup về null để đóng chat
        chatStore.setSelectedGroup(null);

        // Đóng dialog thông tin nhóm
        onClose();

        // Thông báo cho người dùng
        alert("Đã rời nhóm thành công");
      } else {
        alert(`Lỗi: ${result.error}`);
      }
    } catch (error) {
      console.error("Error leaving group:", error);
      alert("Đã xảy ra lỗi khi rời nhóm");
    } finally {
      setIsProcessing(false);
    }
  }
}
