"use client";

// Đợi backend cập nhật
// import { useEffect } from "react";
// import { useAuthStore } from "@/stores/authStore";
// import { useConversationsStore } from "@/stores/conversationsStore";
// import { useChatStore } from "@/stores/chatStore";
// import { toast } from "sonner";

/**
 * Component to handle group dissolved events
 * This is a separate component to ensure that group dissolved events are handled properly
 * even if other socket handlers fail
 *
 * Đợi backend cập nhật
 */
export default function GroupDissolvedHandler() {
  // Đợi backend cập nhật
  // const currentUser = useAuthStore((state) => state.user);
  // const removeConversation = useConversationsStore((state) => state.removeConversation);
  // const loadConversations = useConversationsStore((state) => state.loadConversations);
  // const selectedGroup = useChatStore((state) => state.selectedGroup);
  // const setSelectedGroup = useChatStore((state) => state.setSelectedGroup);

  // useEffect(() => {
  //   // Get the group socket from window object
  //   const groupSocket = window.groupSocket;
  //   if (!groupSocket || !currentUser) return;

  //   // Handler for groupDissolved event
  //   const handleGroupDissolved = (data: any) => {
  //     console.log('[GroupDissolvedHandler] Group dissolved event received:', data);
  //     console.log('[GroupDissolvedHandler] Group dissolved data type:', typeof data);
  //     console.log('[GroupDissolvedHandler] Group dissolved data keys:', Object.keys(data));

  //     // Make sure we have a groupId
  //     const groupId = data.groupId;
  //     if (!groupId) {
  //       console.error('[GroupDissolvedHandler] Invalid groupDissolved event data:', data);
  //       return;
  //     }

  //     console.log(`[GroupDissolvedHandler] Processing group dissolution for group ${groupId}`);

  //     // Show toast notification
  //     const groupName = data.groupName || "chat";
  //     toast.info(`Nhóm ${groupName} đã bị giải tán`);

  //     // If this is the currently selected group, clear selection
  //     if (selectedGroup && selectedGroup.id === groupId) {
  //       console.log(`[GroupDissolvedHandler] Currently selected group was dissolved, clearing selection`);
  //       setSelectedGroup(null);
  //     }

  //     // Remove this group from conversations
  //     console.log(`[GroupDissolvedHandler] Removing dissolved group ${groupId} from conversations`);
  //     removeConversation(groupId);

  //     // Force reload conversations to ensure UI is updated
  //     console.log(`[GroupDissolvedHandler] Forcing reload of conversations after group dissolution`);
  //     setTimeout(() => {
  //       if (currentUser?.id) {
  //         loadConversations(currentUser.id);
  //       }
  //     }, 500);
  //   };

  //   // Register event handler
  //   console.log('[GroupDissolvedHandler] Registering groupDissolved event handler');
  //   groupSocket.on('groupDissolved', handleGroupDissolved);

  //   // Cleanup
  //   return () => {
  //     console.log('[GroupDissolvedHandler] Cleaning up groupDissolved event handler');
  //     groupSocket.off('groupDissolved', handleGroupDissolved);
  //   };
  // }, [currentUser, selectedGroup, removeConversation, loadConversations, setSelectedGroup]);

  // This component doesn't render anything
  return null;
}
