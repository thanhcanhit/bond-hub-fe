"use client";

import { useEffect, useRef, useCallback } from "react";
import { useAuthStore } from "@/stores/authStore";
import { useChatStore } from "@/stores/chatStore";
import { useConversationsStore } from "@/stores/conversationsStore";
import { useGroupSocket } from "@/hooks/useGroupSocket";
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

// Define types for forceUpdateConversations event
interface ForceUpdateConversationsEventData {
  action?: "removed_from_group" | "group_dissolved" | "group_deleted";
  groupId?: string;
  userId?: string;
  timestamp?: Date;
  [key: string]: unknown; // Allow for additional properties
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
    async (groupId: string, groupData?: any) => {
      try {
        // Nếu đã có dữ liệu group từ socket, sử dụng nó thay vì gọi API
        if (groupData) {
          console.log(
            `[GroupSocketHandler] Using provided group data for ${groupId}`,
          );

          // Find the conversation
          const conversation = conversations.find(
            (conv) => conv.type === "GROUP" && conv.group?.id === groupId,
          );

          if (conversation) {
            // Update the conversation with the provided group data
            updateConversation(groupId, {
              group: {
                ...conversation.group,
                ...groupData,
              },
            });

            // Force update to ensure UI reflects changes immediately
            setTimeout(() => {
              useConversationsStore.getState().forceUpdate();
            }, 100);
            return;
          }
        }

        // Kiểm tra thời gian gọi API cuối cùng
        const now = Date.now();
        const lastCallTime = window._lastGroupApiCallTime?.[groupId] || 0;
        const timeSinceLastCall = now - lastCallTime;

        // Nếu đã gọi API trong vòng 10 giây, bỏ qua để giảm lag
        if (timeSinceLastCall < 10000) {
          console.log(
            `[GroupSocketHandler] Skipping API call for ${groupId}, last call was ${timeSinceLastCall}ms ago`,
          );
          return;
        }

        // Cập nhật thời gian gọi API cuối cùng
        if (!window._lastGroupApiCallTime) {
          window._lastGroupApiCallTime = {};
        }
        window._lastGroupApiCallTime[groupId] = now;

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

            // Force update to ensure UI reflects changes immediately
            setTimeout(() => {
              useConversationsStore.getState().forceUpdate();
            }, 100);
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

        // Group updated - no toast in socket handler
      } else {
        // Find the group in conversations
        const groupConversation = conversations.find(
          (conv) => conv.type === "GROUP" && conv.group?.id === data.groupId,
        );

        if (groupConversation) {
          // Refresh this group's data in the conversations store
          // Sử dụng dữ liệu từ socket nếu có
          updateConversationWithLatestGroupData(data.groupId, data);
        }
      }
    };

    const handleMemberAdded = (data: MemberAddedEventData) => {
      console.log("[GroupSocketHandler] Member added event received:", data);

      // Check if this is the currently selected group
      if (selectedGroup && selectedGroup.id === data.groupId) {
        // Refresh the selected group data
        refreshSelectedGroup();

        // Member added - no toast in socket handler
      }

      // Always update conversations store for both selected and non-selected groups
      // This ensures GroupChatHeader and other components get updated
      const groupConversation = conversations.find(
        (conv) => conv.type === "GROUP" && conv.group?.id === data.groupId,
      );

      if (groupConversation) {
        // Refresh this group's data in the conversations store
        // Sử dụng dữ liệu từ socket nếu có
        updateConversationWithLatestGroupData(data.groupId, data);
      }
    };

    const handleMemberRemoved = (data: MemberRemovedEventData) => {
      console.log("[GroupSocketHandler] Member removed event received:", data);

      // Check if the current user was removed from the group
      if (data.userId === currentUser?.id) {
        console.log("[GroupSocketHandler] Current user was removed from group");

        // Member removed - no toast in socket handler

        useChatStore.getState().setSelectedGroup(null);
        useChatStore.getState().clearChatCache("GROUP", data.groupId);
        useConversationsStore.getState().removeConversation(data.groupId);
      } else {
        // For other members being removed, update both selected group and conversations
        if (selectedGroup && selectedGroup.id === data.groupId) {
          // Refresh the selected group data
          refreshSelectedGroup();
        }

        // Always update conversations store to ensure GroupChatHeader gets updated
        updateConversationWithLatestGroupData(data.groupId, data);
      }
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

        // Role changed - no toast in socket handler
      } else {
        // Find the group in conversations
        const groupConversation = conversations.find(
          (conv) => conv.type === "GROUP" && conv.group?.id === data.groupId,
        );

        if (groupConversation) {
          // Refresh this group's data in the conversations store
          // Sử dụng dữ liệu từ socket nếu có
          updateConversationWithLatestGroupData(data.groupId, data);
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

        // Role changed - no toast in socket handler
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
        // Avatar updated - no toast in socket handler

        // Nếu có avatarUrl, cập nhật trực tiếp để tránh phải tải lại
        if (data.avatarUrl && selectedGroup) {
          // Cập nhật trực tiếp vào store bằng cách gọi setSelectedGroup
          useChatStore.getState().setSelectedGroup({
            ...selectedGroup,
            avatarUrl: data.avatarUrl,
          });

          // Cập nhật cache
          const chatStore = useChatStore.getState();
          const cachedData = chatStore.groupCache
            ? chatStore.groupCache[data.groupId]
            : undefined;
          if (cachedData) {
            chatStore.groupCache[data.groupId] = {
              ...cachedData,
              group: {
                id: cachedData.group.id,
                name: cachedData.group.name,
                creatorId: cachedData.group.creatorId,
                avatarUrl: data.avatarUrl,
                createdAt: cachedData.group.createdAt,
                members: cachedData.group.members,
                messages: cachedData.group.messages,
              },
              lastFetched: new Date(),
            };
          }
        } else {
          // Nếu không có avatarUrl, refresh để lấy dữ liệu mới
          refreshSelectedGroup();
        }
      } else {
        // Find the group in conversations
        const groupConversation = conversations.find(
          (conv) => conv.type === "GROUP" && conv.group?.id === data.groupId,
        );

        if (groupConversation?.group && data.avatarUrl) {
          // Cập nhật trực tiếp avatarUrl vào conversation
          updateConversation(data.groupId, {
            group: {
              id: groupConversation.group.id,
              name: groupConversation.group.name,
              avatarUrl: data.avatarUrl,
              createdAt: groupConversation.group.createdAt,
              memberIds: groupConversation.group.memberIds,
              memberUsers: groupConversation.group.memberUsers,
            },
          });
        } else if (groupConversation) {
          // Nếu không có avatarUrl, refresh để lấy dữ liệu mới
          updateConversationWithLatestGroupData(data.groupId, data);
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

      // Removed from group - no toast in socket handler

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

        // Removed from group - no toast in socket handler

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

        // Group dissolved - no toast in socket handler

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

        // Group dissolved - no toast in socket handler

        // If this is the currently selected group, navigate away
        if (selectedGroup && selectedGroup.id === data.groupId) {
          useChatStore.getState().setSelectedGroup(null);
        }

        // Remove the group from conversations
        useConversationsStore.getState().removeConversation(data.groupId);
      }
    };

    // Handler for forceUpdateConversations event
    const handleForceUpdateConversations = (
      data: ForceUpdateConversationsEventData,
    ) => {
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
