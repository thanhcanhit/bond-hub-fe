"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/stores/authStore";
import { useChatStore } from "@/stores/chatStore";
import { useConversationsStore } from "@/stores/conversationsStore";
import { useGroupSocket } from "@/hooks/useGroupSocket";

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
  onGroupUpdated?: () => void;
}) => {
  const currentUser = useAuthStore((state) => state.user);
  const { socket, joinGroupRoom } = useGroupSocket();
  const { selectedGroup, setSelectedGroup } = useChatStore();

  // Join the group room when the component mounts or groupId changes
  useEffect(() => {
    if (groupId && socket) {
      console.log(`[GroupInfoSocketHandler] Joining group room: ${groupId}`);
      joinGroupRoom(groupId);

      // Force update conversations to ensure we have the latest data
      setTimeout(() => {
        console.log(
          `[GroupInfoSocketHandler] Forcing conversations update after joining group room`,
        );
        useConversationsStore.getState().forceUpdate();
      }, 500);
    }
  }, [groupId, socket, joinGroupRoom]);

  // Listen for group-related events
  useEffect(() => {
    if (!socket || !groupId) return;

    const handleGroupUpdated = (data: any) => {
      if (data.groupId === groupId) {
        console.log(
          `[GroupInfoSocketHandler] Group ${groupId} updated, refreshing data`,
        );

        // Call the onGroupUpdated callback if provided
        if (onGroupUpdated) {
          onGroupUpdated();
        }

        // Force update conversations to ensure UI is updated
        setTimeout(() => {
          console.log(
            `[GroupInfoSocketHandler] Forcing conversations update after group update`,
          );
          useConversationsStore.getState().forceUpdate();

          // Also refresh the selected group in chat store
          useChatStore.getState().refreshSelectedGroup();
        }, 100);
      }
    };

    const handleMemberAdded = (data: any) => {
      if (data.groupId === groupId) {
        console.log(
          `[GroupInfoSocketHandler] Member added to group ${groupId}, refreshing data`,
        );

        // Call the onGroupUpdated callback if provided
        if (onGroupUpdated) {
          onGroupUpdated();
        }

        // Force update conversations to ensure UI is updated
        setTimeout(() => {
          console.log(
            `[GroupInfoSocketHandler] Forcing conversations update after member added`,
          );
          useConversationsStore.getState().forceUpdate();

          // Also refresh the selected group in chat store
          useChatStore.getState().refreshSelectedGroup();
        }, 100);
      }
    };

    const handleMemberRemoved = (data: any) => {
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
          // Call the onGroupUpdated callback if provided
          if (onGroupUpdated) {
            onGroupUpdated();
          }

          // Force update conversations to ensure UI is updated
          setTimeout(() => {
            console.log(
              `[GroupInfoSocketHandler] Forcing conversations update after member removed`,
            );
            useConversationsStore.getState().forceUpdate();

            // Also refresh the selected group in chat store
            useChatStore.getState().refreshSelectedGroup();
          }, 100);
        }
      }
    };

    const handleRoleChanged = (data: any) => {
      if (data.groupId === groupId) {
        console.log(
          `[GroupInfoSocketHandler] Role changed in group ${groupId}, refreshing data`,
        );

        // Call the onGroupUpdated callback if provided
        if (onGroupUpdated) {
          onGroupUpdated();
        }

        // Force update conversations to ensure UI is updated
        setTimeout(() => {
          console.log(
            `[GroupInfoSocketHandler] Forcing conversations update after role changed`,
          );
          useConversationsStore.getState().forceUpdate();

          // Also refresh the selected group in chat store
          useChatStore.getState().refreshSelectedGroup();
        }, 100);
      }
    };

    const handleAvatarUpdated = (data: any) => {
      if (data.groupId === groupId) {
        console.log(
          `[GroupInfoSocketHandler] Avatar updated for group ${groupId}, refreshing data`,
        );

        // Call the onGroupUpdated callback if provided
        if (onGroupUpdated) {
          onGroupUpdated();
        }

        // Force update conversations to ensure UI is updated
        setTimeout(() => {
          console.log(
            `[GroupInfoSocketHandler] Forcing conversations update after avatar updated`,
          );
          useConversationsStore.getState().forceUpdate();

          // Also refresh the selected group in chat store
          useChatStore.getState().refreshSelectedGroup();

          // If we have avatarUrl in the data, update it directly in the selected group
          if (data.avatarUrl && selectedGroup && selectedGroup.id === groupId) {
            useChatStore.getState().setSelectedGroup({
              ...selectedGroup,
              avatarUrl: data.avatarUrl,
            });
          }
        }, 100);
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
