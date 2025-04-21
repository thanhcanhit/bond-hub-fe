"use client";

import { useEffect, useRef, useCallback } from "react";
// import { Socket } from "socket.io-client";
import { useAuthStore } from "@/stores/authStore";
import { useChatStore } from "@/stores/chatStore";
import { useConversationsStore } from "@/stores/conversationsStore";
import { useGroupSocket } from "@/hooks/useGroupSocket";
import { toast } from "sonner";
import {
  // Group,
  GroupRole,
} from "@/types/base";

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

  // Helper function to update a group conversation with latest data
  const updateConversationWithLatestGroupData = useCallback(
    async (groupId: string) => {
      try {
        // Import here to avoid circular dependencies
        const { getGroupById } = await import("@/actions/group.action");

        // Fetch latest group data
        const result = await getGroupById(groupId);

        if (result.success && result.group) {
          // Find the existing conversation
          const existingConversation = conversations.find(
            (conv) => conv.type === "GROUP" && conv.group?.id === groupId,
          );

          if (existingConversation && existingConversation.group) {
            // Update the conversation with new group data
            updateConversation(groupId, {
              group: {
                ...existingConversation.group,
                name: result.group.name,
                avatarUrl: result.group.avatarUrl,
                memberUsers: result.group.memberUsers,
              },
            });
          }
        }
      } catch (error) {
        console.error(
          `[GroupSocketHandler] Error updating group ${groupId}:`,
          error,
        );
      }
    },
    [conversations, updateConversation],
  );

  // Set up event listeners
  useEffect(() => {
    // Only set up listeners if socket exists and listeners aren't already set up
    if (!groupSocket || eventListenersSetupRef.current) return;

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

      // Check if the current user was added to the group
      if (data.userId === currentUser?.id) {
        console.log(
          "[GroupSocketHandler] Current user was added to group",
          data.groupId,
        );

        // Đã tắt toast thông báo khi được thêm vào nhóm mới
        // toast.info("Bạn đã được thêm vào một nhóm mới");

        // Load the group data and add it to conversations
        import("@/actions/group.action").then(async ({ getGroupById }) => {
          try {
            const result = await getGroupById(data.groupId);
            if (result.success && result.group) {
              // Check if the group already exists in conversations
              const existingConversation = conversations.find(
                (conv) =>
                  conv.type === "GROUP" && conv.group?.id === data.groupId,
              );

              if (!existingConversation) {
                console.log(
                  "[GroupSocketHandler] Adding new group to conversations",
                );
                // Reload conversations to get the new group
                useConversationsStore
                  .getState()
                  .loadConversations(currentUser.id);
              }
            }
          } catch (error) {
            console.error(
              `[GroupSocketHandler] Error loading group ${data.groupId}:`,
              error,
            );
          }
        });

        return;
      }

      // Check if this is the currently selected group
      if (selectedGroup && selectedGroup.id === data.groupId) {
        console.log(
          "[GroupSocketHandler] Refreshing selected group after member added",
        );

        // Refresh the selected group data immediately
        refreshSelectedGroup();

        // Trigger a global event to notify all components about the member change
        if (typeof window !== "undefined") {
          console.log(
            "[GroupSocketHandler] Triggering global group reload event",
          );
          window.triggerGroupsReload?.();
        }

        // Đã tắt toast thông báo khi thêm thành viên mới
        // if (data.addedById !== currentUser?.id) {
        //   toast.info("Thành viên mới đã được thêm vào nhóm");
        // }
      } else {
        // Find the group in conversations
        const groupConversation = conversations.find(
          (conv) => conv.type === "GROUP" && conv.group?.id === data.groupId,
        );

        if (groupConversation) {
          console.log(
            "[GroupSocketHandler] Updating conversation with latest group data after member added",
          );

          // Refresh this group's data in the conversations store immediately
          updateConversationWithLatestGroupData(data.groupId);

          // Force UI update to ensure changes are visible immediately
          setTimeout(() => {
            useConversationsStore.getState().forceUpdate();
          }, 0);

          // Trigger a global event to notify all components about the member change
          if (typeof window !== "undefined") {
            console.log(
              "[GroupSocketHandler] Triggering global group reload event",
            );
            window.triggerGroupsReload?.();
          }
        }
      }
    };

    const handleMemberRemoved = (data: MemberRemovedEventData) => {
      console.log("[GroupSocketHandler] Member removed event received:", data);

      // Check if the current user was removed
      if (data.userId === currentUser?.id) {
        // Find the group in conversations
        const groupConversation = conversations.find(
          (conv) => conv.type === "GROUP" && conv.group?.id === data.groupId,
        );

        if (groupConversation) {
          // Show toast notification
          toast.info(
            `Bạn đã bị xóa khỏi nhóm ${groupConversation.group?.name || "chat"}`,
          );

          // If this is the currently selected group, navigate away
          if (selectedGroup && selectedGroup.id === data.groupId) {
            // Clear selected group
            useChatStore.getState().setSelectedGroup(null);
          }

          // Clear chat messages for this group
          useChatStore.getState().clearChatCache("GROUP", data.groupId);

          // Remove this group from conversations
          console.log(
            `[GroupSocketHandler] Removing group ${data.groupId} from conversations because current user was removed`,
          );

          // Xóa nhóm khỏi danh sách cuộc trò chuyện
          const conversationsStore = useConversationsStore.getState();
          conversationsStore.removeConversation(data.groupId);

          // Đảm bảo UI được cập nhật ngay lập tức
          setTimeout(() => {
            // Tạo một bản sao của danh sách cuộc trò chuyện để kích hoạt re-render
            conversationsStore.forceUpdate();
          }, 0);
        }
      } else {
        // Check if this is the currently selected group
        if (selectedGroup && selectedGroup.id === data.groupId) {
          console.log(
            "[GroupSocketHandler] Refreshing selected group after member removed",
          );

          // Refresh the selected group data immediately
          refreshSelectedGroup();

          // Trigger a global event to notify all components about the member change
          if (typeof window !== "undefined") {
            console.log(
              "[GroupSocketHandler] Triggering global group reload event for member removal",
            );
            window.triggerGroupsReload?.();
          }

          // Đã tắt toast thông báo khi xóa thành viên
          // if (data.removedById !== currentUser?.id) {
          //   toast.info("Một thành viên đã bị xóa khỏi nhóm");
          // }
        } else {
          // Find the group in conversations
          const groupConversation = conversations.find(
            (conv) => conv.type === "GROUP" && conv.group?.id === data.groupId,
          );

          if (groupConversation) {
            console.log(
              "[GroupSocketHandler] Updating conversation with latest group data after member removed",
            );

            // Refresh this group's data in the conversations store immediately
            updateConversationWithLatestGroupData(data.groupId);

            // Force UI update to ensure changes are visible immediately
            setTimeout(() => {
              useConversationsStore.getState().forceUpdate();
            }, 0);

            // Trigger a global event to notify all components about the member change
            if (typeof window !== "undefined") {
              console.log(
                "[GroupSocketHandler] Triggering global group reload event for member removal",
              );
              window.triggerGroupsReload?.();
            }

            // Also reload conversations to ensure we have the latest data
            if (currentUser?.id) {
              setTimeout(() => {
                useConversationsStore
                  .getState()
                  .loadConversations(currentUser.id);
              }, 100);
            }
          }
        }
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

      // Find the group in conversations
      const groupConversation = conversations.find(
        (conv) => conv.type === "GROUP" && conv.group?.id === data.groupId,
      );

      console.log(
        `[GroupSocketHandler] Group ${data.groupId} exists in conversations: ${!!groupConversation}`,
      );

      if (groupConversation) {
        // Show toast notification
        const groupName = groupConversation.group?.name || "chat";
        toast.info(`Nhóm ${groupName} đã bị xóa`);

        // If this is the currently selected group, navigate away
        if (selectedGroup && selectedGroup.id === data.groupId) {
          console.log(
            `[GroupSocketHandler] Currently selected group was deleted, clearing selection`,
          );
          // Clear selected group
          useChatStore.getState().setSelectedGroup(null);
        }

        // Clear chat messages for this group
        useChatStore.getState().clearChatCache("GROUP", data.groupId);

        // Remove this group from conversations
        console.log(
          `[GroupSocketHandler] Removing deleted group ${data.groupId} from conversations`,
        );
        const conversationsStore = useConversationsStore.getState();
        conversationsStore.removeConversation(data.groupId);

        // Đảm bảo UI được cập nhật ngay lập tức
        setTimeout(() => {
          conversationsStore.forceUpdate();
        }, 0);

        // Also reload conversations to ensure we have the latest data
        if (currentUser?.id) {
          setTimeout(() => {
            console.log(
              `[GroupSocketHandler] Reloading conversations after group deletion`,
            );
            useConversationsStore.getState().loadConversations(currentUser.id);
          }, 100);
        }
      } else {
        // Nếu không tìm thấy nhóm trong danh sách cuộc trò chuyện, vẫn hiển thị thông báo
        toast.info(`Một nhóm đã bị xóa`);

        // Force reload conversations to ensure UI is updated
        if (currentUser?.id) {
          console.log(
            `[GroupSocketHandler] Forcing reload of conversations after group deletion (group not found in local state)`,
          );
          setTimeout(() => {
            useConversationsStore.getState().loadConversations(currentUser.id);
          }, 100); // Reduced timeout from 500ms to 100ms for faster response
        }
      }
    };

    // Handler for backend's groupDissolved event
    const handleGroupDissolved = (data: GroupDissolvedEventData) => {
      console.log("[GroupSocketHandler] Group dissolved event received:", data);

      // Backend có thể gửi trực tiếp đến người dùng cụ thể hoặc qua phòng nhóm
      // Nếu có userId và không phải là người dùng hiện tại, bỏ qua
      if (data.userId && data.userId !== currentUser?.id) {
        console.log(
          "[GroupSocketHandler] Ignoring groupDissolved event for another user",
        );
        return;
      }

      // Find the group in conversations
      const groupConversation = conversations.find(
        (conv) => conv.type === "GROUP" && conv.group?.id === data.groupId,
      );

      // Show toast notification with group name from event or from local data
      const groupName =
        data.groupName || groupConversation?.group?.name || "chat";
      toast.info(`Nhóm ${groupName} đã bị giải tán bởi quản trị viên`);

      // If this is the currently selected group, navigate away
      if (selectedGroup && selectedGroup.id === data.groupId) {
        console.log(
          `[GroupSocketHandler] Currently selected group was dissolved, clearing selection`,
        );
        // Clear selected group
        useChatStore.getState().setSelectedGroup(null);
      }

      // Clear chat messages for this group
      useChatStore.getState().clearChatCache("GROUP", data.groupId);

      // Remove this group from conversations
      console.log(
        `[GroupSocketHandler] Removing dissolved group ${data.groupId} from conversations`,
      );
      const conversationsStore = useConversationsStore.getState();
      conversationsStore.removeConversation(data.groupId);

      // Đảm bảo UI được cập nhật ngay lập tức
      setTimeout(() => {
        conversationsStore.forceUpdate();
      }, 0);

      // Also reload conversations to ensure we have the latest data
      if (currentUser?.id) {
        setTimeout(() => {
          console.log(
            `[GroupSocketHandler] Reloading conversations after group dissolution`,
          );
          useConversationsStore.getState().loadConversations(currentUser.id);
        }, 100);
      }
    };

    // Handler for backend's roleChanged event (same logic as memberRoleUpdated)
    const handleRoleChanged = (data: RoleChangedEventData) => {
      console.log("[GroupSocketHandler] Role changed event received:", data);

      // Use the same logic as memberRoleUpdated
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

    // Handler for backend's avatarUpdated event
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
          // Nếu có avatarUrl, cập nhật trực tiếp để tránh phải tải lại
          if (data.avatarUrl && groupConversation.group) {
            // Cập nhật trực tiếp vào store
            updateConversation(data.groupId, {
              group: {
                ...groupConversation.group,
                avatarUrl: data.avatarUrl,
              },
            });
          } else {
            // Refresh this group's data in the conversations store
            updateConversationWithLatestGroupData(data.groupId);
          }
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

        // Reload conversations to get the new group
        useConversationsStore.getState().loadConversations(currentUser.id);
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

      // Clear chat messages for this group
      useChatStore.getState().clearChatCache("GROUP", data.groupId);

      // Remove this group from conversations
      console.log(
        `[GroupSocketHandler] Removing group ${data.groupId} from conversations because current user was removed`,
      );

      // Xóa nhóm khỏi danh sách cuộc trò chuyện
      const conversationsStore = useConversationsStore.getState();
      conversationsStore.removeConversation(data.groupId);

      // Đảm bảo UI được cập nhật ngay lập tức
      setTimeout(() => {
        // Tạo một bản sao của danh sách cuộc trò chuyện để kích hoạt re-render
        conversationsStore.forceUpdate();
      }, 0);
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

        // Reload conversations to get the new group
        if (currentUser?.id) {
          useConversationsStore.getState().loadConversations(currentUser.id);
        }
      } else if (data.action === "removed_from_group") {
        console.log(
          "[GroupSocketHandler] User was removed from a group, updating group list",
        );

        // Find the group in conversations to get its name
        const groupConversation = conversations.find(
          (conv) => conv.type === "GROUP" && conv.group?.id === data.groupId,
        );
        const groupName = groupConversation?.group?.name || "chat";

        // Show notification
        toast.info(`Bạn đã bị xóa khỏi nhóm ${groupName}`);

        // If this is the currently selected group, navigate away
        if (selectedGroup && selectedGroup.id === data.groupId) {
          useChatStore.getState().setSelectedGroup(null);
        }

        // Clear chat messages for this group
        useChatStore.getState().clearChatCache("GROUP", data.groupId);

        // Remove the group from conversations
        const conversationsStore = useConversationsStore.getState();
        conversationsStore.removeConversation(data.groupId);

        // Đảm bảo UI được cập nhật ngay lập tức
        setTimeout(() => {
          conversationsStore.forceUpdate();
        }, 0);

        // Also reload conversations to ensure we have the latest data
        if (currentUser?.id) {
          setTimeout(() => {
            console.log(
              `[GroupSocketHandler] Reloading conversations after being removed from group`,
            );
            useConversationsStore.getState().loadConversations(currentUser.id);
          }, 100);
        }
      } else if (data.action === "group_dissolved") {
        console.log(
          "[GroupSocketHandler] Group was dissolved, updating group list",
        );

        // Find the group in conversations to get its name
        const groupConversation = conversations.find(
          (conv) => conv.type === "GROUP" && conv.group?.id === data.groupId,
        );
        const groupName = groupConversation?.group?.name || "chat";

        // Show notification
        toast.info(`Nhóm ${groupName} đã bị giải tán`);

        // If this is the currently selected group, navigate away
        if (selectedGroup && selectedGroup.id === data.groupId) {
          useChatStore.getState().setSelectedGroup(null);
        }

        // Clear chat messages for this group
        useChatStore.getState().clearChatCache("GROUP", data.groupId);

        // Remove the group from conversations
        const conversationsStore = useConversationsStore.getState();
        conversationsStore.removeConversation(data.groupId);

        // Đảm bảo UI được cập nhật ngay lập tức
        setTimeout(() => {
          conversationsStore.forceUpdate();
        }, 0);

        // Also reload conversations to ensure we have the latest data
        if (currentUser?.id) {
          setTimeout(() => {
            console.log(
              `[GroupSocketHandler] Reloading conversations after group dissolution`,
            );
            useConversationsStore.getState().loadConversations(currentUser.id);
          }, 100);
        }
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

      if (data.action === "group_dissolved") {
        console.log(
          "[GroupSocketHandler] Group was dissolved, updating conversation list",
        );

        // Find the group in conversations to get its name
        const groupConversation = conversations.find(
          (conv) => conv.type === "GROUP" && conv.group?.id === data.groupId,
        );
        const groupName = groupConversation?.group?.name || "chat";

        // Show notification
        toast.info(`Nhóm ${groupName} đã bị giải tán`);

        // If this is the currently selected group, navigate away
        if (selectedGroup && selectedGroup.id === data.groupId) {
          useChatStore.getState().setSelectedGroup(null);
        }

        // Clear chat messages for this group
        useChatStore.getState().clearChatCache("GROUP", data.groupId);

        // Remove this group from conversations
        const conversationsStore = useConversationsStore.getState();
        conversationsStore.removeConversation(data.groupId);

        // Đảm bảo UI được cập nhật ngay lập tức
        setTimeout(() => {
          conversationsStore.forceUpdate();
        }, 0);

        // Also reload conversations to ensure we have the latest data
        if (currentUser?.id) {
          setTimeout(() => {
            console.log(
              `[GroupSocketHandler] Reloading conversations after group dissolution via updateConversationList`,
            );
            useConversationsStore.getState().loadConversations(currentUser.id);
          }, 100);
        }
      } else if (
        data.action === "member_removed" &&
        data.userId === currentUser?.id
      ) {
        console.log(
          `[GroupSocketHandler] Current user was removed from group ${data.groupId}, updating conversation list`,
        );

        // Find the group in conversations to get its name
        const groupConversation = conversations.find(
          (conv) => conv.type === "GROUP" && conv.group?.id === data.groupId,
        );
        const groupName = groupConversation?.group?.name || "chat";

        // Show notification
        toast.info(`Bạn đã bị xóa khỏi nhóm ${groupName}`);

        // If this is the currently selected group, navigate away
        if (selectedGroup && selectedGroup.id === data.groupId) {
          useChatStore.getState().setSelectedGroup(null);
        }

        // Clear chat messages for this group
        useChatStore.getState().clearChatCache("GROUP", data.groupId);

        // Remove this group from conversations
        const conversationsStore = useConversationsStore.getState();
        conversationsStore.removeConversation(data.groupId);

        // Đảm bảo UI được cập nhật ngay lập tức
        setTimeout(() => {
          conversationsStore.forceUpdate();
        }, 0);

        // Also reload conversations to ensure we have the latest data
        if (currentUser?.id) {
          setTimeout(() => {
            console.log(
              `[GroupSocketHandler] Reloading conversations after being removed from group via updateConversationList`,
            );
            useConversationsStore.getState().loadConversations(currentUser.id);
          }, 100);
        }
      } else if (data.action === "member_removed") {
        // Another member was removed, update the group data
        console.log(
          `[GroupSocketHandler] Member was removed from group ${data.groupId}, updating group data`,
        );

        // Check if this is the currently selected group
        if (selectedGroup && selectedGroup.id === data.groupId) {
          // Refresh the selected group data immediately
          refreshSelectedGroup();

          // Show toast notification if it wasn't the current user who removed the member
          if (data.userId !== currentUser?.id) {
            toast.info("Một thành viên đã bị xóa khỏi nhóm");
          }
        } else {
          // Find the group in conversations
          const groupConversation = conversations.find(
            (conv) => conv.type === "GROUP" && conv.group?.id === data.groupId,
          );

          if (groupConversation) {
            // Refresh this group's data in the conversations store immediately
            updateConversationWithLatestGroupData(data.groupId);

            // Force UI update to ensure changes are visible immediately
            setTimeout(() => {
              useConversationsStore.getState().forceUpdate();
            }, 0);
          }
        }

        // Also reload conversations to get updated list
        if (currentUser?.id) {
          setTimeout(() => {
            useConversationsStore.getState().loadConversations(currentUser.id);
          }, 100);
        }
      } else if (data.action === "group_created") {
        // Reload conversations to get updated list
        if (currentUser?.id) {
          useConversationsStore.getState().loadConversations(currentUser.id);
        }
      }
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
                // Reload conversations to get the new group
                useConversationsStore
                  .getState()
                  .loadConversations(currentUser.id);
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

    // Handler for forceUpdateConversations event
    const handleForceUpdateConversations = (data: Record<string, unknown>) => {
      console.log(
        "[GroupSocketHandler] Force update conversations event received:",
        data,
      );

      // Force reload conversations immediately
      if (currentUser?.id) {
        console.log(
          "[GroupSocketHandler] Forcing immediate reload of conversations",
        );
        useConversationsStore.getState().loadConversations(currentUser.id);

        // Also force UI update
        setTimeout(() => {
          useConversationsStore.getState().forceUpdate();
        }, 0);

        // If this is related to a group removal, check if we need to clear selection
        if (data && data.groupId) {
          const groupId = data.groupId as string;
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

        // Schedule another reload after a short delay to ensure all changes are reflected
        setTimeout(() => {
          console.log(
            "[GroupSocketHandler] Scheduling additional reload to ensure all changes are reflected",
          );
          useConversationsStore.getState().loadConversations(currentUser.id);
          useConversationsStore.getState().forceUpdate();
        }, 300);
      }
    };

    // Register event handlers - both our custom events and backend events
    groupSocket.on("addedToGroup", handleAddedToGroup);
    groupSocket.on("removedFromGroup", handleRemovedFromGroup);
    groupSocket.on("groupCreated", handleGroupCreated);
    groupSocket.on("groupUpdated", handleGroupUpdated);
    groupSocket.on("memberAdded", handleMemberAdded);
    groupSocket.on("memberRemoved", handleMemberRemoved);
    groupSocket.on("memberRoleUpdated", handleMemberRoleUpdated);
    groupSocket.on("groupDeleted", handleGroupDeleted);

    // Backend event names
    groupSocket.on("groupDissolved", handleGroupDissolved);
    groupSocket.on("roleChanged", handleRoleChanged);
    groupSocket.on("avatarUpdated", handleAvatarUpdated);

    // New events for group list and conversation list updates
    groupSocket.on("updateGroupList", handleUpdateGroupList);
    groupSocket.on("updateConversationList", handleUpdateConversationList);
    groupSocket.on("forceUpdateConversations", handleForceUpdateConversations);

    // Mark event listeners as set up
    eventListenersSetupRef.current = true;

    // Cleanup function
    return () => {
      if (groupSocket) {
        console.log(
          "[GroupSocketHandler] Cleaning up group socket event listeners",
        );

        // Remove event listeners
        groupSocket.off("addedToGroup", handleAddedToGroup);
        groupSocket.off("removedFromGroup", handleRemovedFromGroup);
        groupSocket.off("groupCreated", handleGroupCreated);
        groupSocket.off("groupUpdated", handleGroupUpdated);
        groupSocket.off("memberAdded", handleMemberAdded);
        groupSocket.off("memberRemoved", handleMemberRemoved);
        groupSocket.off("memberRoleUpdated", handleMemberRoleUpdated);
        groupSocket.off("groupDeleted", handleGroupDeleted);

        // Backend event names
        groupSocket.off("groupDissolved", handleGroupDissolved);
        groupSocket.off("roleChanged", handleRoleChanged);
        groupSocket.off("avatarUpdated", handleAvatarUpdated);

        // New events for group list and conversation list updates
        groupSocket.off("updateGroupList", handleUpdateGroupList);
        groupSocket.off("updateConversationList", handleUpdateConversationList);
        groupSocket.off(
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
