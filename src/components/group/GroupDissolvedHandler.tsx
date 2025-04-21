"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/stores/authStore";
import { useConversationsStore } from "@/stores/conversationsStore";
import { useChatStore } from "@/stores/chatStore";
import { toast } from "sonner";
import { useGroupSocket } from "@/hooks/useGroupSocket";

/**
 * Component to handle group dissolved events
 * This is a separate component to ensure that group dissolved events are handled properly
 * even if other socket handlers fail
 */
export default function GroupDissolvedHandler() {
  const currentUser = useAuthStore((state) => state.user);
  const removeConversation = useConversationsStore(
    (state) => state.removeConversation,
  );
  const loadConversations = useConversationsStore(
    (state) => state.loadConversations,
  );
  const selectedGroup = useChatStore((state) => state.selectedGroup);
  const setSelectedGroup = useChatStore((state) => state.setSelectedGroup);
  const groupSocket = useGroupSocket();

  useEffect(() => {
    if (!groupSocket || !currentUser) return;

    // Handler for groupDissolved event
    const handleGroupDissolved = (data: Record<string, unknown>) => {
      console.log(
        "[GroupDissolvedHandler] Group dissolved event received:",
        data,
      );

      // Make sure we have a groupId
      const groupId = data.groupId as string;
      if (!groupId) {
        console.error(
          "[GroupDissolvedHandler] Invalid groupDissolved event data:",
          data,
        );
        return;
      }

      console.log(
        `[GroupDissolvedHandler] Processing group dissolution for group ${groupId}`,
      );

      // Show toast notification
      const groupName = (data.groupName as string) || "chat";
      toast.info(`Nhóm ${groupName} đã bị giải tán`);

      // If this is the currently selected group, clear selection
      if (selectedGroup && selectedGroup.id === groupId) {
        console.log(
          `[GroupDissolvedHandler] Currently selected group was dissolved, clearing selection`,
        );
        setSelectedGroup(null);
      }

      // Clear chat messages for this group
      useChatStore.getState().clearChatCache("GROUP", groupId);

      // Remove this group from conversations
      console.log(
        `[GroupDissolvedHandler] Removing dissolved group ${groupId} from conversations`,
      );
      removeConversation(groupId);

      // Đảm bảo UI được cập nhật ngay lập tức
      setTimeout(() => {
        useConversationsStore.getState().forceUpdate();
      }, 0);
    };

    // Handler for removedFromGroup event
    const handleRemovedFromGroup = (data: Record<string, unknown>) => {
      console.log(
        "[GroupDissolvedHandler] Removed from group event received:",
        data,
      );

      // Make sure we have a groupId
      const groupId = data.groupId as string;
      if (!groupId) {
        console.error(
          "[GroupDissolvedHandler] Invalid removedFromGroup event data:",
          data,
        );
        return;
      }

      // Show appropriate toast notification
      const groupName = (data.groupName as string) || "chat";
      if (data.kicked as boolean) {
        toast.info(`Bạn đã bị xóa khỏi nhóm ${groupName}`);
      } else if (data.left as boolean) {
        toast.info(`Bạn đã rời khỏi nhóm ${groupName}`);
      } else {
        toast.info(`Bạn không còn là thành viên của nhóm ${groupName}`);
      }

      // If this is the currently selected group, clear selection
      if (selectedGroup && selectedGroup.id === groupId) {
        console.log(
          `[GroupDissolvedHandler] Currently selected group was left, clearing selection`,
        );
        setSelectedGroup(null);
      }

      // Clear chat messages for this group
      useChatStore.getState().clearChatCache("GROUP", groupId);

      // Remove this group from conversations
      console.log(
        `[GroupDissolvedHandler] Removing group ${groupId} from conversations after being removed`,
      );
      removeConversation(groupId);

      // Đảm bảo UI được cập nhật ngay lập tức
      setTimeout(() => {
        useConversationsStore.getState().forceUpdate();
      }, 0);
    };

    // Handler for updateConversationList event
    const handleUpdateConversationList = (data: Record<string, unknown>) => {
      console.log(
        "[GroupDissolvedHandler] Update conversation list event received:",
        data,
      );

      const action = data.action as string;
      const groupId = data.groupId as string;

      if (!groupId) {
        console.error(
          "[GroupDissolvedHandler] Invalid updateConversationList event data:",
          data,
        );
        return;
      }

      if (action === "group_dissolved") {
        console.log(
          `[GroupDissolvedHandler] Group ${groupId} was dissolved, updating conversation list`,
        );

        // If this is the currently selected group, clear selection
        if (selectedGroup && selectedGroup.id === groupId) {
          setSelectedGroup(null);
        }

        // Clear chat messages for this group
        useChatStore.getState().clearChatCache("GROUP", groupId);

        // Remove this group from conversations
        removeConversation(groupId);

        // Đảm bảo UI được cập nhật ngay lập tức
        setTimeout(() => {
          useConversationsStore.getState().forceUpdate();
        }, 0);
      } else if (
        action === "member_removed" &&
        data.userId === currentUser.id
      ) {
        console.log(
          `[GroupDissolvedHandler] User was removed from group ${groupId}, updating conversation list`,
        );

        // If this is the currently selected group, clear selection
        if (selectedGroup && selectedGroup.id === groupId) {
          setSelectedGroup(null);
        }

        // Clear chat messages for this group
        useChatStore.getState().clearChatCache("GROUP", groupId);

        // Remove this group from conversations
        removeConversation(groupId);

        // Đảm bảo UI được cập nhật ngay lập tức
        setTimeout(() => {
          useConversationsStore.getState().forceUpdate();
        }, 0);
      }
    };

    // Handler for forceUpdateConversations event
    const handleForceUpdateConversations = (data: Record<string, unknown>) => {
      console.log(
        "[GroupDissolvedHandler] Force update conversations event received:",
        data,
      );

      // Force reload conversations immediately
      if (currentUser?.id) {
        console.log(
          "[GroupDissolvedHandler] Forcing immediate reload of conversations",
        );
        loadConversations(currentUser.id);

        // Also force UI update
        setTimeout(() => {
          useConversationsStore.getState().forceUpdate();
        }, 0);

        // If this is related to a group removal, check if we need to clear selection
        if (data && data.groupId) {
          const groupId = data.groupId as string;
          if (selectedGroup && selectedGroup.id === groupId) {
            console.log(
              `[GroupDissolvedHandler] Clearing selected group ${groupId} via forceUpdateConversations`,
            );
            setSelectedGroup(null);
          }

          // Clear chat messages for this group
          useChatStore.getState().clearChatCache("GROUP", groupId);

          // Remove this group from conversations
          removeConversation(groupId);
        }
      }
    };

    // Register event handlers
    console.log("[GroupDissolvedHandler] Registering group event handlers");
    groupSocket.on("groupDissolved", handleGroupDissolved);
    groupSocket.on("removedFromGroup", handleRemovedFromGroup);
    groupSocket.on("updateConversationList", handleUpdateConversationList);
    groupSocket.on("forceUpdateConversations", handleForceUpdateConversations);

    // Cleanup
    return () => {
      console.log("[GroupDissolvedHandler] Cleaning up group event handlers");
      groupSocket.off("groupDissolved", handleGroupDissolved);
      groupSocket.off("removedFromGroup", handleRemovedFromGroup);
      groupSocket.off("updateConversationList", handleUpdateConversationList);
      groupSocket.off(
        "forceUpdateConversations",
        handleForceUpdateConversations,
      );
    };
  }, [
    currentUser,
    selectedGroup,
    removeConversation,
    loadConversations,
    setSelectedGroup,
    groupSocket,
  ]);

  // This component doesn't render anything
  return null;
}
