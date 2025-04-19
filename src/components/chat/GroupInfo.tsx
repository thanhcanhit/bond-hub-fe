"use client";

import { useState, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Group, User, UserInfo, Media, GroupRole } from "@/types/base";
import { getLinkIcon, getLinkTitle } from "@/utils/link-utils";
import MediaViewer from "@/components/media/MediaViewer";
import {
  X,
  Users,
  UserPlus,
  Settings,
  LogOut,
  Bell,
  Pin,
  FileImage,
  ChevronRight,
  Trash,
  Video,
  ChevronDown,
  ArrowLeft,
  MoreHorizontal,
  UserMinus,
  Shield,
  Ban,
  Link as LinkIcon,
  Pencil,
} from "lucide-react";
import GroupDialog from "../group/GroupDialog";
import MediaGalleryView from "./MediaGalleryView";
import { ScrollArea } from "@/components/ui/scroll-area";
import EditGroupNameDialog from "../group/EditGroupNameDialog";
import ProfileDialog from "@/components/profile/ProfileDialog";
import { getUserDataById } from "@/actions/user.action";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useChatStore } from "@/stores/chatStore";
import { useAuthStore } from "@/stores/authStore";
import { toast } from "sonner";
import { getRelationship } from "@/actions/friend.action";
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
import AddMemberDialog from "../group/AddMemberDialog";

interface GroupInfoProps {
  group: Group | null;
  onClose: () => void;
  isOverlay?: boolean;
}

export default function GroupInfo({
  group,
  onClose,
  isOverlay = false,
}: GroupInfoProps) {
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
  const [showMembersList, setShowMembersList] = useState(false);
  const [memberDetails, setMemberDetails] = useState<{
    [key: string]: User & { userInfo: UserInfo };
  }>({});
  const [adderDetails, setAdderDetails] = useState<{ [key: string]: User }>({});
  const [relationships, setRelationships] = useState<{ [key: string]: string }>(
    {},
  );
  const [isSendingRequest] = useState<{ [key: string]: boolean }>({});
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [showAddMemberDialog, setShowAddMemberDialog] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState<GroupRole | null>(
    null,
  );
  const [showGroupDialog, setShowGroupDialog] = useState(false);
  const [showKickDialog, setShowKickDialog] = useState(false);
  const [showPromoteDialog, setShowPromoteDialog] = useState(false);
  const [showDemoteDialog, setShowDemoteDialog] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [selectedMember, setSelectedMember] = useState<User | null>(null);
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [showFriendRequestForm, setShowFriendRequestForm] = useState(false);
  const [openDropdownMemberId, setOpenDropdownMemberId] = useState<
    string | null
  >(null);
  const [showEditNameDialog, setShowEditNameDialog] = useState(false);
  const [activeGalleryTab, setActiveGalleryTab] = useState<
    "media" | "files" | "links"
  >("media");

  const messages = useChatStore((state) => state.messages);
  const currentUser = useAuthStore((state) => state.user);

  // Lấy thông tin chi tiết của các thành viên và vai trò của người dùng hiện tại
  useEffect(() => {
    if (group?.id && group.members) {
      const fetchMemberDetails = async () => {
        const newMemberDetails: {
          [key: string]: User & { userInfo: UserInfo };
        } = {};
        const newAdderDetails: { [key: string]: User } = {};
        const newRelationships: { [key: string]: string } = {};

        // Lấy thông tin chi tiết của từng thành viên
        for (const member of group.members) {
          try {
            // Kiểm tra xem đã có thông tin chi tiết chưa
            if (member.user?.userInfo) {
              newMemberDetails[member.userId] = member.user as User & {
                userInfo: UserInfo;
              };
            } else {
              // Nếu chưa có, gọi API để lấy
              const result = await getUserDataById(member.userId);
              if (result.success && result.user) {
                newMemberDetails[member.userId] = result.user as User & {
                  userInfo: UserInfo;
                };
              }
            }

            // Store information about who added this member
            // If addedBy is directly available in the API response as an object with id and fullName
            if (
              member.addedBy &&
              typeof member.addedBy === "object" &&
              "id" in member.addedBy &&
              "fullName" in member.addedBy
            ) {
              // Create a simple User object with the addedBy information
              const adderInfo = member.addedBy as unknown as {
                id: string;
                fullName: string;
              };
              newAdderDetails[member.userId] = {
                id: adderInfo.id,
                userInfo: {
                  id: adderInfo.id,
                  fullName: adderInfo.fullName,
                  blockStrangers: false,
                  createdAt: new Date(),
                  updatedAt: new Date(),
                  userAuth: { id: adderInfo.id } as User,
                },
              } as unknown as User;
            }
            // Fallback to the old method if needed
            else if (member.addedById && member.addedById !== currentUser?.id) {
              if (member.addedBy && "userInfo" in member.addedBy) {
                newAdderDetails[member.userId] = member.addedBy as User;
              } else {
                const result = await getUserDataById(member.addedById);
                if (result.success && result.user) {
                  newAdderDetails[member.userId] = result.user;
                }
              }
            }

            // Check relationship with this member if it's not the current user
            if (member.userId !== currentUser?.id) {
              try {
                // Lấy accessToken từ authStore để tránh lỗi 401
                const accessToken =
                  useAuthStore.getState().accessToken || undefined;
                const result = await getRelationship(
                  member.userId,
                  accessToken,
                );
                console.log(`Relationship with ${member.userId}:`, result.data);
                if (result.success && result.data) {
                  // API có thể trả về các giá trị khác nhau như "ACCEPTED", "FRIEND", v.v.
                  // Chuẩn hóa các giá trị để đảm bảo tính nhất quán
                  const status = result.data.status || "NONE";

                  // Nếu đã là bạn bè (ACCEPTED hoặc FRIEND), đặt thành "ACCEPTED"
                  if (status === "ACCEPTED" || status === "FRIEND") {
                    newRelationships[member.userId] = "ACCEPTED";
                  }
                  // Nếu đã gửi lời mời kết bạn, đặt thành "PENDING_SENT"
                  else if (status === "PENDING_SENT") {
                    newRelationships[member.userId] = "PENDING_SENT";
                  }
                  // Nếu đã nhận lời mời kết bạn, đặt thành "PENDING_RECEIVED"
                  else if (status === "PENDING_RECEIVED") {
                    newRelationships[member.userId] = "PENDING_RECEIVED";
                  }
                  // Các trường hợp khác, giữ nguyên giá trị
                  else {
                    newRelationships[member.userId] = status;
                  }

                  console.log(
                    `Normalized relationship with ${member.userId}:`,
                    newRelationships[member.userId],
                  );
                } else {
                  newRelationships[member.userId] = "NONE";
                }
              } catch (error) {
                console.error(
                  `Error checking relationship with member ${member.userId}:`,
                  error,
                );
                newRelationships[member.userId] = "NONE";
              }
            }

            // Kiểm tra vai trò của người dùng hiện tại
            if (currentUser && member.userId === currentUser.id) {
              setCurrentUserRole(member.role);
            }
          } catch (error) {
            console.error(
              `Error fetching details for member ${member.userId}:`,
              error,
            );
          }
        }

        setMemberDetails(newMemberDetails);
        setAdderDetails(newAdderDetails);
        setRelationships(newRelationships);
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
                  sender: message.sender,
                  senderId: message.senderId,
                });
              } else {
                documentFiles.push({
                  ...media,
                  createdAt: new Date(message.createdAt),
                  sender: message.sender,
                  senderId: message.senderId,
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
        documents={documents}
        links={links}
        initialTab={activeGalleryTab}
        onClose={() => setShowMediaGallery(false)}
      />
    );
  }

  // Handle send friend request
  const handleSendFriendRequest = (userId: string) => {
    const memberData = memberDetails[userId];
    if (memberData) {
      setSelectedMember(memberData);
      setShowFriendRequestForm(true);
      setShowProfileDialog(true);
      setOpenDropdownMemberId(null); // Close dropdown after action
    }
  };

  if (showMembersList) {
    return (
      <div
        className={`h-full flex flex-col bg-white ${!isOverlay ? "border-l" : ""}`}
      >
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
          <Button
            className="w-full flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-black"
            onClick={() => {
              setShowMembersList(false);
              setShowAddMemberDialog(true);
            }}
          >
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
                    {/* Hiển thị thông tin người thêm */}
                    {member.userId !== currentUser?.id && (
                      <p className="text-xs text-gray-500">
                        {member.addedBy && "fullName" in member.addedBy
                          ? `Thêm bởi ${(member.addedBy as unknown as { fullName: string }).fullName}`
                          : adderDetails[member.userId]?.userInfo?.fullName
                            ? `Thêm bởi ${adderDetails[member.userId]?.userInfo?.fullName}`
                            : ""}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center">
                  {/* Show pending status */}
                  {member.userId !== currentUser?.id &&
                    relationships[member.userId] === "PENDING_SENT" && (
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled
                        title="Đã gửi lời mời kết bạn"
                      >
                        <LinkIcon className="h-4 w-4 text-gray-400" />
                      </Button>
                    )}

                  {/* Hiển thị menu tùy chọn cho thành viên (không hiển thị cho chính mình) */}
                  {member.userId !== currentUser?.id && (
                    <DropdownMenu
                      open={openDropdownMemberId === member.userId}
                      onOpenChange={(open) => {
                        if (open) {
                          setOpenDropdownMemberId(member.userId);
                        } else if (openDropdownMemberId === member.userId) {
                          setOpenDropdownMemberId(null);
                        }
                      }}
                    >
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-5 w-5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="end"
                        onEscapeKeyDown={() => setOpenDropdownMemberId(null)}
                      >
                        {/* Add friend option if not already friends */}
                        {relationships[member.userId] === "NONE" && (
                          <DropdownMenuItem
                            onClick={() =>
                              handleSendFriendRequest(member.userId)
                            }
                            disabled={isSendingRequest[member.userId]}
                          >
                            {isSendingRequest[member.userId] ? (
                              <>
                                <div className="h-4 w-4 mr-2 rounded-full border-2 border-gray-600 border-t-transparent animate-spin"></div>
                                Đang gửi...
                              </>
                            ) : (
                              <>
                                <UserPlus className="h-4 w-4 mr-2 text-blue-500" />
                                Kết bạn
                              </>
                            )}
                          </DropdownMenuItem>
                        )}

                        {/* Leader/Co-leader management options */}
                        {(currentUserRole === "LEADER" ||
                          (currentUserRole === "CO_LEADER" &&
                            member.role === "MEMBER")) && (
                          <>
                            {currentUserRole === "LEADER" &&
                              member.role === "MEMBER" && (
                                <DropdownMenuItem
                                  onClick={() =>
                                    handlePromoteMember(member.userId)
                                  }
                                >
                                  <Shield className="h-4 w-4 mr-2" />
                                  Thăng phó nhóm
                                </DropdownMenuItem>
                              )}
                            {currentUserRole === "LEADER" &&
                              member.role === "CO_LEADER" && (
                                <DropdownMenuItem
                                  onClick={() =>
                                    handleDemoteMember(member.userId)
                                  }
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
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {showProfileDialog && selectedMember && (
          <ProfileDialog
            user={selectedMember}
            isOpen={showProfileDialog}
            onOpenChange={(open) => {
              setShowProfileDialog(open);
              if (!open) {
                setSelectedMember(null);
                setShowFriendRequestForm(false);
              }
            }}
            isOwnProfile={selectedMember.id === currentUser?.id}
            initialShowFriendRequestForm={showFriendRequestForm}
          />
        )}

        {/* Promote Member Confirmation Dialog */}
        <AlertDialog
          open={showPromoteDialog}
          onOpenChange={setShowPromoteDialog}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Thăng cấp thành viên</AlertDialogTitle>
              <AlertDialogDescription>
                Bạn có chắc chắn muốn thăng cấp thành viên này lên phó nhóm? Họ
                sẽ có quyền quản lý nhóm.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isProcessing}>Hủy</AlertDialogCancel>
              <AlertDialogAction
                onClick={executePromoteMember}
                disabled={isProcessing}
                className="bg-blue-500 hover:bg-blue-600"
              >
                {isProcessing ? (
                  <>
                    <div className="animate-spin h-4 w-4 border-2 border-white rounded-full border-t-transparent mr-2"></div>
                    Đang xử lý...
                  </>
                ) : (
                  "Thăng cấp"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Demote Member Confirmation Dialog */}
        <AlertDialog open={showDemoteDialog} onOpenChange={setShowDemoteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Hạ cấp thành viên</AlertDialogTitle>
              <AlertDialogDescription>
                Bạn có chắc chắn muốn hạ cấp phó nhóm này xuống thành viên
                thường? Họ sẽ mất quyền quản lý nhóm.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isProcessing}>Hủy</AlertDialogCancel>
              <AlertDialogAction
                onClick={executeDemoteMember}
                disabled={isProcessing}
                className="bg-blue-500 hover:bg-blue-600"
              >
                {isProcessing ? (
                  <>
                    <div className="animate-spin h-4 w-4 border-2 border-white rounded-full border-t-transparent mr-2"></div>
                    Đang xử lý...
                  </>
                ) : (
                  "Hạ cấp"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Kick Member Confirmation Dialog */}
        <AlertDialog open={showKickDialog} onOpenChange={setShowKickDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Xóa thành viên</AlertDialogTitle>
              <AlertDialogDescription>
                Bạn có chắc chắn muốn xóa thành viên này khỏi nhóm? Họ sẽ không
                thể xem tin nhắn trong nhóm này nữa.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isProcessing}>Hủy</AlertDialogCancel>
              <AlertDialogAction
                onClick={executeKickMember}
                disabled={isProcessing}
                className="bg-red-500 hover:bg-red-600"
              >
                {isProcessing ? (
                  <>
                    <div className="animate-spin h-4 w-4 border-2 border-white rounded-full border-t-transparent mr-2"></div>
                    Đang xử lý...
                  </>
                ) : (
                  "Xóa thành viên"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  return (
    <div
      className={`h-full flex flex-col bg-white ${!isOverlay ? "border-l" : ""}`}
    >
      <div className="p-4 flex items-center justify-between border-b">
        <h2 className="font-semibold">Thông tin nhóm</h2>
        <Button
          variant="ghost"
          size="icon"
          className={`${isOverlay ? "bg-gray-100 hover:bg-gray-200" : "rounded-full"}`}
          onClick={onClose}
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-2 bg-[#ebecf0]">
          {/* Thông tin nhóm */}
          <div className="flex flex-col items-center text-center bg-white p-2">
            <Avatar
              className="h-20 w-20 mb-3 cursor-pointer"
              onClick={() => setShowGroupDialog(true)}
            >
              <AvatarImage
                src={group.avatarUrl || undefined}
                className="object-cover"
              />
              <AvatarFallback className="text-xl">
                {group.name?.slice(0, 2).toUpperCase() || "GR"}
              </AvatarFallback>
            </Avatar>
            <div className="flex items-center justify-center gap-2">
              <h2 className="text-lg font-semibold">{group.name}</h2>
              {currentUserRole === "LEADER" && (
                <button
                  className="text-gray-500 hover:text-blue-500 transition-colors"
                  onClick={() => setShowEditNameDialog(true)}
                >
                  <Pencil className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Các chức năng chính */}
            <div className="grid grid-cols-4 gap-4 w-full m-2">
              <div className="flex flex-col items-center">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 rounded-full bg-blue-50 text-blue-500 mb-1 opacity-60"
                  onClick={() => toast.info("Tính năng này chưa được hỗ trợ")}
                >
                  <Bell className="h-6 w-6" />
                </Button>
                <span className="text-xs">Bật thông báo</span>
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
                  onClick={() => {
                    setShowAddMemberDialog(true);
                  }}
                >
                  <UserPlus className="h-6 w-6" />
                </Button>
                <span className="text-xs">Thêm thành viên</span>
              </div>

              <div className="flex flex-col items-center">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 rounded-full bg-blue-50 text-blue-500 mb-1 opacity-60"
                  onClick={() => toast.info("Tính năng này chưa được hỗ trợ")}
                >
                  <Settings className="h-6 w-6" />
                </Button>
                <span className="text-xs">Quản lý nhóm</span>
              </div>
            </div>
          </div>

          {/* Thành viên nhóm */}
          <Collapsible defaultOpen className="overflow-hidden bg-white">
            <CollapsibleTrigger className="flex items-center justify-between w-full p-3 hover:bg-gray-50">
              <div className="flex items-center">
                <span className="font-semibold">Thành viên nhóm</span>
              </div>
              <ChevronDown className="h-5 w-5 text-gray-500" />
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div
                className="p-3 flex items-center hover:bg-gray-50 cursor-pointer"
                onClick={() => setShowMembersList(true)}
              >
                <Users className="h-5 w-5 mr-2 text-gray-500" />
                <span className="text-sm">
                  {group.members?.length || 0} thành viên
                </span>
              </div>
            </CollapsibleContent>
          </Collapsible>

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
                        className="text-sm font-semibold w-full bg-[#e5e7eb] hover:bg-gray-300"
                        onClick={() => {
                          setActiveGalleryTab("media");
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

          {/* Cài đặt nhóm */}
          <div className="space-y-1 bg-white p-2">
            <Button
              variant="ghost"
              className="w-full justify-start text-red-500 pl-2 opacity-60"
              onClick={() => toast.info("Tính năng này chưa được hỗ trợ")}
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
      {showAddMemberDialog && group && (
        <AddMemberDialog
          isOpen={showAddMemberDialog}
          onOpenChange={setShowAddMemberDialog}
          groupId={group.id}
        />
      )}

      {/* Group Dialog */}
      {showGroupDialog && group && (
        <GroupDialog
          group={group}
          isOpen={showGroupDialog}
          onOpenChange={setShowGroupDialog}
          mediaFiles={mediaFiles}
        />
      )}

      {/* Edit Group Name Dialog */}
      {group && (
        <EditGroupNameDialog
          group={group}
          isOpen={showEditNameDialog}
          onOpenChange={setShowEditNameDialog}
          onBack={() => setShowEditNameDialog(false)}
          onSuccess={(updatedGroup) => {
            // Update the group in the store
            const chatStore = useChatStore.getState();
            if (chatStore.selectedGroup?.id === updatedGroup.id) {
              chatStore.setSelectedGroup(updatedGroup);
            }

            // Refresh the page after a short delay to ensure all components are updated
            setTimeout(() => {
              window.location.reload();
            }, 500);
          }}
        />
      )}

      {/* Media Viewer */}
      {showMediaViewer && mediaFiles.length > 0 && (
        <MediaViewer
          isOpen={showMediaViewer}
          onClose={() => setShowMediaViewer(false)}
          media={mediaFiles}
          initialIndex={selectedMediaIndex}
          chatName={group.name || "Nhóm chat"}
        />
      )}

      {/* Promote Member Confirmation Dialog */}
      <AlertDialog open={showPromoteDialog} onOpenChange={setShowPromoteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Thăng cấp thành viên</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc chắn muốn thăng cấp thành viên này lên phó nhóm? Họ sẽ
              có quyền quản lý nhóm.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={executePromoteMember}
              disabled={isProcessing}
              className="bg-blue-500 hover:bg-blue-600"
            >
              {isProcessing ? (
                <>
                  <div className="animate-spin h-4 w-4 border-2 border-white rounded-full border-t-transparent mr-2"></div>
                  Đang xử lý...
                </>
              ) : (
                "Thăng cấp"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Demote Member Confirmation Dialog */}
      <AlertDialog open={showDemoteDialog} onOpenChange={setShowDemoteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hạ cấp thành viên</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc chắn muốn hạ cấp phó nhóm này xuống thành viên thường?
              Họ sẽ mất quyền quản lý nhóm.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={executeDemoteMember}
              disabled={isProcessing}
              className="bg-blue-500 hover:bg-blue-600"
            >
              {isProcessing ? (
                <>
                  <div className="animate-spin h-4 w-4 border-2 border-white rounded-full border-t-transparent mr-2"></div>
                  Đang xử lý...
                </>
              ) : (
                "Hạ cấp"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Kick Member Confirmation Dialog */}
      <AlertDialog open={showKickDialog} onOpenChange={setShowKickDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa thành viên</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc chắn muốn xóa thành viên này khỏi nhóm? Họ sẽ không
              thể xem tin nhắn trong nhóm này nữa.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={executeKickMember}
              disabled={isProcessing}
              className="bg-red-500 hover:bg-red-600"
            >
              {isProcessing ? (
                <>
                  <div className="animate-spin h-4 w-4 border-2 border-white rounded-full border-t-transparent mr-2"></div>
                  Đang xử lý...
                </>
              ) : (
                "Xóa thành viên"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );

  // Hàm xử lý thăng cấp thành viên lên phó nhóm
  async function handlePromoteMember(memberId: string) {
    setSelectedMemberId(memberId);
    setShowPromoteDialog(true);
    setOpenDropdownMemberId(null); // Close dropdown after action
  }

  // Hàm thực hiện thăng cấp thành viên
  async function executePromoteMember() {
    if (!group?.id || !selectedMemberId) return;
    setIsProcessing(true);
    try {
      const result = await updateMemberRole(
        group.id,
        selectedMemberId,
        GroupRole.CO_LEADER,
      );
      if (result.success) {
        // Cập nhật UI hoặc reload dữ liệu nhóm
        setShowPromoteDialog(false);

        // Cập nhật vai trò trong state để UI hiển thị đúng
        if (group.members) {
          const updatedMembers = group.members.map((member) => {
            if (member.userId === selectedMemberId) {
              return { ...member, role: GroupRole.CO_LEADER };
            }
            return member;
          });
          group.members = updatedMembers;
        }

        toast.success("Đã thăng cấp thành viên thành phó nhóm");
      } else {
        toast.error(`Lỗi: ${result.error}`);
      }
    } catch (error) {
      console.error("Error promoting member:", error);
      toast.error("Đã xảy ra lỗi khi thăng cấp thành viên");
    } finally {
      setIsProcessing(false);
    }
  }

  // Hàm xử lý hạ cấp phó nhóm xuống thành viên thường
  async function handleDemoteMember(memberId: string) {
    setSelectedMemberId(memberId);
    setShowDemoteDialog(true);
    setOpenDropdownMemberId(null); // Close dropdown after action
  }

  // Hàm thực hiện hạ cấp thành viên
  async function executeDemoteMember() {
    if (!group?.id || !selectedMemberId) return;
    setIsProcessing(true);
    try {
      const result = await updateMemberRole(
        group.id,
        selectedMemberId,
        GroupRole.MEMBER,
      );
      if (result.success) {
        // Cập nhật UI hoặc reload dữ liệu nhóm
        setShowDemoteDialog(false);

        // Cập nhật vai trò trong state để UI hiển thị đúng
        if (group.members) {
          const updatedMembers = group.members.map((member) => {
            if (member.userId === selectedMemberId) {
              return { ...member, role: GroupRole.MEMBER };
            }
            return member;
          });
          group.members = updatedMembers;
        }

        toast.success("Đã hạ cấp thành viên xuống thành viên thường");
      } else {
        toast.error(`Lỗi: ${result.error}`);
      }
    } catch (error) {
      console.error("Error demoting member:", error);
      toast.error("Đã xảy ra lỗi khi hạ cấp thành viên");
    } finally {
      setIsProcessing(false);
    }
  }

  // Hàm xử lý xóa thành viên khỏi nhóm
  async function handleKickMember(memberId: string) {
    setSelectedMemberId(memberId);
    setShowKickDialog(true);
    setOpenDropdownMemberId(null); // Close dropdown after action
    // Keep the member list open when showing the kick dialog
    // This ensures the alert dialog appears on top of the member list
  }

  // Hàm thực hiện xóa thành viên
  async function executeKickMember() {
    if (!group?.id || !selectedMemberId) return;
    setIsProcessing(true);
    try {
      const result = await removeGroupMember(group.id, selectedMemberId);
      if (result.success) {
        // Cập nhật UI hoặc reload dữ liệu nhóm
        setShowKickDialog(false);
      } else {
        toast.error(`Lỗi: ${result.error}`);
      }
    } catch (error) {
      console.error("Error removing member:", error);
      toast.error("Đã xảy ra lỗi khi xóa thành viên");
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
