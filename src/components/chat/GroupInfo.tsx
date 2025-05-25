"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Group, User, UserInfo, Media, GroupRole } from "@/types/base";
import { getLinkIcon, getLinkTitle } from "@/utils/link-utils";
import MediaViewer from "@/components/media/MediaViewer";
import GroupInfoSocketHandler from "../group/GroupInfoSocketHandler";
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
  RefreshCw,
  QrCode,
} from "lucide-react";
import GroupDialog from "../group/GroupDialog";
import MediaGalleryView from "./MediaGalleryView";
import { ScrollArea } from "@/components/ui/scroll-area";
import EditGroupNameDialog from "../group/EditGroupNameDialog";
import ProfileDialog from "@/components/profile/ProfileDialog";
import { getUserDataById, batchGetUserData } from "@/actions/user.action";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useChatStore, type ChatState } from "@/stores/chatStore";
import { useAuthStore } from "@/stores/authStore";
import { useConversationsStore } from "@/stores/conversationsStore";

import { toast } from "sonner";
import {
  getRelationship,
  batchGetRelationships,
} from "@/actions/friend.action";
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
  getGroupById,
} from "@/actions/group.action";
import AddMemberDialog from "../group/AddMemberDialog";
import GroupQRCodeDialog from "../GroupQRCodeDialog";

interface GroupInfoProps {
  group: Group | null;
  onClose: () => void;
  isOverlay?: boolean;
}

export default function GroupInfo({
  group: initialGroup,
  onClose,
  isOverlay = false,
}: GroupInfoProps) {
  // Lấy selectedGroup trực tiếp từ store để đảm bảo luôn có dữ liệu mới nhất
  const selectedGroup = useChatStore((state) => state.selectedGroup);

  // Sử dụng state để lưu trữ dữ liệu nhóm hiện tại
  // Ưu tiên sử dụng selectedGroup từ store, nếu không có thì dùng initialGroup
  const [group, setGroup] = useState<Group | null>(
    selectedGroup || initialGroup,
  );

  // Cập nhật group state khi selectedGroup hoặc initialGroup thay đổi
  useEffect(() => {
    // Thêm throttle để tránh cập nhật quá thường xuyên
    if (!window._lastGroupInfoStateUpdateTime) {
      window._lastGroupInfoStateUpdateTime = {};
    }

    const groupId = selectedGroup?.id || initialGroup?.id;
    if (!groupId) return;

    const now = Date.now();
    const lastUpdateTime = window._lastGroupInfoStateUpdateTime[groupId] || 0;
    const timeSinceLastUpdate = now - lastUpdateTime;

    // Nếu đã cập nhật trong vòng 1 giây, bỏ qua
    if (timeSinceLastUpdate < 1000) {
      console.log(
        `[GroupInfo] Skipping state update, last update was ${timeSinceLastUpdate}ms ago`,
      );
      return;
    }

    // Cập nhật thời gian cập nhật cuối cùng
    window._lastGroupInfoStateUpdateTime[groupId] = now;

    // Ưu tiên sử dụng selectedGroup từ store
    if (selectedGroup) {
      console.log("[GroupInfo] Updating group from selectedGroup in store");
      console.log(
        "[GroupInfo] Members count:",
        selectedGroup.members?.length || 0,
      );
      setGroup(selectedGroup);
    } else if (initialGroup) {
      console.log("[GroupInfo] Updating group from initialGroup prop");
      console.log(
        "[GroupInfo] Members count:",
        initialGroup.members?.length || 0,
      );
      setGroup(initialGroup);
    }
  }, [selectedGroup, initialGroup]);
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

  // Reset media gallery and viewer when group changes
  useEffect(() => {
    setShowMediaGallery(false);
    setShowMediaViewer(false);
  }, [group?.id]);
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
  const [showTransferLeadershipDialog, setShowTransferLeadershipDialog] =
    useState(false);
  const [showConfirmTransferDialog, setShowConfirmTransferDialog] =
    useState(false);
  const [newLeaderId, setNewLeaderId] = useState<string | null>(null);
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
  const [showGroupQRDialog, setShowGroupQRDialog] = useState(false);

  const messages = useChatStore((state) => state.messages);
  const currentUser = useAuthStore((state) => state.user);
  // const groupSocket = useGroupSocket();
  // Removed forceUpdate state as it was causing infinite loops

  // Hàm cập nhật danh sách thành viên (sử dụng useCallback để tránh tạo hàm mới mỗi khi render)
  const updateMembersList = useCallback(
    async (forceRefresh = false) => {
      const groupId = group?.id || selectedGroup?.id || initialGroup?.id;
      if (!groupId) return false;

      // Thêm throttle để tránh gọi API quá thường xuyên
      if (!window._lastGroupInfoApiCallTime) {
        window._lastGroupInfoApiCallTime = {};
      }

      const now = Date.now();
      const lastCallTime = window._lastGroupInfoApiCallTime[groupId] || 0;
      const timeSinceLastCall = now - lastCallTime;

      // Nếu đã gọi API trong vòng 2 giây và không phải là force refresh, bỏ qua
      if (timeSinceLastCall < 2000 && !forceRefresh) {
        console.log(
          `[GroupInfo] Skipping API call, last call was ${timeSinceLastCall}ms ago`,
        );
        return true;
      }

      // Cập nhật thời gian gọi API
      window._lastGroupInfoApiCallTime[groupId] = now;

      console.log(
        "[GroupInfo] Updating members list for group",
        groupId,
        "forceRefresh:",
        forceRefresh,
      );

      // Check if we have a valid cache for this group
      const chatStore = useChatStore.getState() as ChatState & {
        setShouldFetchGroupData?: (shouldFetch: boolean) => void;
        clearGroupCache?: (groupId: string) => void;
      };
      const cachedData = chatStore.groupCache
        ? chatStore.groupCache[groupId]
        : undefined;
      const currentTime = new Date();
      const isCacheValid =
        cachedData &&
        !forceRefresh && // Always refresh if forceRefresh is true
        currentTime.getTime() - cachedData.lastFetched.getTime() < 30 * 1000; // 30 seconds cache

      if (isCacheValid) {
        console.log(`[GroupInfo] Using cached group data for ${groupId}`);

        // Update the group state with cached data
        setGroup(cachedData.group);

        // Don't update forceUpdate here to prevent infinite loops
        return true;
      }

      try {
        // Lấy dữ liệu nhóm mới trực tiếp từ API để đảm bảo dữ liệu mới nhất
        console.log("[GroupInfo] Fetching fresh group data from API");
        const result = await getGroupById(groupId);

        if (result.success && result.group) {
          console.log(
            "[GroupInfo] Successfully fetched fresh group data from API",
          );
          console.log(
            "[GroupInfo] Members count:",
            result.group.members?.length || 0,
          );
          console.log(
            "[GroupInfo] Current members count:",
            group?.members?.length || 0,
          );

          // Kiểm tra xem số lượng thành viên có thay đổi không
          const membersChanged =
            group?.members?.length !== result.group.members?.length;
          console.log("[GroupInfo] Members changed:", membersChanged);

          // Cập nhật group state với dữ liệu mới từ API
          setGroup(result.group);

          // Cập nhật selectedGroup trong store
          chatStore.setSelectedGroup(result.group);

          // Update the cache
          if (chatStore.groupCache) {
            // Fallback for direct cache manipulation
            chatStore.groupCache[groupId] = {
              group: result.group,
              lastFetched: new Date(),
            };
          }

          // Cập nhật conversations store để đảm bảo UI được cập nhật đồng bộ
          useConversationsStore.getState().updateConversation(groupId, {
            group: result.group,
          });

          // Nếu số lượng thành viên thay đổi, hiển thị thông báo
          if (membersChanged && !forceRefresh) {
            if (
              (group?.members?.length || 0) <
              (result.group.members?.length || 0)
            ) {
              toast.info("Thành viên mới đã được thêm vào nhóm");
            } else if (
              (group?.members?.length || 0) >
              (result.group.members?.length || 0)
            ) {
              toast.info("Một thành viên đã bị xóa khỏi nhóm");
            }
          }

          return true;
        }
      } catch (error) {
        console.error("[GroupInfo] Error fetching group data:", error);
      }

      // Nếu không thể lấy dữ liệu từ API, thử dùng dữ liệu từ store
      const storeSelectedGroup = chatStore.selectedGroup;
      if (storeSelectedGroup && storeSelectedGroup.id === groupId) {
        console.log("[GroupInfo] Falling back to store data");
        setGroup(storeSelectedGroup);
        // Don't update forceUpdate here to prevent infinite loops
        return true;
      }

      return false;
    },
    [group?.id, group?.members?.length, selectedGroup?.id, initialGroup?.id],
  );

  // Hàm làm mới dữ liệu nhóm
  const handleRefreshGroup = async () => {
    toast.info("Đang làm mới dữ liệu nhóm...");

    try {
      // Force refresh by passing true to updateMembersList
      const success = await updateMembersList(true);

      if (success) {
        toast.success("Làm mới dữ liệu nhóm thành công");
        return;
      }

      // Nếu không thể cập nhật qua updateMembersList, thử sử dụng refreshSelectedGroup
      console.log("[GroupInfo] Trying refreshSelectedGroup as fallback");

      // Clear the cache to force a refresh
      const groupId = group?.id || selectedGroup?.id || initialGroup?.id;
      if (groupId) {
        const chatStore = useChatStore.getState();
        // Clear the cache entry for this group
        if (chatStore.groupCache && chatStore.groupCache[groupId]) {
          delete chatStore.groupCache[groupId];
        }
      }

      await useChatStore.getState().refreshSelectedGroup();

      // Kiểm tra xem selectedGroup đã được cập nhật chưa
      const updatedSelectedGroup = useChatStore.getState().selectedGroup;

      if (updatedSelectedGroup && updatedSelectedGroup.id === groupId) {
        console.log("[GroupInfo] Successfully refreshed group data via store");
        console.log(
          "[GroupInfo] New members count:",
          updatedSelectedGroup.members?.length || 0,
        );

        // Cập nhật group state
        setGroup(updatedSelectedGroup);

        // No need to update forceUpdate to prevent infinite loops

        // Cập nhật conversations store để đảm bảo UI được cập nhật đồng bộ
        if (groupId && updatedSelectedGroup) {
          useConversationsStore.getState().updateConversation(groupId, {
            group: updatedSelectedGroup,
          });

          // No need to force update conversations here
        }

        toast.success("Làm mới dữ liệu nhóm thành công");
        return;
      }

      // Nếu không thể lấy dữ liệu từ API, thử dùng triggerGroupsReload
      if (typeof window !== "undefined" && window.triggerGroupsReload) {
        console.log("[GroupInfo] Triggering global group reload event");
        window.triggerGroupsReload();
        // No need to update forceUpdate to prevent infinite loops
      } else {
        toast.error("Không thể làm mới dữ liệu nhóm");
      }
    } catch (error) {
      console.error("Error refreshing group data:", error);
      toast.error("Không thể làm mới dữ liệu nhóm");
    }
  };

  // Socket event listeners for real-time updates
  // Đã tắt useEffect này để tránh render liên tục
  // useEffect(() => {
  //   if (!groupSocket || !initialGroup?.id) return;

  //   const handleGroupUpdated = async (data: { groupId?: string }) => {
  //     console.log("[GroupInfo] Group updated event received, refreshing data", data);

  //     // Kiểm tra xem sự kiện có liên quan đến nhóm hiện tại không
  //     const currentGroupId = group?.id || selectedGroup?.id || initialGroup?.id;

  //     if (!data?.groupId || data.groupId === currentGroupId) {
  //       console.log("[GroupInfo] Event is for current group, updating members list");

  //       // Sử dụng hàm updateMembersList để cập nhật danh sách thành viên
  //       const success = await updateMembersList();

  //       if (!success) {
  //         console.error("[GroupInfo] Failed to update members list after group updated");

  //         // Nếu không thể cập nhật qua updateMembersList, thử sử dụng refreshSelectedGroup
  //         try {
  //           console.log("[GroupInfo] Trying refreshSelectedGroup as fallback");
  //           await useChatStore.getState().refreshSelectedGroup();

  //           // Cập nhật UI
  //           setForceUpdate(prev => prev + 1);
  //         } catch (error) {
  //           console.error("[GroupInfo] Error refreshing group data after group updated:", error);
  //         }
  //       }
  //     }
  //   };

  //   const handleMemberAdded = async (data: { groupId?: string; userId?: string; addedById?: string }) => {
  //     console.log("[GroupInfo] Member added event received, refreshing data", data);

  //     // Kiểm tra xem sự kiện có liên quan đến nhóm hiện tại không
  //     const currentGroupId = group?.id || selectedGroup?.id || initialGroup?.id;

  //     if (data.groupId === currentGroupId) {
  //       console.log("[GroupInfo] Event is for current group, updating members list");

  //       // Sử dụng hàm updateMembersList để cập nhật danh sách thành viên
  //       const success = await updateMembersList();

  //       if (!success) {
  //         console.error("[GroupInfo] Failed to update members list after member added");

  //         // Nếu không thể cập nhật qua updateMembersList, thử sử dụng refreshSelectedGroup
  //         try {
  //           console.log("[GroupInfo] Trying refreshSelectedGroup as fallback");
  //           await useChatStore.getState().refreshSelectedGroup();

  //           // Cập nhật UI
  //           setForceUpdate(prev => prev + 1);
  //         } catch (error) {
  //           console.error("[GroupInfo] Error refreshing group data after member added:", error);
  //         }
  //       }
  //     }
  //   };

  //   const handleMemberRemoved = async (data: { groupId?: string; userId?: string; removedById?: string }) => {
  //     console.log("[GroupInfo] Member removed event received, refreshing data", data);

  //     // Kiểm tra xem sự kiện có liên quan đến nhóm hiện tại không
  //     const currentGroupId = group?.id || selectedGroup?.id || initialGroup?.id;

  //     if (data.groupId === currentGroupId) {
  //       console.log("[GroupInfo] Event is for current group, updating members list");

  //       // Sử dụng hàm updateMembersList để cập nhật danh sách thành viên
  //       const success = await updateMembersList();

  //       if (!success) {
  //         console.error("[GroupInfo] Failed to update members list after member removed");

  //         // Nếu không thể cập nhật qua updateMembersList, thử sử dụng refreshSelectedGroup
  //         try {
  //           console.log("[GroupInfo] Trying refreshSelectedGroup as fallback");
  //           await useChatStore.getState().refreshSelectedGroup();

  //           // Cập nhật UI
  //           setForceUpdate(prev => prev + 1);
  //         } catch (error) {
  //           console.error("[GroupInfo] Error refreshing group data after member removed:", error);

  //           // Nếu vẫn không có dữ liệu mới, cập nhật trực tiếp danh sách thành viên
  //           if (group && group.members && data.userId) {
  //             console.log("[GroupInfo] Manually updating members list in UI as last resort");
  //             console.log("[GroupInfo] Current members count:", group.members.length);

  //             try {
  //               // Tạo bản sao của group và cập nhật danh sách thành viên
  //               const updatedGroup = {...group};
  //               updatedGroup.members = [...group.members].filter(member => member.userId !== data.userId);

  //               console.log("[GroupInfo] Updated members count:", updatedGroup.members.length);

  //               // Cập nhật group state
  //               setGroup(updatedGroup);

  //               // Cập nhật selectedGroup trong store để đảm bảo đồng bộ
  //               useChatStore.getState().setSelectedGroup(updatedGroup);

  //               // Cập nhật UI
  //               setForceUpdate(prev => prev + 1);
  //             } catch (manualError) {
  //               console.error("[GroupInfo] Error manually updating members list:", manualError);
  //             }
  //           }
  //         }
  //       }
  //     }
  //   };

  //   const handleRoleChanged = async (data: { groupId?: string }) => {
  //     console.log("[GroupInfo] Role changed event received, refreshing data", data);

  //     // Kiểm tra xem sự kiện có liên quan đến nhóm hiện tại không
  //     const currentGroupId = group?.id || selectedGroup?.id || initialGroup?.id;

  //     if (!data?.groupId || data.groupId === currentGroupId) {
  //       console.log("[GroupInfo] Event is for current group, updating members list");

  //       // Sử dụng hàm updateMembersList để cập nhật danh sách thành viên
  //       const success = await updateMembersList();

  //       if (!success) {
  //         console.error("[GroupInfo] Failed to update members list after role changed");

  //         // Nếu không thể cập nhật qua updateMembersList, thử sử dụng refreshSelectedGroup
  //         try {
  //           console.log("[GroupInfo] Trying refreshSelectedGroup as fallback");
  //           await useChatStore.getState().refreshSelectedGroup();

  //           // Cập nhật UI
  //           setForceUpdate(prev => prev + 1);
  //         } catch (error) {
  //           console.error("[GroupInfo] Error refreshing group data after role changed:", error);
  //         }
  //       }
  //     }
  //   };

  //   // Register event listeners
  //   groupSocket.on("groupUpdated", handleGroupUpdated);
  //   groupSocket.on("memberAdded", handleMemberAdded);
  //   groupSocket.on("memberRemoved", handleMemberRemoved);
  //   groupSocket.on("roleChanged", handleRoleChanged);
  //   groupSocket.on("memberRoleUpdated", handleRoleChanged); // Legacy event

  //   // Cleanup on unmount
  //   return () => {
  //     groupSocket.off("groupUpdated", handleGroupUpdated);
  //     groupSocket.off("memberAdded", handleMemberAdded);
  //     groupSocket.off("memberRemoved", handleMemberRemoved);
  //     groupSocket.off("roleChanged", handleRoleChanged);
  //     groupSocket.off("memberRoleUpdated", handleRoleChanged);
  //   };
  // }, [groupSocket, initialGroup?.id, group, selectedGroup?.id, updateMembersList]);

  // Lắng nghe sự kiện reload từ window.triggerGroupsReload
  // Đã tắt useEffect này để tránh render liên tục
  // useEffect(() => {
  //   // Tạo một hàm xử lý sự kiện reload
  //   const handleReload = async () => {
  //     console.log("[GroupInfo] Received reload event from window.triggerGroupsReload");
  //     await updateMembersList();
  //   };

  //   // Đăng ký sự kiện reload
  //   if (typeof window !== "undefined") {
  //     // Tạo một custom event listener cho triggerGroupsReload
  //     const customEventName = "groupDataUpdated";

  //     // Lưu trữ hàm gốc
  //     const originalTriggerGroupsReload = window.triggerGroupsReload;

  //     // Ghi đè hàm triggerGroupsReload để thêm xử lý sự kiện
  //     window.triggerGroupsReload = () => {
  //       // Gọi hàm gốc nếu có
  //       if (originalTriggerGroupsReload) {
  //         originalTriggerGroupsReload();
  //       }

  //       // Dispatch custom event
  //       window.dispatchEvent(new CustomEvent(customEventName));
  //     };

  //     // Thêm event listener cho custom event
  //     window.addEventListener(customEventName, handleReload);

  //     // Thử gọi ngay lập tức để cập nhật dữ liệu ban đầu
  //     setTimeout(() => {
  //       handleReload();
  //     }, 1000);

  //     // Cleanup
  //     return () => {
  //       // Khôi phục hàm gốc
  //       window.triggerGroupsReload = originalTriggerGroupsReload;
  //       // Remove event listener
  //       window.removeEventListener(customEventName, handleReload);
  //     };
  //   }
  // }, [initialGroup?.id, updateMembersList]);

  // Tự động cập nhật danh sách thành viên định kỳ
  // Đã tắt useEffect này để tránh render liên tục
  // useEffect(() => {
  //   if (!initialGroup?.id) return;
  //
  //   console.log("[GroupInfo] Setting up auto-refresh interval");
  //
  //   // Cập nhật mỗi 30 giây
  //   const intervalId = setInterval(async () => {
  //     console.log("[GroupInfo] Auto-refreshing members list");
  //     await updateMembersList(true);
  //   }, 30000);
  //
  //   // Cleanup
  //   return () => {
  //     console.log("[GroupInfo] Clearing auto-refresh interval");
  //     clearInterval(intervalId);
  //   };
  // }, [initialGroup?.id, updateMembersList]);

  // Sử dụng cách tiếp cận giống với ChatHeader để lấy thông tin nhóm từ conversationsStore
  // Lấy danh sách cuộc trò chuyện từ conversationsStore
  const conversations = useConversationsStore((state) => state.conversations);

  // Tìm thông tin nhóm từ conversationsStore
  const groupConversation = useMemo(() => {
    if (!initialGroup?.id) return null;
    return conversations.find(
      (conv) => conv.type === "GROUP" && conv.group?.id === initialGroup.id,
    );
  }, [conversations, initialGroup?.id]);

  // Tính toán số lượng thành viên từ conversationsStore
  const memberCount = useMemo(() => {
    // Ưu tiên sử dụng thông tin từ conversationsStore
    if (groupConversation?.group?.memberUsers) {
      return groupConversation.group.memberUsers.length;
    }
    // Nếu không có, sử dụng thông tin từ group state
    return group?.members?.length || 0;
  }, [groupConversation?.group?.memberUsers, group?.members]);

  // Remove the effect that was causing the infinite loop
  // We don't need to call setForceUpdate when memberCount changes
  // as memberCount is already derived from group and groupConversation

  // Lấy thông tin chi tiết của các thành viên và vai trò của người dùng hiện tại
  useEffect(() => {
    if (group?.id && group.members) {
      const fetchMemberDetails = async () => {
        const newMemberDetails: {
          [key: string]: User & { userInfo: UserInfo };
        } = {};
        const newAdderDetails: { [key: string]: User } = {};
        const newRelationships: { [key: string]: string } = {};

        try {
          // Collect all user IDs that need to be fetched
          const memberIds: string[] = [];
          const adderIds: string[] = [];
          const relationshipIds: string[] = [];

          // Prepare lists of IDs to fetch
          for (const member of group.members) {
            // Check if we need to fetch user data
            if (!member.user?.userInfo) {
              memberIds.push(member.userId);
            } else {
              // If we already have the data, store it
              newMemberDetails[member.userId] = member.user as User & {
                userInfo: UserInfo;
              };
            }

            // Check if we need to fetch adder data
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
            } else if (
              member.addedById &&
              member.addedById !== currentUser?.id &&
              !member.addedBy
            ) {
              adderIds.push(member.addedById);
            } else if (member.addedBy && "userInfo" in member.addedBy) {
              newAdderDetails[member.userId] = member.addedBy as User;
            }

            // Check if we need to fetch relationship data
            if (member.userId !== currentUser?.id) {
              relationshipIds.push(member.userId);
            }

            // Set current user role
            if (currentUser && member.userId === currentUser.id) {
              setCurrentUserRole(member.role);
            }
          }

          // Batch fetch user data
          if (memberIds.length > 0) {
            console.log(`Batch fetching ${memberIds.length} member details`);
            const userResult = await batchGetUserData(memberIds);
            if (userResult.success && userResult.users) {
              userResult.users.forEach((user) => {
                newMemberDetails[user.id] = user as User & {
                  userInfo: UserInfo;
                };
              });
            }
          }

          // Batch fetch adder data
          if (adderIds.length > 0) {
            console.log(`Batch fetching ${adderIds.length} adder details`);
            const adderResult = await batchGetUserData(adderIds);
            if (adderResult.success && adderResult.users) {
              // Match adders to members
              for (const member of group.members) {
                if (member.addedById) {
                  const adder = adderResult.users.find(
                    (u) => u.id === member.addedById,
                  );
                  if (adder) {
                    newAdderDetails[member.userId] = adder;
                  }
                }
              }
            }
          }

          // Batch fetch relationship data
          if (relationshipIds.length > 0) {
            console.log(
              `Batch fetching ${relationshipIds.length} relationships`,
            );
            const accessToken =
              useAuthStore.getState().accessToken || undefined;
            const relationshipResult = await batchGetRelationships(
              relationshipIds,
              accessToken,
            );

            if (
              relationshipResult.success &&
              relationshipResult.relationships
            ) {
              // Process relationships
              Object.entries(relationshipResult.relationships).forEach(
                ([userId, data]) => {
                  // Normalize relationship status
                  const status = data.status || "NONE";

                  // Standardize relationship values
                  if (status === "ACCEPTED" || status === "FRIEND") {
                    newRelationships[userId] = "ACCEPTED";
                  } else if (status === "PENDING_SENT") {
                    newRelationships[userId] = "PENDING_SENT";
                  } else if (status === "PENDING_RECEIVED") {
                    newRelationships[userId] = "PENDING_RECEIVED";
                  } else {
                    newRelationships[userId] = status;
                  }

                  console.log(
                    `Normalized relationship with ${userId}:`,
                    newRelationships[userId],
                  );
                },
              );
            }
          }

          // Set default relationship status for any members without data
          for (const member of group.members) {
            if (
              member.userId !== currentUser?.id &&
              !newRelationships[member.userId]
            ) {
              newRelationships[member.userId] = "NONE";
            }
          }
        } catch (error) {
          console.error("Error fetching member details:", error);
        }

        // Update state with all the data we collected
        setMemberDetails(newMemberDetails);
        setAdderDetails(newAdderDetails);
        setRelationships(newRelationships);
      };

      fetchMemberDetails();
    }
  }, [group?.id, group?.members, currentUser]); // Removed forceUpdate from dependencies

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
  }, [group?.id, messages]); // Removed forceUpdate from dependencies

  // Kiểm tra nếu không có dữ liệu nhóm
  useEffect(() => {
    if (!initialGroup && !group) {
      console.log("[GroupInfo] No group data available");
      // Đóng GroupInfo nếu không có dữ liệu nhóm
      if (onClose) {
        onClose();
      }
    }
  }, [initialGroup, group, onClose]);

  if (!group) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center p-4">
          <div className="animate-spin h-8 w-8 border-2 border-blue-500 rounded-full border-t-transparent mx-auto mb-4"></div>
          <p>Đang tải thông tin nhóm...</p>
        </div>
      </div>
    );
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
          <span className="text-sm">Danh sách thành viên ({memberCount})</span>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRefreshGroup}
            title="Làm mới danh sách thành viên"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Ưu tiên sử dụng memberUsers từ conversationsStore nếu có */}
          {groupConversation?.group?.memberUsers
            ? // Hiển thị danh sách thành viên từ conversationsStore
              groupConversation.group.memberUsers.map((member) => {
                const initials = member.fullName
                  ? member.fullName.slice(0, 2).toUpperCase()
                  : "??";

                return (
                  <div
                    key={`${member.id}`}
                    className="flex items-center p-4 hover:bg-gray-100 justify-between"
                  >
                    <div
                      className="flex items-center cursor-pointer"
                      onClick={() => handleMemberClick(member.id)}
                    >
                      <Avatar className="h-10 w-10 mr-3">
                        <AvatarImage
                          src={member.profilePictureUrl || undefined}
                          className="object-cover"
                        />
                        <AvatarFallback className="bg-gray-200 text-gray-600">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">
                          {member.fullName || "Thành viên"}
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
                    <div className="flex items-center">
                      {/* Show pending status */}
                      {member.id !== currentUser?.id &&
                        relationships[member.id] === "PENDING_SENT" && (
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
                      {member.id !== currentUser?.id && (
                        <DropdownMenu
                          open={openDropdownMemberId === member.id}
                          onOpenChange={(open) => {
                            if (open) {
                              setOpenDropdownMemberId(member.id);
                            } else if (openDropdownMemberId === member.id) {
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
                            onEscapeKeyDown={() =>
                              setOpenDropdownMemberId(null)
                            }
                          >
                            {/* Add friend option if not already friends */}
                            {relationships[member.id] === "NONE" && (
                              <DropdownMenuItem
                                onClick={() =>
                                  handleSendFriendRequest(member.id)
                                }
                                disabled={isSendingRequest[member.id]}
                              >
                                {isSendingRequest[member.id] ? (
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
                                        handlePromoteMember(member.id)
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
                                        handleDemoteMember(member.id)
                                      }
                                    >
                                      <UserMinus className="h-4 w-4 mr-2" />
                                      Hạ xuống thành viên
                                    </DropdownMenuItem>
                                  )}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => handleKickMember(member.id)}
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
              })
            : // Fallback sử dụng group.members nếu không có dữ liệu từ conversationsStore
              group.members?.map((member) => {
                // Key bao gồm forceUpdate để đảm bảo danh sách được cập nhật khi có thay đổi
                const memberData = memberDetails[member.userId];
                const initials = memberData?.userInfo?.fullName
                  ? memberData.userInfo.fullName.slice(0, 2).toUpperCase()
                  : "??";

                return (
                  <div
                    key={`${member.userId}`}
                    className="flex items-center p-4 hover:bg-gray-100 justify-between"
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
                            onEscapeKeyDown={() =>
                              setOpenDropdownMemberId(null)
                            }
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
                                  onClick={() =>
                                    handleKickMember(member.userId)
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
      {/* Socket handler for real-time updates */}
      {group && (
        <GroupInfoSocketHandler
          groupId={group.id}
          onGroupUpdated={updateMembersList}
        />
      )}
      <div className="p-4 flex items-center justify-between border-b">
        <h2 className="font-semibold">Thông tin nhóm</h2>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full"
            onClick={handleRefreshGroup}
            title="Làm mới dữ liệu nhóm"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={`${isOverlay ? "bg-gray-100 hover:bg-gray-200" : "rounded-full"}`}
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
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
                <span className="text-xs text-gray-500 ml-2">
                  ({memberCount})
                </span>
              </div>
              <ChevronDown className="h-5 w-5 text-gray-500" />
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div
                className="p-3 flex items-center hover:bg-gray-50 cursor-pointer"
                onClick={() => setShowMembersList(true)}
              >
                <Users className="h-5 w-5 mr-2 text-gray-500" />
                <span className="text-sm">{memberCount} thành viên</span>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Mã QR */}
          <Collapsible defaultOpen className="overflow-hidden bg-white">
            <CollapsibleTrigger className="flex items-center justify-between w-full p-3 hover:bg-gray-50">
              <div className="flex items-center">
                <span className="font-semibold">Mã QR</span>
              </div>
              <ChevronDown className="h-5 w-5 text-gray-500" />
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div
                className="p-3 flex items-center hover:bg-gray-50 cursor-pointer"
                onClick={() => setShowGroupQRDialog(true)}
              >
                <QrCode className="h-5 w-5 mr-2 text-gray-500" />
                <span className="text-sm">Mã QR nhóm</span>
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
                <div className="px-3 pt-2 pb-1">
                  <div className="grid grid-cols-4 gap-1">
                    {mediaFiles.slice(0, 8).map((media, index) => (
                      <div
                        key={index}
                        className="aspect-square relative overflow-hidden border border-gray-200 rounded-md cursor-pointer"
                        onClick={() => {
                          setSelectedMediaIndex(index);
                          setShowMediaViewer(true);
                        }}
                        title={media.fileName || "Xem ảnh/video"}
                      >
                        {media.metadata?.extension?.match(/mp4|webm|mov/i) ||
                        media.type === "VIDEO" ? (
                          <div className="w-full h-full relative">
                            <video
                              className="w-full h-full object-cover"
                              src={media.url}
                              muted
                              preload="metadata"
                            />
                            <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                              <Video className="h-5 w-5 text-white" />
                            </div>
                          </div>
                        ) : (
                          <div
                            className="w-full h-full bg-cover bg-center"
                            style={{ backgroundImage: `url(${media.url})` }}
                          ></div>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="mt-2 px-2">
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
                      className="flex items-center py-2 px-3 hover:bg-gray-200 cursor-pointer group"
                      onClick={() => window.open(doc.url, "_blank")}
                      title={doc.fileName} // Add tooltip for full filename
                    >
                      <div className="bg-blue-100 p-2 rounded-md mr-2 flex-shrink-0">
                        <FileImage className="h-4 w-4 text-blue-500" />
                      </div>
                      <div className="flex-1 min-w-0 mr-1">
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-sm truncate max-w-[160px]">
                            {doc.fileName}
                          </p>
                          <p className="text-xs text-gray-500 flex-shrink-0 ml-1">
                            {doc.metadata?.sizeFormatted ||
                              `${Math.round((doc.metadata?.size || 0) / 1024)} KB`}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
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
                        className="flex items-center py-2 px-3 hover:bg-gray-200 cursor-pointer group"
                        onClick={() =>
                          window.open(link.url, "_blank", "noopener,noreferrer")
                        }
                        title={link.title} // Add tooltip for full title
                      >
                        <div className="w-8 h-8 rounded-md mr-2 flex items-center justify-center overflow-hidden flex-shrink-0">
                          {getLinkIcon(domain)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="font-medium text-sm truncate max-w-[160px]">
                              {getLinkTitle(
                                domain,
                                link.title.length > 30
                                  ? link.title.substring(0, 30) + "..."
                                  : link.title,
                              )}
                            </p>
                            <p className="text-xs text-gray-500 flex-shrink-0 ml-1">
                              {formattedDate}
                            </p>
                          </div>
                          <p className="text-xs text-blue-500 truncate max-w-[180px]">
                            {domain}
                          </p>
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

            {/* Nút giải tán nhóm chỉ hiển thị cho trưởng nhóm */}
            {currentUserRole === "LEADER" && (
              <Button
                variant="ghost"
                className="w-full justify-start text-red-500 pl-2"
                onClick={() => setShowDeleteDialog(true)}
              >
                <Trash className="h-5 w-5 mr-3" />
                <span>Giải tán nhóm</span>
              </Button>
            )}

            {/* Nút rời nhóm hiển thị cho tất cả thành viên, trừ khi trưởng nhóm là thành viên duy nhất */}
            {!(currentUserRole === "LEADER" && group.members?.length === 1) && (
              <Button
                variant="ghost"
                className="w-full justify-start text-red-500 pl-2"
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
                <span>Rời nhóm</span>
              </Button>
            )}
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
              Bạn sẽ không thể xem tin nhắn của nhóm này nữa trừ khi được mời
              lại.
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
            {group.members
              ?.filter((member) => member.userId !== currentUser?.id) // Lọc ra các thành viên khác
              .map((member) => {
                const memberData = memberDetails[member.userId];
                const initials = memberData?.userInfo?.fullName
                  ? memberData.userInfo.fullName.slice(0, 2).toUpperCase()
                  : "??";

                return (
                  <div
                    key={`transfer-${member.userId}`}
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

      {/* Group QR Code Dialog */}
      {group && (
        <GroupQRCodeDialog
          isOpen={showGroupQRDialog}
          onClose={() => setShowGroupQRDialog(false)}
          groupId={group.id}
          groupName={group.name}
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

        // Force UI update by updating the group state
        if (group.members) {
          setGroup({ ...group, members: [...group.members] });
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

        // Force UI update by updating the group state
        if (group.members) {
          setGroup({ ...group, members: [...group.members] });
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

        // Cập nhật danh sách thành viên trong state để UI hiển thị đúng
        if (group.members) {
          const updatedMembers = group.members.filter(
            (member) => member.userId !== selectedMemberId,
          );
          group.members = updatedMembers;
        }

        // Force UI update by updating the group state
        if (group.members) {
          setGroup({ ...group, members: [...group.members] });
        }

        toast.success("Đã xóa thành viên khỏi nhóm");
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

        // Xóa nhóm khỏi danh sách cuộc trò chuyện
        const conversationsStore = useConversationsStore.getState();
        conversationsStore.removeConversation(group.id);

        // Đóng dialog thông tin nhóm
        onClose();

        // Thông báo cho người dùng
        toast.success("Đã giải tán nhóm thành công");
      } else {
        toast.error(`Lỗi: ${result.error}`);
      }
    } catch (error) {
      console.error("Error deleting group:", error);
      toast.error("Đã xảy ra lỗi khi giải tán nhóm");
    } finally {
      setIsProcessing(false);
    }
  }

  // Hàm xử lý khi chọn thành viên để chuyển quyền trưởng nhóm
  function handleSelectNewLeader(memberId: string) {
    setNewLeaderId(memberId);
    setShowConfirmTransferDialog(true);
  }

  // Hàm xử lý chuyển quyền trưởng nhóm
  async function executeTransferLeadership() {
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

        // Cập nhật vai trò trong state để UI hiển thị đúng
        if (group.members && currentUser) {
          const updatedMembers = group.members.map((member) => {
            if (member.userId === newLeaderId) {
              return { ...member, role: GroupRole.LEADER };
            }
            if (member.userId === currentUser.id) {
              return { ...member, role: GroupRole.MEMBER };
            }
            return member;
          });
          group.members = updatedMembers;

          // Cập nhật vai trò của người dùng hiện tại
          setCurrentUserRole(GroupRole.MEMBER);
        }

        // Force UI update by updating the group state
        if (group.members) {
          setGroup({ ...group, members: [...group.members] });
        }

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

        // Xóa nhóm khỏi danh sách cuộc trò chuyện
        const conversationsStore = useConversationsStore.getState();
        conversationsStore.removeConversation(group.id);

        // Đóng dialog thông tin nhóm
        onClose();

        // Thông báo cho người dùng
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
  }
}
