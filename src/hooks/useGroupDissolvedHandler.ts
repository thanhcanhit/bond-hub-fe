import { useEffect } from "react";
import { useAuthStore } from "@/stores/authStore";
import { useConversationsStore } from "@/stores/conversationsStore";
import { useChatStore } from "@/stores/chatStore";
import { toast } from "sonner";
import { Socket } from "socket.io-client";

/**
 * Hook to handle group dissolved events
 * This is a separate hook to ensure that group dissolved events are handled properly
 * even if other socket handlers fail
 */
export const useGroupDissolvedHandler = (socket: Socket | null) => {
  const currentUser = useAuthStore((state) => state.user);
  const removeConversation = useConversationsStore(
    (state) => state.removeConversation,
  );
  const loadConversations = useConversationsStore(
    (state) => state.loadConversations,
  );
  const selectedGroup = useChatStore((state) => state.selectedGroup);
  const setSelectedGroup = useChatStore((state) => state.setSelectedGroup);
  const conversations = useConversationsStore((state) => state.conversations);

  useEffect(() => {
    if (!socket || !currentUser) return;

    // Handler for groupDissolved event
    const handleGroupDissolved = (data: Record<string, unknown>) => {
      console.log(
        "[useGroupDissolvedHandler] Group dissolved event received:",
        data,
      );
      console.log(
        "[useGroupDissolvedHandler] Group dissolved data type:",
        typeof data,
      );
      console.log(
        "[useGroupDissolvedHandler] Group dissolved data keys:",
        Object.keys(data),
      );

      // Make sure we have a groupId
      const groupId = data.groupId as string;
      if (!groupId) {
        console.error(
          "[useGroupDissolvedHandler] Invalid groupDissolved event data:",
          data,
        );
        return;
      }

      console.log(
        `[useGroupDissolvedHandler] Processing group dissolution for group ${groupId}`,
      );

      // Find the group in conversations
      const groupConversation = conversations.find(
        (conv) => conv.type === "GROUP" && conv.group?.id === groupId,
      );

      console.log(
        `[useGroupDissolvedHandler] Group ${groupId} exists in conversations: ${!!groupConversation}`,
      );

      // Show toast notification
      const groupName =
        (data.groupName as string) || groupConversation?.group?.name || "chat";
      toast.info(`Nhóm ${groupName} đã bị giải tán`);

      // If this is the currently selected group, clear selection
      if (selectedGroup && selectedGroup.id === groupId) {
        console.log(
          `[useGroupDissolvedHandler] Currently selected group was dissolved, clearing selection`,
        );
        setSelectedGroup(null);
      }

      // Remove this group from conversations
      console.log(
        `[useGroupDissolvedHandler] Removing dissolved group ${groupId} from conversations`,
      );
      removeConversation(groupId);

      // Force reload conversations to ensure UI is updated
      console.log(
        `[useGroupDissolvedHandler] Forcing reload of conversations after group dissolution`,
      );
      setTimeout(() => {
        if (currentUser?.id) {
          loadConversations(currentUser.id);
        }
      }, 500);
    };

    // Handler for removedFromGroup event
    const handleRemovedFromGroup = (data: Record<string, unknown>) => {
      console.log(
        "[useGroupDissolvedHandler] Removed from group event received:",
        data,
      );

      // Make sure we have a groupId
      const groupId = data.groupId as string;
      if (!groupId) {
        console.error(
          "[useGroupDissolvedHandler] Invalid removedFromGroup event data:",
          data,
        );
        return;
      }

      // Find the group in conversations
      const groupConversation = conversations.find(
        (conv) => conv.type === "GROUP" && conv.group?.id === groupId,
      );

      // Show appropriate toast notification
      const groupName =
        (data.groupName as string) || groupConversation?.group?.name || "chat";
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
          `[useGroupDissolvedHandler] Currently selected group was left, clearing selection`,
        );
        setSelectedGroup(null);
      }

      // Remove this group from conversations
      console.log(
        `[useGroupDissolvedHandler] Removing group ${groupId} from conversations after being removed`,
      );
      removeConversation(groupId);

      // Force reload conversations to ensure UI is updated
      setTimeout(() => {
        if (currentUser?.id) {
          loadConversations(currentUser.id);
        }
      }, 500);
    };

    // Register event handlers
    console.log("[useGroupDissolvedHandler] Registering group event handlers");
    socket.on("groupDissolved", handleGroupDissolved);
    socket.on("removedFromGroup", handleRemovedFromGroup);

    // Cleanup
    return () => {
      console.log(
        "[useGroupDissolvedHandler] Cleaning up group event handlers",
      );
      socket.off("groupDissolved", handleGroupDissolved);
      socket.off("removedFromGroup", handleRemovedFromGroup);
    };
  }, [
    socket,
    currentUser,
    selectedGroup,
    conversations,
    removeConversation,
    loadConversations,
    setSelectedGroup,
  ]);
};
