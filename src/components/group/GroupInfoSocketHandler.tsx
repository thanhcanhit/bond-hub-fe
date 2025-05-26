"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/stores/authStore";
import { useChatStore } from "@/stores/chatStore";
import { useConversationsStore } from "@/stores/conversationsStore";
import { useGroupSocket } from "@/hooks/useGroupSocket";

// Define interfaces for socket event data
interface GroupUpdatedEventData {
  groupId: string;
  updatedBy?: string;
  timestamp?: Date;
  [key: string]: any; // Allow for additional properties
}

interface MemberEventData {
  groupId: string;
  userId: string;
  addedById?: string;
  removedById?: string;
  timestamp?: Date;
  [key: string]: any; // Allow for additional properties
}

interface RoleChangedEventData {
  groupId: string;
  userId: string;
  newRole?: string;
  oldRole?: string;
  updatedBy?: string;
  timestamp?: Date;
  [key: string]: any; // Allow for additional properties
}

interface AvatarUpdatedEventData {
  groupId: string;
  updatedBy?: string;
  avatarUrl?: string;
  newAvatarUrl?: string;
  timestamp?: Date;
  [key: string]: any; // Allow for additional properties
}

/**
 * GroupInfoSocketHandler component
 *
 * This component is responsible for handling socket events specifically for the GroupInfo component
 * It listens for group-related events and updates the GroupInfo component accordingly
 */
const GroupInfoSocketHandler = ({
  groupId,
  onGroupUpdated,
}: {
  groupId: string;
  onGroupUpdated?: (forceRefresh?: boolean) => void;
}) => {
  const currentUser = useAuthStore((state) => state.user);
  const { socket, joinGroupRoom } = useGroupSocket();
  const { selectedGroup, setSelectedGroup } = useChatStore();

  // Join the group room when the component mounts or groupId changes
  useEffect(() => {
    if (groupId && socket) {
      console.log(`[GroupInfoSocketHandler] Joining group room: ${groupId}`);
      joinGroupRoom(groupId);

      // We don't need to force update conversations here anymore
      // The data should already be available in the cache
    }
  }, [groupId, socket, joinGroupRoom]);

  // Listen for group-related events
  useEffect(() => {
    if (!socket || !groupId) return;

    const handleGroupUpdated = (data: GroupUpdatedEventData) => {
      if (data.groupId === groupId) {
        console.log(
          `[GroupInfoSocketHandler] Group ${groupId} updated, refreshing data`,
        );

        // Thêm throttle để tránh gọi onGroupUpdated quá thường xuyên
        // Sử dụng biến toàn cục để theo dõi thời gian gọi cuối cùng
        if (!window._lastGroupInfoUpdateTime) {
          window._lastGroupInfoUpdateTime = {};
        }

        const now = Date.now();
        const lastUpdateTime = window._lastGroupInfoUpdateTime[groupId] || 0;
        const timeSinceLastUpdate = now - lastUpdateTime;

        // Nếu đã gọi trong vòng 5 giây, bỏ qua để giảm lag
        if (timeSinceLastUpdate < 5000) {
          console.log(
            `[GroupInfoSocketHandler] Skipping update, last update was ${timeSinceLastUpdate}ms ago`,
          );
          return;
        }

        // Cập nhật thời gian gọi cuối cùng
        window._lastGroupInfoUpdateTime[groupId] = now;

        // Call the onGroupUpdated callback if provided
        // This will use the cache system to avoid redundant API calls
        if (onGroupUpdated) {
          onGroupUpdated();
        }
      }
    };

    const handleMemberAdded = (data: MemberEventData) => {
      if (data.groupId === groupId) {
        console.log(
          `[GroupInfoSocketHandler] Member added to group ${groupId}, refreshing data`,
        );

        // Thêm throttle để tránh gọi onGroupUpdated quá thường xuyên
        if (!window._lastGroupInfoUpdateTime) {
          window._lastGroupInfoUpdateTime = {};
        }

        const now = Date.now();
        const lastUpdateTime = window._lastGroupInfoUpdateTime[groupId] || 0;
        const timeSinceLastUpdate = now - lastUpdateTime;

        // Nếu đã gọi trong vòng 2 giây, bỏ qua
        if (timeSinceLastUpdate < 2000) {
          console.log(
            `[GroupInfoSocketHandler] Skipping update, last update was ${timeSinceLastUpdate}ms ago`,
          );
          return;
        }

        // Cập nhật thời gian gọi cuối cùng
        window._lastGroupInfoUpdateTime[groupId] = now;

        // Call the onGroupUpdated callback if provided
        // This will use the cache system to avoid redundant API calls
        if (onGroupUpdated) {
          onGroupUpdated();
        }

        // Force update conversations to ensure all components get updated
        setTimeout(() => {
          useConversationsStore.getState().forceUpdate();
        }, 100);
      }
    };

    const handleMemberRemoved = (data: MemberEventData) => {
      if (data.groupId === groupId) {
        console.log(
          `[GroupInfoSocketHandler] Member removed from group ${groupId}, refreshing data`,
        );

        // Check if the current user was removed
        if (data.userId === currentUser?.id) {
          console.log(
            `[GroupInfoSocketHandler] Current user was removed from group ${groupId}`,
          );

          // If this is the currently selected group, clear it
          if (selectedGroup && selectedGroup.id === groupId) {
            setSelectedGroup(null);
          }

          // Remove the group from conversations
          useConversationsStore.getState().removeConversation(groupId);

          // Force update conversations
          setTimeout(() => {
            useConversationsStore.getState().forceUpdate();
          }, 100);
        } else {
          // Thêm throttle để tránh gọi onGroupUpdated quá thường xuyên
          if (!window._lastGroupInfoUpdateTime) {
            window._lastGroupInfoUpdateTime = {};
          }

          const now = Date.now();
          const lastUpdateTime = window._lastGroupInfoUpdateTime[groupId] || 0;
          const timeSinceLastUpdate = now - lastUpdateTime;

          // Nếu đã gọi trong vòng 2 giây, bỏ qua
          if (timeSinceLastUpdate < 2000) {
            console.log(
              `[GroupInfoSocketHandler] Skipping update, last update was ${timeSinceLastUpdate}ms ago`,
            );
            return;
          }

          // Cập nhật thời gian gọi cuối cùng
          window._lastGroupInfoUpdateTime[groupId] = now;

          // Call the onGroupUpdated callback if provided
          // This will use the cache system to avoid redundant API calls
          if (onGroupUpdated) {
            onGroupUpdated();
          }

          // Force update conversations to ensure all components get updated
          setTimeout(() => {
            useConversationsStore.getState().forceUpdate();
          }, 100);
        }
      }
    };

    const handleRoleChanged = (data: RoleChangedEventData) => {
      if (data.groupId === groupId) {
        console.log(
          `[GroupInfoSocketHandler] Role changed in group ${groupId}, refreshing data`,
        );

        // Call the onGroupUpdated callback immediately to refresh group data
        // This matches the mobile app behavior of calling fetchGroupDetails()
        if (onGroupUpdated) {
          onGroupUpdated(true); // Force refresh to get latest data from server
        }

        // Force update conversations to ensure all components get updated
        setTimeout(() => {
          useConversationsStore.getState().forceUpdate();
        }, 100);
      }
    };

    const handleAvatarUpdated = (data: AvatarUpdatedEventData) => {
      if (data.groupId === groupId) {
        console.log(
          `[GroupInfoSocketHandler] Avatar updated for group ${groupId}, refreshing data`,
        );

        // If we have avatarUrl in the data, update it directly in the selected group
        if (data.avatarUrl && selectedGroup && selectedGroup.id === groupId) {
          // Update the selected group directly
          useChatStore.getState().setSelectedGroup({
            ...selectedGroup,
            avatarUrl: data.avatarUrl,
          });

          // Also update the cache
          const chatStore = useChatStore.getState();
          const cachedData = chatStore.groupCache
            ? chatStore.groupCache[groupId]
            : undefined;
          if (cachedData) {
            chatStore.groupCache[groupId] = {
              ...cachedData,
              group: {
                ...cachedData.group,
                avatarUrl: data.avatarUrl,
              },
            };
          }
        }

        // Thêm throttle để tránh gọi onGroupUpdated quá thường xuyên
        if (!window._lastGroupInfoUpdateTime) {
          window._lastGroupInfoUpdateTime = {};
        }

        const now = Date.now();
        const lastUpdateTime = window._lastGroupInfoUpdateTime[groupId] || 0;
        const timeSinceLastUpdate = now - lastUpdateTime;

        // Nếu đã gọi trong vòng 5 giây, bỏ qua để giảm lag
        if (timeSinceLastUpdate < 5000) {
          console.log(
            `[GroupInfoSocketHandler] Skipping update, last update was ${timeSinceLastUpdate}ms ago`,
          );
          return;
        }

        // Cập nhật thời gian gọi cuối cùng
        window._lastGroupInfoUpdateTime[groupId] = now;

        // Call the onGroupUpdated callback if provided
        // This will use the cache system to avoid redundant API calls
        if (onGroupUpdated) {
          onGroupUpdated();
        }
      }
    };

    // Register event listeners
    socket.on("groupUpdated", handleGroupUpdated);
    socket.on("memberAdded", handleMemberAdded);
    socket.on("memberRemoved", handleMemberRemoved);
    socket.on("roleChanged", handleRoleChanged);
    socket.on("memberRoleUpdated", handleRoleChanged); // Legacy event
    socket.on("avatarUpdated", handleAvatarUpdated);

    // Cleanup on unmount
    return () => {
      socket.off("groupUpdated", handleGroupUpdated);
      socket.off("memberAdded", handleMemberAdded);
      socket.off("memberRemoved", handleMemberRemoved);
      socket.off("roleChanged", handleRoleChanged);
      socket.off("memberRoleUpdated", handleRoleChanged);
      socket.off("avatarUpdated", handleAvatarUpdated);
    };
  }, [
    socket,
    groupId,
    currentUser?.id,
    selectedGroup,
    setSelectedGroup,
    onGroupUpdated,
  ]);

  // This component doesn't render anything
  return null;
};

export default GroupInfoSocketHandler;
