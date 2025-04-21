"use client";

import { useEffect, useRef, useCallback } from "react";
import { useAuthStore } from "@/stores/authStore";
import { useChatStore } from "@/stores/chatStore";
import { useConversationsStore } from "@/stores/conversationsStore";
import { useGroupSocket } from "@/hooks/useGroupSocket";
import { toast } from "sonner";
import { GroupRole } from "@/types/base";

// Define types for socket events
interface AddedToGroupEventData {
  groupId: string;
  group: Record<string, unknown>; // Group data with members
  addedBy: string;
  timestamp: Date;
}

// Define types for removedFromGroup event
interface RemovedFromGroupEventData {
  groupId: string;
  groupName?: string;
  removedBy: string;
  kicked?: boolean; // True if user was kicked by admin
  left?: boolean; // True if user left voluntarily
  timestamp: Date;
}

// Define types for updateGroupList event
interface UpdateGroupListEventData {
  action: "added_to_group" | "removed_from_group" | "group_dissolved";
  groupId: string;
  addedById?: string;
  timestamp: Date;
}

// Define types for updateConversationList event
interface UpdateConversationListEventData {
  action: "group_dissolved" | "group_created" | "member_removed";
  groupId: string;
  userId?: string;
  timestamp: Date;
}

interface GroupCreatedEventData {
  groupId: string;
  createdBy: string;
  timestamp: Date;
}

interface GroupUpdatedEventData {
  groupId: string;
  updatedBy: string;
  timestamp: Date;
}

interface GroupDeletedEventData {
  groupId: string;
  deletedById: string;
  timestamp: Date;
}

// Define types for backend event names
interface GroupDissolvedEventData {
  groupId: string;
  groupName?: string;
  dissolvedBy: string;
  userId?: string; // Backend có thể gửi userId nếu gửi trực tiếp đến người dùng
  timestamp: Date;
}

type RoleChangedEventData = MemberRoleUpdatedEventData;

interface AvatarUpdatedEventData {
  groupId: string;
  updatedBy: string;
  avatarUrl?: string; // Backend sử dụng avatarUrl thay vì newAvatarUrl
  timestamp: Date;
}

interface MemberAddedEventData {
  groupId: string;
  userId: string;
  addedById: string;
  timestamp: Date;
}

interface MemberRemovedEventData {
  groupId: string;
  userId: string;
  removedById: string;
  timestamp: Date;
}

interface MemberRoleUpdatedEventData {
  groupId: string;
  userId: string;
  updatedById: string;
  newRole: GroupRole;
  timestamp: Date;
}

export default function GroupSocketHandler() {
  // Get the group socket
  const groupSocket = useGroupSocket();

  // Get current user
  const currentUser = useAuthStore((state) => state.user);

  // Get selected group and refresh function
  const { selectedGroup, refreshSelectedGroup } = useChatStore();

  // Get conversations store methods
  const { conversations, updateConversation } = useConversationsStore();

  // Track if event listeners are set up
  const eventListenersSetupRef = useRef(false);

  // Helper function to update conversation with latest group data
  const updateConversationWithLatestGroupData = useCallback(
    async (groupId: string) => {
      try {
        // Import here to avoid circular dependencies
        const { getGroupById } = await import("@/actions/group.action");
        const result = await getGroupById(groupId);

        if (result.success && result.group) {
          // Find the conversation
          const conversation = conversations.find(
            (conv) => conv.type === "GROUP" && conv.group?.id === groupId,
          );

          if (conversation) {
            // Update the conversation with the latest group data
            updateConversation(groupId, {
              group: result.group,
            });
          }
        }
      } catch (error) {
        console.error(
          `[GroupSocketHandler] Error updating conversation with latest group data for ${groupId}:`,
          error,
        );
      }
    },
    [conversations, updateConversation],
  );

  // Set up event listeners when the component mounts
  useEffect(() => {
    // Skip if socket is not available
    if (!groupSocket.socket) {
      console.log(
        "[GroupSocketHandler] Socket not available, skipping event setup",
      );
      return;
    }

    // Reset the event listeners setup ref when socket changes
    eventListenersSetupRef.current = false;

    console.log("[GroupSocketHandler] Setting up group socket event listeners");

    // Set up event listeners
    const handleGroupUpdated = (data: GroupUpdatedEventData) => {
      console.log("[GroupSocketHandler] Group updated event received:", data);

      // Check if this is the currently selected group
      if (selectedGroup && selectedGroup.id === data.groupId) {
        // Refresh the selected group data
        refreshSelectedGroup();

        // Show toast notification
        if (data.updatedBy !== currentUser?.id) {
          toast.info("Thông tin nhóm đã được cập nhật");
        }
      } else {
        // Find the group in conversations
        const groupConversation = conversations.find(
          (conv) => conv.type === "GROUP" && conv.group?.id === data.groupId,
        );

        if (groupConversation) {
          // Refresh this group's data in the conversations store
          updateConversationWithLatestGroupData(data.groupId);
        }
      }
    };

    const handleMemberAdded = (data: MemberAddedEventData) => {
      console.log("[GroupSocketHandler] Member added event received:", data);

      // Check if this is the currently selected group
      if (selectedGroup && selectedGroup.id === data.groupId) {
        // Refresh the selected group data
        refreshSelectedGroup();

        // Show toast notification if the current user didn't add the member
        if (data.addedById !== currentUser?.id) {
          toast.info("Thành viên mới đã được thêm vào nhóm");
        }
      } else {
        // Find the group in conversations
        const groupConversation = conversations.find(
          (conv) => conv.type === "GROUP" && conv.group?.id === data.groupId,
        );

        if (groupConversation) {
          // Refresh this group's data in the conversations store
          updateConversationWithLatestGroupData(data.groupId);
        }
      }
    };

    const handleMemberRemoved = (data: MemberRemovedEventData) => {
      console.log("[GroupSocketHandler] Member removed event received:", data);

      // Check if the current user was removed from the group
      if (data.userId === currentUser?.id) {
        console.log("[GroupSocketHandler] Current user was removed from group");
        toast.info(`Bạn đã bị xóa khỏi nhóm ${data.groupId}`);
        useChatStore.getState().setSelectedGroup(null);
        useChatStore.getState().clearChatCache("GROUP", data.groupId);
        useConversationsStore.getState().removeConversation(data.groupId);
      }

      // Refresh the group data in the conversations store
      updateConversationWithLatestGroupData(data.groupId);
    };

    const handleMemberRoleUpdated = (data: MemberRoleUpdatedEventData) => {
      console.log(
        "[GroupSocketHandler] Member role updated event received:",
        data,
      );

      // Check if this is the currently selected group
      if (selectedGroup && selectedGroup.id === data.groupId) {
        // Refresh the selected group data
        refreshSelectedGroup();

        // Show toast notification for role changes
        if (data.userId === currentUser?.id) {
          // Current user's role was changed
          const roleText =
            data.newRole === GroupRole.LEADER
              ? "trưởng nhóm"
              : data.newRole === GroupRole.CO_LEADER
                ? "phó nhóm"
                : "thành viên";

          toast.info(`Vai trò của bạn đã được thay đổi thành ${roleText}`);
        } else if (data.updatedById !== currentUser?.id) {
          // Someone else's role was changed by someone else
          toast.info("Vai trò thành viên trong nhóm đã được thay đổi");
        }
      } else {
        // Find the group in conversations
        const groupConversation = conversations.find(
          (conv) => conv.type === "GROUP" && conv.group?.id === data.groupId,
        );

        if (groupConversation) {
          // Refresh this group's data in the conversations store
          updateConversationWithLatestGroupData(data.groupId);
        }
      }
    };

    const handleGroupDeleted = (data: GroupDeletedEventData) => {
      console.log("[GroupSocketHandler] Group deleted event received:", data);

      // If this is the currently selected group, clear it
      if (selectedGroup && selectedGroup.id === data.groupId) {
        useChatStore.getState().setSelectedGroup(null);
      }

      // Remove the group from conversations
      useConversationsStore.getState().removeConversation(data.groupId);
    };

    // Handler for backend's groupDissolved event
    const handleGroupDissolved = (data: GroupDissolvedEventData) => {
      console.log("[GroupSocketHandler] Group dissolved event received:", data);

      // Check if the current user is in the dissolved group
      if (selectedGroup && selectedGroup.id === data.groupId) {
        console.log(
          `[GroupSocketHandler] Leaving group room: group:${data.groupId} via groupDissolved`,
        );
        groupSocket.socket?.emit("leaveGroup", { groupId: data.groupId });
        useChatStore.getState().setSelectedGroup(null);
      }

      // Remove the group from the conversations store
      useConversationsStore.getState().removeConversation(data.groupId);
    };

    const handleRoleChanged = (data: RoleChangedEventData) => {
      console.log("[GroupSocketHandler] Role changed event received:", data);

      // Check if this is the currently selected group
      if (selectedGroup && selectedGroup.id === data.groupId) {
        // Refresh the selected group data
        refreshSelectedGroup();

        // Show toast notification for role changes
        if (data.userId === currentUser?.id) {
          // Current user's role was changed
          const roleText =
            data.newRole === GroupRole.LEADER
              ? "trưởng nhóm"
              : data.newRole === GroupRole.CO_LEADER
                ? "phó nhóm"
                : "thành viên";

          toast.info(`Vai trò của bạn đã được thay đổi thành ${roleText}`);
        } else if (data.updatedById !== currentUser?.id) {
          // Someone else's role was changed by someone else
          toast.info("Vai trò thành viên trong nhóm đã được thay đổi");
        }
      } else {
        // Find the group in conversations
        const groupConversation = conversations.find(
          (conv) => conv.type === "GROUP" && conv.group?.id === data.groupId,
        );

        if (groupConversation) {
          // Refresh this group's data in the conversations store
          updateConversationWithLatestGroupData(data.groupId);
        }
      }
    };

    const handleAvatarUpdated = (data: AvatarUpdatedEventData) => {
      console.log("[GroupSocketHandler] Avatar updated event received:", data);

      // Check if this is the currently selected group
      if (selectedGroup && selectedGroup.id === data.groupId) {
        // Refresh the selected group data
        refreshSelectedGroup();

        // Show toast notification
        if (data.updatedBy !== currentUser?.id) {
          toast.info("Avatar nhóm đã được cập nhật");
        }

        // Nếu có avatarUrl, cập nhật trực tiếp để tránh phải tải lại
        if (data.avatarUrl && selectedGroup) {
          // Cập nhật trực tiếp vào store bằng cách gọi setSelectedGroup
          useChatStore.getState().setSelectedGroup({
            ...selectedGroup,
            avatarUrl: data.avatarUrl,
          });
        }
      } else {
        // Find the group in conversations
        const groupConversation = conversations.find(
          (conv) => conv.type === "GROUP" && conv.group?.id === data.groupId,
        );

        if (groupConversation) {
          // Refresh this group's data in the conversations store
          updateConversationWithLatestGroupData(data.groupId);
        }
      }
    };

    // Handler for addedToGroup event
    const handleAddedToGroup = (data: AddedToGroupEventData) => {
      console.log("[GroupSocketHandler] Added to group event received:", data);

      // This event is sent directly to the user when they are added to a group
      if (currentUser?.id) {
        console.log(
          "[GroupSocketHandler] Current user was added to a group, updating conversations",
        );

        // Đã tắt toast thông báo khi được thêm vào nhóm
        // const groupName = data.group?.name || "mới";
        // toast.success(`Bạn đã được thêm vào nhóm ${groupName}`);

        setTimeout(() => {
          useConversationsStore.getState().forceUpdate();
        }, 0);
      }
    };

    // Handler for removedFromGroup event
    const handleRemovedFromGroup = (data: RemovedFromGroupEventData) => {
      console.log(
        "[GroupSocketHandler] Removed from group event received:",
        data,
      );

      // This event is sent directly to the user when they are removed from a group
      if (!currentUser?.id) return;

      // Find the group in conversations
      const groupConversation = conversations.find(
        (conv) => conv.type === "GROUP" && conv.group?.id === data.groupId,
      );

      // Get group name from event or from local data
      const groupName =
        data.groupName || groupConversation?.group?.name || "chat";

      // Show appropriate notification based on whether user was kicked or left voluntarily
      if (data.kicked) {
        toast.info(`Bạn đã bị xóa khỏi nhóm ${groupName}`);
      } else if (data.left) {
        toast.info(`Bạn đã rời khỏi nhóm ${groupName}`);
      } else {
        toast.info(`Bạn đã không còn trong nhóm ${groupName}`);
      }

      // If this is the currently selected group, navigate away
      if (selectedGroup && selectedGroup.id === data.groupId) {
        console.log(
          `[GroupSocketHandler] Currently selected group was removed, clearing selection`,
        );
        // Clear selected group
        useChatStore.getState().setSelectedGroup(null);
      }

      // Remove the group from conversations
      useConversationsStore.getState().removeConversation(data.groupId);
    };

    // Handler for groupCreated event
    const handleGroupCreated = (data: GroupCreatedEventData) => {
      console.log("[GroupSocketHandler] Group created event received:", data);

      // If the current user created the group, we don't need to do anything
      // as the group will be added to their conversation list by the CreateGroupDialog
      if (data.createdBy === currentUser?.id) {
        console.log(
          "[GroupSocketHandler] Current user created the group, skipping",
        );
        return;
      }

      // If the current user didn't create the group, we need to check if they're a member
      // and add the group to their conversation list if they are
      if (currentUser?.id) {
        console.log(
          "[GroupSocketHandler] Checking if current user is a member of the new group",
        );
        // Import here to avoid circular dependencies
        import("@/actions/group.action").then(async ({ getGroupById }) => {
          try {
            const result = await getGroupById(data.groupId);
            if (result.success && result.group) {
              // Check if current user is a member of this group
              const isMember = result.group.members?.some(
                (member: { userId: string }) =>
                  member.userId === currentUser.id,
              );

              if (isMember) {
                console.log(
                  "[GroupSocketHandler] Current user is a member of the new group, adding to conversations",
                );

                setTimeout(() => {
                  useConversationsStore.getState().forceUpdate();
                }, 0);
              }
            }
          } catch (error) {
            console.error(
              `[GroupSocketHandler] Error checking group membership for ${data.groupId}:`,
              error,
            );
          }
        });
      }
    };

    // Handler for updateGroupList event
    const handleUpdateGroupList = (data: UpdateGroupListEventData) => {
      console.log(
        "[GroupSocketHandler] Update group list event received:",
        data,
      );

      if (data.action === "added_to_group") {
        console.log(
          "[GroupSocketHandler] User was added to a group, updating group list",
        );

        setTimeout(() => {
          useConversationsStore.getState().forceUpdate();
        }, 0);
      } else if (data.action === "removed_from_group") {
        console.log(
          "[GroupSocketHandler] User was removed from a group, updating group list",
        );

        // Find the group in conversations to get its name
        const groupConversation = conversations.find(
          (conv) => conv.type === "GROUP" && conv.group?.id === data.groupId,
        );

        // Nếu không tìm thấy nhóm trong danh sách cuộc trò chuyện, không cần xử lý
        if (!groupConversation) {
          console.log(
            `[GroupSocketHandler] Group ${data.groupId} not found in conversations, skipping`,
          );
          return;
        }

        const groupName = groupConversation?.group?.name || "chat";

        // Show notification
        toast.info(`Bạn đã bị xóa khỏi nhóm ${groupName}`);

        // If this is the currently selected group, navigate away
        if (selectedGroup && selectedGroup.id === data.groupId) {
          useChatStore.getState().setSelectedGroup(null);
        }

        // Remove the group from conversations
        useConversationsStore.getState().removeConversation(data.groupId);
      } else if (data.action === "group_dissolved") {
        console.log(
          "[GroupSocketHandler] Group was dissolved, updating group list",
        );

        // Find the group in conversations to get its name
        const groupConversation = conversations.find(
          (conv) => conv.type === "GROUP" && conv.group?.id === data.groupId,
        );

        // Nếu không tìm thấy nhóm trong danh sách cuộc trò chuyện, không cần xử lý
        if (!groupConversation) {
          console.log(
            `[GroupSocketHandler] Group ${data.groupId} not found in conversations, skipping`,
          );
          return;
        }

        const groupName = groupConversation?.group?.name || "chat";

        // Show notification
        toast.info(`Nhóm ${groupName} đã bị giải tán`);

        // If this is the currently selected group, navigate away
        if (selectedGroup && selectedGroup.id === data.groupId) {
          useChatStore.getState().setSelectedGroup(null);
        }

        // Remove the group from conversations
        useConversationsStore.getState().removeConversation(data.groupId);
      }
    };

    // Handler for updateConversationList event
    const handleUpdateConversationList = (
      data: UpdateConversationListEventData,
    ) => {
      console.log(
        "[GroupSocketHandler] Update conversation list event received:",
        data,
      );

      // Force update conversations
      setTimeout(() => {
        useConversationsStore.getState().forceUpdate();
      }, 0);

      // If this is a group dissolution, remove the group from conversations
      if (data.action === "group_dissolved") {
        // Find the group in conversations to get its name
        const groupConversation = conversations.find(
          (conv) => conv.type === "GROUP" && conv.group?.id === data.groupId,
        );

        // Nếu không tìm thấy nhóm trong danh sách cuộc trò chuyện, không cần xử lý
        if (!groupConversation) {
          console.log(
            `[GroupSocketHandler] Group ${data.groupId} not found in conversations, skipping`,
          );
          return;
        }

        const groupName = groupConversation?.group?.name || "chat";

        // Show notification
        toast.info(`Nhóm ${groupName} đã bị giải tán`);

        // If this is the currently selected group, navigate away
        if (selectedGroup && selectedGroup.id === data.groupId) {
          useChatStore.getState().setSelectedGroup(null);
        }

        // Remove the group from conversations
        useConversationsStore.getState().removeConversation(data.groupId);
      }
    };

    // Handler for forceUpdateConversations event
    const handleForceUpdateConversations = (data: any) => {
      console.log(
        "[GroupSocketHandler] Force update conversations event received:",
        data,
      );

      // Force update conversations
      setTimeout(() => {
        useConversationsStore.getState().forceUpdate();
      }, 0);

      // If this is related to a group removal, check if we need to clear selection
      if (data && data.groupId) {
        const groupId = data.groupId as string;

        // Kiểm tra xem nhóm có tồn tại trong danh sách cuộc trò chuyện không
        const groupConversation = conversations.find(
          (conv) => conv.type === "GROUP" && conv.group?.id === groupId,
        );

        // Nếu không tìm thấy nhóm, không cần xử lý
        if (!groupConversation) {
          console.log(
            `[GroupSocketHandler] Group ${groupId} not found in conversations, skipping`,
          );
          return;
        }

        if (selectedGroup && selectedGroup.id === groupId) {
          console.log(
            `[GroupSocketHandler] Clearing selected group ${groupId} via forceUpdateConversations`,
          );
          useChatStore.getState().setSelectedGroup(null);
        }

        // Clear chat messages for this group
        useChatStore.getState().clearChatCache("GROUP", groupId);

        // If this is a group removal or dissolution, remove the group from conversations
        if (
          data.action === "removed_from_group" ||
          data.action === "group_dissolved" ||
          data.action === "group_deleted"
        ) {
          console.log(
            `[GroupSocketHandler] Removing group ${groupId} from conversations via forceUpdateConversations`,
          );
          const conversationsStore = useConversationsStore.getState();
          conversationsStore.removeConversation(groupId);

          // Force UI update again after removal
          setTimeout(() => {
            conversationsStore.forceUpdate();
          }, 0);
        }
      }
    };

    // Register event handlers - both our custom events and backend events
    groupSocket.socket?.on("addedToGroup", handleAddedToGroup);
    groupSocket.socket?.on("removedFromGroup", handleRemovedFromGroup);
    groupSocket.socket?.on("groupCreated", handleGroupCreated);
    groupSocket.socket?.on("groupUpdated", handleGroupUpdated);
    groupSocket.socket?.on("memberAdded", handleMemberAdded);
    groupSocket.socket?.on("memberRemoved", handleMemberRemoved);
    groupSocket.socket?.on("memberRoleUpdated", handleMemberRoleUpdated);
    groupSocket.socket?.on("groupDeleted", handleGroupDeleted);

    // Backend event names
    groupSocket.socket?.on("groupDissolved", handleGroupDissolved);
    groupSocket.socket?.on("roleChanged", handleRoleChanged);
    groupSocket.socket?.on("avatarUpdated", handleAvatarUpdated);

    // New events for group list and conversation list updates
    groupSocket.socket?.on("updateGroupList", handleUpdateGroupList);
    groupSocket.socket?.on(
      "updateConversationList",
      handleUpdateConversationList,
    );
    groupSocket.socket?.on(
      "forceUpdateConversations",
      handleForceUpdateConversations,
    );

    // Mark event listeners as set up
    eventListenersSetupRef.current = true;

    // Cleanup function
    return () => {
      if (groupSocket) {
        console.log(
          "[GroupSocketHandler] Cleaning up group socket event listeners",
        );

        // Remove event listeners
        groupSocket.socket?.off("addedToGroup", handleAddedToGroup);
        groupSocket.socket?.off("removedFromGroup", handleRemovedFromGroup);
        groupSocket.socket?.off("groupCreated", handleGroupCreated);
        groupSocket.socket?.off("groupUpdated", handleGroupUpdated);
        groupSocket.socket?.off("memberAdded", handleMemberAdded);
        groupSocket.socket?.off("memberRemoved", handleMemberRemoved);
        groupSocket.socket?.off("memberRoleUpdated", handleMemberRoleUpdated);
        groupSocket.socket?.off("groupDeleted", handleGroupDeleted);

        // Backend event names
        groupSocket.socket?.off("groupDissolved", handleGroupDissolved);
        groupSocket.socket?.off("roleChanged", handleRoleChanged);
        groupSocket.socket?.off("avatarUpdated", handleAvatarUpdated);

        // New events for group list and conversation list updates
        groupSocket.socket?.off("updateGroupList", handleUpdateGroupList);
        groupSocket.socket?.off(
          "updateConversationList",
          handleUpdateConversationList,
        );
        groupSocket.socket?.off(
          "forceUpdateConversations",
          handleForceUpdateConversations,
        );

        // Reset ref
        eventListenersSetupRef.current = false;
      }
    };
  }, [
    groupSocket,
    currentUser,
    selectedGroup,
    conversations,
    refreshSelectedGroup,
    updateConversation,
    updateConversationWithLatestGroupData,
  ]);

  // This component doesn't render anything
  return null;
}
