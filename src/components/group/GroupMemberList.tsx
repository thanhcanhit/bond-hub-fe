"use client";

import { useState, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Group, User, GroupRole } from "@/types/base";
import {
  ArrowLeft,
  MoreHorizontal,
  Shield,
  UserMinus,
  Ban,
  UserPlus,
  Link as LinkIcon,
} from "lucide-react";
import AddMemberDialog from "./AddMemberDialog";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import ProfileDialog from "@/components/profile/ProfileDialog";
import { getUserDataById } from "@/actions/user.action";
import { useAuthStore } from "@/stores/authStore";
import { getRelationship } from "@/actions/friend.action";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { updateMemberRole, removeGroupMember } from "@/actions/group.action";
import { toast } from "sonner";

interface GroupMemberListProps {
  group: Group | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onBack: () => void;
}

export default function GroupMemberList({
  group,
  isOpen,
  onOpenChange,
  onBack,
}: GroupMemberListProps) {
  const [selectedMember, setSelectedMember] = useState<User | null>(null);
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [showFriendRequestForm, setShowFriendRequestForm] = useState(false);
  const [showAddMemberDialog, setShowAddMemberDialog] = useState(false);
  const [showKickDialog, setShowKickDialog] = useState(false);
  const [memberToKick, setMemberToKick] = useState<string | null>(null);
  const [memberDetails, setMemberDetails] = useState<{ [key: string]: User }>(
    {},
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [adderDetails, setAdderDetails] = useState<{ [key: string]: User }>({});
  const [relationships, setRelationships] = useState<{ [key: string]: string }>(
    {},
  );
  const [isSendingRequest] = useState<{
    [key: string]: boolean;
  }>({});

  const currentUser = useAuthStore((state) => state.user);

  // Determine current user's role in the group
  const currentUserRole =
    group?.members?.find((member) => member.userId === currentUser?.id)?.role ||
    "MEMBER";

  // Fetch member details when group changes
  useEffect(() => {
    if (group?.id && group.members) {
      const fetchMemberDetails = async () => {
        const newMemberDetails: { [key: string]: User } = {};
        const newAdderDetails: { [key: string]: User } = {};
        const newRelationships: { [key: string]: string } = {};

        // Get detailed information for each member
        for (const member of group.members) {
          try {
            // If member already has user info, use it
            if (member.user?.userInfo) {
              newMemberDetails[member.userId] = member.user;
            } else {
              // Otherwise fetch from API
              const result = await getUserDataById(member.userId);
              if (result.success && result.user) {
                newMemberDetails[member.userId] = result.user;
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
  }, [group?.id, group?.members, currentUser?.id]);

  // Handle member click to show profile
  const handleMemberClick = (memberId: string) => {
    const memberData = memberDetails[memberId];
    if (memberData) {
      setSelectedMember(memberData);
      setShowFriendRequestForm(false);
      setShowProfileDialog(true);
    }
  };

  // Handle send friend request
  const handleSendFriendRequest = (userId: string) => {
    const memberData = memberDetails[userId];
    if (memberData) {
      setSelectedMember(memberData);
      setShowFriendRequestForm(true);
      setShowProfileDialog(true);
    }
  };

  // Handle promote member to co-leader
  const handlePromoteMember = async (memberId: string) => {
    if (!group?.id) return;
    setIsProcessing(true);
    try {
      const result = await updateMemberRole(
        group.id,
        memberId,
        GroupRole.CO_LEADER,
      );
      if (result.success) {
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
  };

  // Handle demote co-leader to member
  const handleDemoteMember = async (memberId: string) => {
    if (!group?.id) return;
    setIsProcessing(true);
    try {
      const result = await updateMemberRole(
        group.id,
        memberId,
        GroupRole.MEMBER,
      );
      if (result.success) {
        toast.success("Đã hạ cấp phó nhóm xuống thành viên thường");
      } else {
        toast.error(`Lỗi: ${result.error}`);
      }
    } catch (error) {
      console.error("Error demoting member:", error);
      toast.error("Đã xảy ra lỗi khi hạ cấp thành viên");
    } finally {
      setIsProcessing(false);
    }
  };

  // Open kick member dialog
  const openKickMemberDialog = (memberId: string) => {
    setMemberToKick(memberId);
    setShowKickDialog(true);
  };

  // Handle remove member from group
  const handleKickMember = async () => {
    if (!group?.id || !memberToKick) return;

    setIsProcessing(true);
    try {
      const result = await removeGroupMember(group.id, memberToKick);
      if (result.success) {
        toast.success("Đã xóa thành viên khỏi nhóm");
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
  };

  return (
    <>
      <Dialog
        open={isOpen}
        onOpenChange={(open) => {
          // Only close the dialog if no other dialogs are open
          if (!showKickDialog && !showProfileDialog && !showAddMemberDialog) {
            onOpenChange(open);
          }
        }}
      >
        <DialogContent className="sm:max-w-[425px] h-auto !p-0 mt-0 mb-16 max-h-[90vh] overflow-y-auto no-scrollbar">
          <DialogHeader className="px-4 py-2 flex flex-row items-center border-b">
            <Button
              variant="ghost"
              size="icon"
              className="mr-2 h-8 w-8"
              onClick={onBack}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <DialogTitle className="text-base font-semibold">
              Danh sách thành viên
            </DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              className="ml-auto h-8 w-8"
              onClick={() => onOpenChange(false)}
            ></Button>
          </DialogHeader>

          <div className="px-4 pb-4 border-b">
            <Button
              className="w-full flex items-center justify-center bg-gray-100 hover:bg-gray-200 text-black"
              onClick={() => setShowAddMemberDialog(true)}
            >
              <UserPlus className="h-4 w-4" />
              <span>Thêm thành viên</span>
            </Button>
          </div>

          <div className="px-4 flex justify-between items-center">
            <span className="text-sm">
              Danh sách thành viên ({group?.members?.length || 0})
            </span>
          </div>

          <ScrollArea className="flex-1">
            {group?.members?.map((member) => {
              const memberData = memberDetails[member.userId];
              const initials = memberData?.userInfo?.fullName
                ? memberData.userInfo.fullName.slice(0, 2).toUpperCase()
                : "??";

              return (
                <div
                  key={member.userId}
                  className="flex items-center px-4 py-2 hover:bg-gray-100 justify-between"
                >
                  <div
                    className="flex items-center cursor-pointer"
                    onClick={() => handleMemberClick(member.userId)}
                  >
                    <Avatar className="h-10 w-10 mr-3">
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
                        {member.role === "LEADER"
                          ? "Trưởng nhóm"
                          : member.role === "CO_LEADER"
                            ? "Phó nhóm"
                            : ""}
                      </p>
                      {member.userId !== currentUser?.id && (
                        <p className="text-xs text-gray-500">
                          Thêm bởi{" "}
                          {member.addedBy && "fullName" in member.addedBy
                            ? (
                                member.addedBy as unknown as {
                                  fullName: string;
                                }
                              ).fullName
                            : adderDetails[member.userId]?.userInfo?.fullName ||
                              "Người dùng"}
                        </p>
                      )}
                      {member.userId !== currentUser?.id &&
                        member.userId !== group?.creatorId && (
                          <p className="text-xs text-gray-500">
                            {member.joinedAt &&
                              `Tham gia ${new Date(member.joinedAt).toLocaleDateString()}`}
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

                    {/* Show dropdown menu for all members except current user */}
                    {member.userId !== currentUser?.id && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-5 w-5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
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
                                onClick={() =>
                                  openKickMemberDialog(member.userId)
                                }
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
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Profile Dialog for members */}
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

      {/* Add Member Dialog */}
      {group?.id && (
        <AddMemberDialog
          groupId={group.id}
          isOpen={showAddMemberDialog}
          onOpenChange={(open) => {
            setShowAddMemberDialog(open);
            // If the add member dialog is closed and the member list should still be open
            if (!open && isOpen) {
              // Force the member list to stay open
              setTimeout(() => onOpenChange(true), 0);
            }
          }}
        />
      )}

      {/* Kick Member Confirmation Dialog */}
      <AlertDialog
        open={showKickDialog}
        onOpenChange={(open) => {
          setShowKickDialog(open);
          // If the kick dialog is closed and the member list should still be open
          if (!open && isOpen) {
            // Force the member list to stay open
            setTimeout(() => onOpenChange(true), 0);
          }
        }}
      >
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
              onClick={handleKickMember}
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
    </>
  );
}
