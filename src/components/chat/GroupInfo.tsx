"use client";

import { useState, useEffect, ReactNode } from "react";
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
  ChevronRight,
  Trash,
  ExternalLink,
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
}

// Hàm tiện ích để lấy icon cho các trang web phổ biến
function getLinkIcon(domain: string): ReactNode {
  // Kiểm tra domain và trả về icon tương ứng
  if (domain.includes("instagram.com")) {
    return (
      <div className="bg-gradient-to-tr from-yellow-500 via-pink-500 to-purple-500 w-full h-full flex items-center justify-center">
        <svg viewBox="0 0 24 24" width="24" height="24" fill="white">
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
        </svg>
      </div>
    );
  } else if (domain.includes("tiktok.com")) {
    return (
      <div className="bg-black w-full h-full flex items-center justify-center">
        <svg viewBox="0 0 24 24" width="24" height="24" fill="white">
          <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
        </svg>
      </div>
    );
  } else if (domain.includes("facebook.com")) {
    return (
      <div className="bg-blue-600 w-full h-full flex items-center justify-center">
        <svg viewBox="0 0 24 24" width="24" height="24" fill="white">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
      </div>
    );
  } else if (domain.includes("youtube.com") || domain.includes("youtu.be")) {
    return (
      <div className="bg-red-600 w-full h-full flex items-center justify-center">
        <svg viewBox="0 0 24 24" width="24" height="24" fill="white">
          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
        </svg>
      </div>
    );
  } else if (domain.includes("lazada.vn")) {
    return (
      <div className="bg-blue-500 w-full h-full flex items-center justify-center">
        <span className="text-white font-bold text-lg">L</span>
      </div>
    );
  } else if (domain.includes("shopee.vn")) {
    return (
      <div className="bg-orange-500 w-full h-full flex items-center justify-center">
        <span className="text-white font-bold text-lg">S</span>
      </div>
    );
  } else if (domain.includes("tiki.vn")) {
    return (
      <div className="bg-blue-400 w-full h-full flex items-center justify-center">
        <span className="text-white font-bold text-lg">T</span>
      </div>
    );
  } else if (domain.includes("bataptracnghiem.com")) {
    return (
      <div className="bg-yellow-400 w-full h-full flex items-center justify-center">
        <span className="text-white font-bold text-lg">B</span>
      </div>
    );
  } else if (domain.includes("azota.vn")) {
    return (
      <div className="bg-blue-700 w-full h-full flex items-center justify-center">
        <span className="text-white font-bold text-lg">A</span>
      </div>
    );
  } else {
    // Default icon for other domains
    return <ExternalLink className="h-5 w-5 text-gray-500" />;
  }
}

// Hàm tiện ích để lấy tiêu đề cho các trang web phổ biến
function getLinkTitle(domain: string, defaultTitle: string): string {
  // Kiểm tra domain và trả về tiêu đề tương ứng
  if (domain.includes("instagram.com")) {
    return "Instagram";
  } else if (domain.includes("tiktok.com")) {
    return "TikTok Video";
  } else if (domain.includes("facebook.com")) {
    return "Facebook Link";
  } else if (domain.includes("youtube.com") || domain.includes("youtu.be")) {
    return "YouTube Video";
  } else if (domain.includes("lazada.vn")) {
    return "Lazada Product";
  } else if (domain.includes("shopee.vn")) {
    return "Shopee Product";
  } else if (domain.includes("tiki.vn")) {
    return "Tiki Product";
  } else if (domain.includes("bataptracnghiem.com")) {
    return "Thi thử trắc nghiệm";
  } else if (domain.includes("azota.vn")) {
    return "Ôn tập TTHCM";
  } else {
    // Trả về tiêu đề mặc định cho các domain khác
    return defaultTitle;
  }
}

export default function GroupInfo({ group, onClose }: GroupInfoProps) {
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
        const imageAndVideoFiles: (Media & { createdAt: Date })[] = [];
        const documentFiles: (Media & { createdAt: Date })[] = [];
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
                // Try to create a more readable title from the URL
                let title = url;
                try {
                  // Extract domain for display
                  const domain = url.replace(/^https?:\/\//, "").split("/")[0];

                  // For common websites, use better titles
                  if (domain.includes("tiktok.com")) {
                    title = "TikTok Video";
                  } else if (domain.includes("instagram.com")) {
                    title = "Instagram Post";
                  } else if (domain.includes("facebook.com")) {
                    title = "Facebook Link";
                  } else if (
                    domain.includes("youtube.com") ||
                    domain.includes("youtu.be")
                  ) {
                    title = "YouTube Video";
                  } else if (domain.includes("lazada.vn")) {
                    title = "Lazada Product";
                  } else if (domain.includes("shopee.vn")) {
                    title = "Shopee Product";
                  } else if (domain.includes("tiki.vn")) {
                    title = "Tiki Product";
                  } else {
                    // Extract path components
                    const urlObj = new URL(url);
                    const pathParts = urlObj.pathname.split("/");

                    // If there's a meaningful path, use the last part as title
                    if (
                      pathParts.length > 1 &&
                      pathParts[pathParts.length - 1]
                    ) {
                      // Replace dashes and underscores with spaces and capitalize words
                      const lastPart = pathParts[pathParts.length - 1]
                        .replace(/[-_]/g, " ")
                        .replace(/\.(html|php|asp|jsp)$/, "");

                      if (lastPart.length > 0) {
                        title =
                          lastPart.charAt(0).toUpperCase() + lastPart.slice(1);
                      }
                    }
                  }
                } catch (e) {
                  // If URL parsing fails, just use the original URL
                  console.error("Error parsing URL for title:", e);
                }

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
                    <div className="mt-2 text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-sm font-semibold w-full bg-[#e5e7eb] hover:bg-gray-300"
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
