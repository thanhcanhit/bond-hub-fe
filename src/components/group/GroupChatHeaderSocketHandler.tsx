"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/stores/authStore";
import { useChatStore } from "@/stores/chatStore";
import { useConversationsStore } from "@/stores/conversationsStore";
import { useGroupSocket } from "@/hooks/useGroupSocket";

// Define types for socket events
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
  newRole: string;
  timestamp: Date;
}

interface GroupUpdatedEventData {
  groupId: string;
  updatedBy: string;
  timestamp: Date;
}

/**
 * GroupChatHeaderSocketHandler component
 *
 * This component is responsible for handling socket events specifically for the GroupChatHeader component
 * It listens for group-related events and updates the member count and group info accordingly
 */
const GroupChatHeaderSocketHandler = ({
  groupId,
  onGroupUpdated,
}: {
  groupId: string;
  onGroupUpdated?: () => void;
}) => {
  const currentUser = useAuthStore((state) => state.user);
  const { socket } = useGroupSocket();
  const { selectedGroup, refreshSelectedGroup } = useChatStore();
  const { updateConversation } = useConversationsStore();

  useEffect(() => {
    if (!socket || !groupId) {
      console.log(
        "[GroupChatHeaderSocketHandler] Socket or groupId not available, skipping event setup",
      );
      return;
    }

    console.log(
      `[GroupChatHeaderSocketHandler] Setting up socket event listeners for group ${groupId}`,
    );

    const handleGroupUpdated = (data: GroupUpdatedEventData) => {
      if (data.groupId === groupId) {
        console.log(
          `[GroupChatHeaderSocketHandler] Group updated for ${groupId}, refreshing header data`,
        );

        // If this is the currently selected group, refresh it
        if (selectedGroup && selectedGroup.id === groupId) {
          refreshSelectedGroup();
        }

        // Call the onGroupUpdated callback if provided
        if (onGroupUpdated) {
          onGroupUpdated();
        }

        // Force update conversations to ensure header reflects changes
        setTimeout(() => {
          useConversationsStore.getState().forceUpdate();
        }, 100);
      }
    };

    const handleMemberAdded = (data: MemberAddedEventData) => {
      if (data.groupId === groupId) {
        console.log(
          `[GroupChatHeaderSocketHandler] Member added to group ${groupId}, updating header`,
        );

        // If this is the currently selected group, refresh it
        if (selectedGroup && selectedGroup.id === groupId) {
          refreshSelectedGroup();
        }

        // Call the onGroupUpdated callback if provided
        if (onGroupUpdated) {
          onGroupUpdated();
        }

        // Force update conversations to ensure header reflects changes
        setTimeout(() => {
          useConversationsStore.getState().forceUpdate();
        }, 100);
      }
    };

    const handleMemberRemoved = (data: MemberRemovedEventData) => {
      if (data.groupId === groupId) {
        console.log(
          `[GroupChatHeaderSocketHandler] Member removed from group ${groupId}, updating header`,
        );

        // Check if the current user was removed
        if (data.userId === currentUser?.id) {
          console.log(
            `[GroupChatHeaderSocketHandler] Current user was removed from group ${groupId}`,
          );
          // The main GroupSocketHandler will handle this case
          return;
        }

        // If this is the currently selected group, refresh it
        if (selectedGroup && selectedGroup.id === groupId) {
          refreshSelectedGroup();
        }

        // Call the onGroupUpdated callback if provided
        if (onGroupUpdated) {
          onGroupUpdated();
        }

        // Force update conversations to ensure header reflects changes
        setTimeout(() => {
          useConversationsStore.getState().forceUpdate();
        }, 100);
      }
    };

    const handleMemberRoleUpdated = (data: MemberRoleUpdatedEventData) => {
      if (data.groupId === groupId) {
        console.log(
          `[GroupChatHeaderSocketHandler] Member role updated in group ${groupId}, updating header`,
        );

        // If this is the currently selected group, refresh it
        if (selectedGroup && selectedGroup.id === groupId) {
          refreshSelectedGroup();
        }

        // Call the onGroupUpdated callback if provided
        if (onGroupUpdated) {
          onGroupUpdated();
        }

        // Force update conversations to ensure header reflects changes
        setTimeout(() => {
          useConversationsStore.getState().forceUpdate();
        }, 100);
      }
    };

    // Register event listeners
    socket.on("groupUpdated", handleGroupUpdated);
    socket.on("memberAdded", handleMemberAdded);
    socket.on("memberRemoved", handleMemberRemoved);
    socket.on("memberRoleUpdated", handleMemberRoleUpdated);
    socket.on("roleChanged", handleMemberRoleUpdated); // Legacy event

    // Cleanup on unmount
    return () => {
      console.log(
        `[GroupChatHeaderSocketHandler] Cleaning up socket event listeners for group ${groupId}`,
      );
      socket.off("groupUpdated", handleGroupUpdated);
      socket.off("memberAdded", handleMemberAdded);
      socket.off("memberRemoved", handleMemberRemoved);
      socket.off("memberRoleUpdated", handleMemberRoleUpdated);
      socket.off("roleChanged", handleMemberRoleUpdated);
    };
  }, [
    socket,
    groupId,
    currentUser?.id,
    selectedGroup,
    refreshSelectedGroup,
    updateConversation,
    onGroupUpdated,
  ]);

  // This component doesn't render anything
  return null;
};

export default GroupChatHeaderSocketHandler;
