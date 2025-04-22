"use client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
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
import { Button } from "@/components/ui/button";
import {
  Camera,
  Copy,
  ExternalLink,
  LogOut,
  Settings,
  Share2,
  Video,
  Trash,
  Pencil,
} from "lucide-react";
import { Group, Media, User, GroupRole } from "@/types/base";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useState, useEffect } from "react";
import { useChatStore } from "@/stores/chatStore";
import { useAuthStore } from "@/stores/authStore";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  deleteGroup,
  leaveGroup,
  updateGroupAvatar,
  updateMemberRole,
} from "@/actions/group.action";
import ProfileDialog from "@/components/profile/ProfileDialog";
import GroupMemberList from "./GroupMemberList";
import AddMemberDialog from "./AddMemberDialog";
import EditGroupNameDialog from "./EditGroupNameDialog";
import { batchGetUserData } from "@/actions/user.action";

interface GroupDialogProps {
  group: Group | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  mediaFiles?: Media[];
}

export default function GroupDialog({
  group,
  isOpen,
  onOpenChange,
  mediaFiles = [],
}: GroupDialogProps) {
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [showTransferLeadershipDialog, setShowTransferLeadershipDialog] =
    useState(false);
  const [showConfirmTransferDialog, setShowConfirmTransferDialog] =
    useState(false);
  const [newLeaderId, setNewLeaderId] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedMember, setSelectedMember] = useState<User | null>(null);
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [showMemberList, setShowMemberList] = useState(false);
  const [showAddMemberDialog, setShowAddMemberDialog] = useState(false);
  const [showEditNameDialog, setShowEditNameDialog] = useState(false);
  const [memberDetails, setMemberDetails] = useState<{ [key: string]: User }>(
    {},
  );
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const router = useRouter();

  // Get current user and chat store functions
  const currentUser = useAuthStore((state) => state.user);
  const { setSelectedGroup } = useChatStore();

  // Determine current user's role in the group
  const currentUserRole =
    group?.members?.find((member) => member.userId === currentUser?.id)?.role ||
    "MEMBER";

  // Fetch member details when group changes
  useEffect(() => {
    if (group?.id && group.members) {
      const fetchMemberDetails = async () => {
        const newMemberDetails: { [key: string]: User } = {};

        try {
          // Collect all user IDs that need to be fetched
          const memberIds: string[] = [];

          // First, use any existing user data
          for (const member of group.members) {
            if (member.user?.userInfo) {
              newMemberDetails[member.userId] = member.user;
            } else {
              memberIds.push(member.userId);
            }
          }

          // Batch fetch any missing user data
          if (memberIds.length > 0) {
            console.log(`Batch fetching ${memberIds.length} member details`);
            const userResult = await batchGetUserData(memberIds);
            if (userResult.success && userResult.users) {
              userResult.users.forEach((user) => {
                newMemberDetails[user.id] = user;
              });
            }
          }
        } catch (error) {
          console.error("Error fetching member details:", error);
        }

        setMemberDetails(newMemberDetails);
      };

      fetchMemberDetails();
    }
  }, [group?.id, group?.members]);

  // Handle avatar change
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !group?.id) return;

    const file = e.target.files[0];
    setIsUploadingAvatar(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const result = await updateGroupAvatar(group.id, formData);

      if (result.success) {
        toast.success("Cập nhật ảnh đại diện nhóm thành công");
        // Refresh the group data or update the UI
        // This could be done by refreshing the page or updating the group in the store
        setTimeout(() => {
          window.location.reload();
        }, 500);
      } else {
        toast.error(result.error || "Không thể cập nhật ảnh đại diện nhóm");
      }
    } catch (error) {
      console.error("Error updating group avatar:", error);
      toast.error("Đã xảy ra lỗi khi cập nhật ảnh đại diện nhóm");
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  // Handle copy group link
  const handleCopyGroupLink = () => {
    if (!group?.id) return;

    const groupLink = `https://zalo.me/g/${group.id}`;
    navigator.clipboard.writeText(groupLink);
    toast.success("Đã sao chép liên kết nhóm");
  };

  // Hàm xử lý khi chọn thành viên để chuyển quyền trưởng nhóm
  const handleSelectNewLeader = (memberId: string) => {
    setNewLeaderId(memberId);
    setShowConfirmTransferDialog(true);
  };

  // Hàm xử lý chuyển quyền trưởng nhóm
  const executeTransferLeadership = async () => {
    if (!group?.id || !newLeaderId) return;
    setIsProcessing(true);
    try {
      // Chuyển quyền trưởng nhóm cho thành viên được chọn
      const result = await updateMemberRole(
        group.id,
        newLeaderId,
        GroupRole.LEADER,
      );

      if (result.success) {
        // Đóng các dialog
        setShowConfirmTransferDialog(false);
        setShowTransferLeadershipDialog(false);

        // Thông báo cho người dùng
        toast.success("Đã chuyển quyền trưởng nhóm thành công");

        // Tiếp tục rời nhóm
        setShowLeaveDialog(true);
      } else {
        toast.error(`Lỗi: ${result.error}`);
      }
    } catch (error) {
      console.error("Error transferring leadership:", error);
      toast.error("Đã xảy ra lỗi khi chuyển quyền trưởng nhóm");
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle leave group
  const handleLeaveGroup = async () => {
    if (!group?.id) return;
    setIsProcessing(true);
    try {
      const result = await leaveGroup(group.id);
      if (result.success) {
        // Close confirmation dialog
        setShowLeaveDialog(false);

        // Get chat store and clear cache
        const chatStore = useChatStore.getState();
        chatStore.clearChatCache("GROUP", group.id);
        chatStore.setSelectedGroup(null);

        // Close group dialog
        onOpenChange(false);

        // Notify user
        toast.success("Đã rời nhóm thành công");
      } else {
        toast.error(`Lỗi: ${result.error}`);
      }
    } catch (error) {
      console.error("Error leaving group:", error);
      toast.error("Đã xảy ra lỗi khi rời nhóm");
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle delete group
  const handleDeleteGroup = async () => {
    if (!group?.id) return;
    setIsProcessing(true);
    try {
      const result = await deleteGroup(group.id);
      if (result.success) {
        // Close confirmation dialog
        setShowDeleteDialog(false);

        // Get chat store and clear cache
        const chatStore = useChatStore.getState();
        chatStore.clearChatCache("GROUP", group.id);
        chatStore.setSelectedGroup(null);

        // Close group dialog
        onOpenChange(false);

        // Notify user
        toast.success("Đã xóa nhóm thành công");
      } else {
        toast.error(`Lỗi: ${result.error}`);
      }
    } catch (error) {
      console.error("Error deleting group:", error);
      toast.error("Đã xảy ra lỗi khi xóa nhóm");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[425px] h-auto !p-0 mt-0 mb-16 max-h-[90vh] overflow-y-auto no-scrollbar">
          <DialogHeader className="px-4 py-2 flex flex-row items-center border-b">
            <DialogTitle className="text-base font-semibold">
              Thông tin nhóm
            </DialogTitle>
            <DialogDescription className="sr-only">
              Xem và quản lý thông tin nhóm
            </DialogDescription>
            <Button
              variant="ghost"
              size="icon"
              className="ml-auto h-8 w-8"
              onClick={() => onOpenChange(false)}
            ></Button>
          </DialogHeader>

          <div className="flex flex-col gap-2 overflow-auto no-scrollbar bg-[#e5e7eb]">
            {/* Group Avatar and Name */}
            <div className="flex flex-col gap-2 items-center text-center px-4 py-2 bg-white">
              <div className="flex flex-row items-center justify-start w-full gap-4">
                <div className="relative">
                  <Avatar className="h-16 w-16 border-2">
                    <AvatarImage
                      src={group?.avatarUrl || undefined}
                      className="object-cover"
                    />
                    <AvatarFallback className="text-xl">
                      {group?.name?.slice(0, 2).toUpperCase() || "GR"}
                    </AvatarFallback>
                  </Avatar>
                  {currentUserRole === "LEADER" && (
                    <label
                      htmlFor="group-avatar-upload"
                      className="absolute bottom-0 right-0 bg-blue-500 rounded-full p-1 cursor-pointer"
                    >
                      {isUploadingAvatar ? (
                        <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <Camera className="h-4 w-4 text-white" />
                      )}
                      <input
                        id="group-avatar-upload"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleAvatarChange}
                        disabled={isUploadingAvatar}
                      />
                    </label>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-semibold">{group?.name}</h2>
                  {currentUserRole === "LEADER" && (
                    <button
                      className="text-gray-500 hover:text-blue-500 transition-colors"
                      onClick={() => setShowEditNameDialog(true)}
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
              {/* Message Button */}
              <div
                className="w-full bg-[#e5e7eb] py-2 px-4 text-center cursor-pointer hover:bg-gray-200"
                onClick={() => {
                  if (group?.id) {
                    // Close the dialog
                    onOpenChange(false);

                    // Open the chat with this group
                    setSelectedGroup(group);

                    // Navigate to chat page if not already there
                    router.push("/dashboard/chat");
                  }
                }}
              >
                <span className="font-semibold">Nhắn tin</span>
              </div>
            </div>

            {/* Members Section */}
            <div className="p-4 bg-white border-b border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold">
                  Thành viên ({group?.members?.length || 0})
                </h3>
              </div>
              <div className="flex justify-center gap-2">
                {group?.members?.slice(0, 4).map((member) => {
                  const memberData = memberDetails[member.userId];
                  const initials = memberData?.userInfo?.fullName
                    ? memberData.userInfo.fullName.slice(0, 2).toUpperCase()
                    : "U";
                  const displayName =
                    memberData?.userInfo?.fullName || "Thành viên";
                  const isLeader = member.role === "LEADER";
                  const isCoLeader = member.role === "CO_LEADER";

                  return (
                    <div
                      key={member.userId}
                      className="flex flex-col items-center"
                    >
                      <Avatar
                        className="h-12 w-12 mb-1 cursor-pointer"
                        onClick={() => {
                          if (memberData) {
                            setSelectedMember(memberData);
                            setShowProfileDialog(true);
                          }
                        }}
                      >
                        <AvatarImage
                          src={
                            memberData?.userInfo?.profilePictureUrl || undefined
                          }
                          className="object-cover"
                        />
                        <AvatarFallback>{initials}</AvatarFallback>
                      </Avatar>
                      <span className="text-xs font-medium truncate w-16 text-center">
                        {displayName}
                      </span>
                      {(isLeader || isCoLeader) && (
                        <span className="text-xs text-gray-500">
                          {isLeader ? "Trưởng nhóm" : "Phó nhóm"}
                        </span>
                      )}
                    </div>
                  );
                })}
                {(group?.members?.length || 0) > 4 && (
                  <div className="flex flex-col items-center">
                    <div
                      className="h-12 w-12 rounded-full bg-gray-200 flex items-center justify-center mb-1 cursor-pointer"
                      onClick={() => setShowMemberList(true)}
                    >
                      <span className="text-sm font-medium">...</span>
                    </div>
                    <span className="text-xs font-medium">Xem thêm</span>
                  </div>
                )}
              </div>
            </div>

            {/* Media Section */}
            <div className="p-4 bg-white border-b border-gray-200">
              <div className="mb-3">
                <h3 className="font-semibold">Ảnh/Video</h3>
              </div>
              {mediaFiles.length > 0 ? (
                <div className="grid grid-cols-4 gap-1">
                  {mediaFiles.slice(0, 4).map((media, index) => (
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
              ) : (
                <div className="text-center text-gray-500 py-2">
                  <p>Chưa có ảnh/video nào</p>
                </div>
              )}
            </div>

            {/* Link Section */}
            <div className="p-4 bg-white border-b border-gray-200">
              <div className="flex items-center mb-3">
                <h3 className="font-semibold">Link tham gia nhóm</h3>
              </div>
              <div className="flex items-center">
                <div className="flex items-center">
                  <div className="mr-2">
                    <ExternalLink className="h-5 w-5 text-gray-500" />
                  </div>
                  <div className="text-sm text-blue-500">
                    https://zalo.me/g/{group?.id || "lqgvcn149"}
                  </div>
                </div>
                <div className="ml-auto flex">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-full bg-gray-200"
                    onClick={handleCopyGroupLink}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-full bg-gray-200 ml-2"
                    onClick={() => {
                      if (navigator.share && group?.id) {
                        navigator
                          .share({
                            title: `Nhóm ${group.name || "chat"}`,
                            text: `Tham gia nhóm ${group.name || "chat"} trên Zalo`,
                            url: `https://zalo.me/g/${group.id}`,
                          })
                          .catch((err) => {
                            console.error("Error sharing:", err);
                          });
                      } else {
                        handleCopyGroupLink();
                        toast.info(
                          "Đã sao chép liên kết. Thiết bị của bạn không hỗ trợ chia sẻ trực tiếp.",
                        );
                      }
                    }}
                  >
                    <Share2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Group Management Buttons */}
            <div className="p-4 bg-white space-y-2">
              {/* Manage group button */}
              <div
                className="flex items-center p-2 cursor-pointer opacity-60"
                onClick={() => {
                  toast.info("Tính năng này chưa được hỗ trợ");
                }}
              >
                <Settings className="h-5 w-5 mr-3 text-gray-500" />
                <span className="text-sm">Quản lý nhóm</span>
              </div>

              {/* Leave group option - for everyone */}
              {/* Delete group option - only for leader */}
              {currentUserRole === "LEADER" && (
                <div
                  className="flex items-center p-2 cursor-pointer text-red-500"
                  onClick={() => setShowDeleteDialog(true)}
                >
                  <Trash className="h-5 w-5 mr-3" />
                  <span className="text-sm">Xóa nhóm</span>
                </div>
              )}

              {/* Nút rời nhóm hiển thị cho tất cả thành viên, trừ khi trưởng nhóm là thành viên duy nhất */}
              {!(
                currentUserRole === "LEADER" && group?.members?.length === 1
              ) && (
                <div
                  className="flex items-center p-2 cursor-pointer text-red-500"
                  onClick={() => {
                    // Nếu là trưởng nhóm, hiển thị dialog chuyển quyền trưởng nhóm
                    if (currentUserRole === "LEADER") {
                      setShowTransferLeadershipDialog(true);
                    } else {
                      setShowLeaveDialog(true);
                    }
                  }}
                >
                  <LogOut className="h-5 w-5 mr-3" />
                  <span className="text-sm">Rời nhóm</span>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Profile Dialog for members */}
      {showProfileDialog && selectedMember && (
        <ProfileDialog
          user={selectedMember}
          isOpen={showProfileDialog}
          onOpenChange={setShowProfileDialog}
          isOwnProfile={selectedMember.id === currentUser?.id}
        />
      )}

      {/* Group Member List Dialog */}
      <GroupMemberList
        group={group}
        isOpen={showMemberList}
        onOpenChange={setShowMemberList}
        onBack={() => {
          setShowMemberList(false);
        }}
      />

      {/* Add Member Dialog */}
      {group?.id && (
        <AddMemberDialog
          groupId={group.id}
          isOpen={showAddMemberDialog}
          onOpenChange={setShowAddMemberDialog}
        />
      )}

      {/* Leave Group Confirmation Dialog */}
      <AlertDialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rời nhóm</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc chắn muốn rời khỏi nhóm &quot;{group?.name}&quot;? Bạn
              sẽ không thể xem tin nhắn trong nhóm này nữa.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLeaveGroup}
              disabled={isProcessing}
              className="bg-red-500 hover:bg-red-600"
            >
              {isProcessing ? (
                <>
                  <div className="animate-spin h-4 w-4 border-2 border-white rounded-full border-t-transparent mr-2"></div>
                  Đang xử lý...
                </>
              ) : (
                "Rời nhóm"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog chuyển quyền trưởng nhóm */}
      <AlertDialog
        open={showTransferLeadershipDialog}
        onOpenChange={setShowTransferLeadershipDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Chuyển quyền trưởng nhóm</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn cần chuyển quyền trưởng nhóm cho một thành viên khác trước khi
              rời nhóm. Vui lòng chọn một thành viên để trở thành trưởng nhóm
              mới.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="max-h-[200px] overflow-y-auto my-4 border rounded-md">
            {group?.members
              ?.filter((member) => member.userId !== currentUser?.id) // Lọc ra các thành viên khác
              .map((member) => {
                const memberData = memberDetails[member.userId];
                const initials = memberData?.userInfo?.fullName
                  ? memberData.userInfo.fullName.slice(0, 2).toUpperCase()
                  : "??";

                return (
                  <div
                    key={member.userId}
                    className="flex items-center p-3 hover:bg-gray-100 cursor-pointer"
                    onClick={() => handleSelectNewLeader(member.userId)}
                  >
                    <Avatar className="h-8 w-8 mr-3">
                      <AvatarImage
                        src={
                          memberData?.userInfo?.profilePictureUrl || undefined
                        }
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
                        {member.role === "CO_LEADER"
                          ? "Phó nhóm"
                          : "Thành viên"}
                      </p>
                    </div>
                  </div>
                );
              })}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>Hủy</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog xác nhận chuyển quyền trưởng nhóm */}
      <AlertDialog
        open={showConfirmTransferDialog}
        onOpenChange={setShowConfirmTransferDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Xác nhận chuyển quyền trưởng nhóm
            </AlertDialogTitle>
            <AlertDialogDescription>
              {newLeaderId && memberDetails[newLeaderId] ? (
                <>
                  Bạn có chắc chắn muốn chuyển quyền trưởng nhóm cho{" "}
                  <strong>
                    {memberDetails[newLeaderId]?.userInfo?.fullName ||
                      "Thành viên này"}
                  </strong>
                  ?
                  <br />
                  Sau khi chuyển quyền, bạn sẽ trở thành thành viên thường trong
                  nhóm.
                </>
              ) : (
                "Bạn có chắc chắn muốn chuyển quyền trưởng nhóm cho thành viên này?"
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={isProcessing}
              onClick={() => {
                setShowConfirmTransferDialog(false);
                setNewLeaderId(null);
              }}
            >
              Hủy
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={executeTransferLeadership}
              disabled={isProcessing}
              className="bg-blue-500 hover:bg-blue-600"
            >
              {isProcessing ? (
                <>
                  <div className="animate-spin h-4 w-4 border-2 border-white rounded-full border-t-transparent mr-2"></div>
                  Đang xử lý...
                </>
              ) : (
                "Xác nhận"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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

      {/* Delete Group Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa nhóm</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc chắn muốn xóa nhóm &quot;{group?.name}&quot;? Hành
              động này không thể hoàn tác và tất cả tin nhắn trong nhóm sẽ bị
              xóa.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteGroup}
              disabled={isProcessing}
              className="bg-red-500 hover:bg-red-600"
            >
              {isProcessing ? (
                <>
                  <div className="animate-spin h-4 w-4 border-2 border-white rounded-full border-t-transparent mr-2"></div>
                  Đang xử lý...
                </>
              ) : (
                "Xóa nhóm"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
