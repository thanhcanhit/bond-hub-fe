// Đợi backend cập nhật
// import { useEffect } from 'react';
// import { useAuthStore } from '@/stores/authStore';
// import { useConversationsStore } from '@/stores/conversationsStore';
// import { useChatStore } from '@/stores/chatStore';
// import { toast } from 'sonner';

/**
 * Hook to handle group dissolved events
 * This is a separate hook to ensure that group dissolved events are handled properly
 * even if other socket handlers fail
 *
 * Đợi backend cập nhật
 */
export const useGroupDissolvedHandler = (socket: any) => {
  // Đợi backend cập nhật
  // const currentUser = useAuthStore((state) => state.user);
  // const removeConversation = useConversationsStore((state) => state.removeConversation);
  // const loadConversations = useConversationsStore((state) => state.loadConversations);
  // const selectedGroup = useChatStore((state) => state.selectedGroup);
  // const setSelectedGroup = useChatStore((state) => state.setSelectedGroup);
  // const conversations = useConversationsStore((state) => state.conversations);
  // useEffect(() => {
  //   if (!socket || !currentUser) return;
  //   // Handler for groupDissolved event
  //   const handleGroupDissolved = (data: any) => {
  //     console.log('[useGroupDissolvedHandler] Group dissolved event received:', data);
  //     console.log('[useGroupDissolvedHandler] Group dissolved data type:', typeof data);
  //     console.log('[useGroupDissolvedHandler] Group dissolved data keys:', Object.keys(data));
  //     // Make sure we have a groupId
  //     const groupId = data.groupId;
  //     if (!groupId) {
  //       console.error('[useGroupDissolvedHandler] Invalid groupDissolved event data:', data);
  //       return;
  //     }
  //     console.log(`[useGroupDissolvedHandler] Processing group dissolution for group ${groupId}`);
  //     // Find the group in conversations
  //     const groupConversation = conversations.find(
  //       (conv) => conv.type === 'GROUP' && conv.group?.id === groupId
  //     );
  //     console.log(`[useGroupDissolvedHandler] Group ${groupId} exists in conversations: ${!!groupConversation}`);
  //     // Show toast notification
  //     const groupName = data.groupName || (groupConversation?.group?.name) || 'chat';
  //     toast.info(`Nhóm ${groupName} đã bị giải tán`);
  //     // If this is the currently selected group, clear selection
  //     if (selectedGroup && selectedGroup.id === groupId) {
  //       console.log(`[useGroupDissolvedHandler] Currently selected group was dissolved, clearing selection`);
  //       setSelectedGroup(null);
  //     }
  //     // Remove this group from conversations
  //     console.log(`[useGroupDissolvedHandler] Removing dissolved group ${groupId} from conversations`);
  //     removeConversation(groupId);
  //     // Force reload conversations to ensure UI is updated
  //     console.log(`[useGroupDissolvedHandler] Forcing reload of conversations after group dissolution`);
  //     setTimeout(() => {
  //       if (currentUser?.id) {
  //         loadConversations(currentUser.id);
  //       }
  //     }, 500);
  //   };
  //   // Register event handler
  //   console.log('[useGroupDissolvedHandler] Registering groupDissolved event handler');
  //   socket.on('groupDissolved', handleGroupDissolved);
  //   // Cleanup
  //   return () => {
  //     console.log('[useGroupDissolvedHandler] Cleaning up groupDissolved event handler');
  //     socket.off('groupDissolved', handleGroupDissolved);
  //   };
  // }, [socket, currentUser, selectedGroup, conversations, removeConversation, loadConversations, setSelectedGroup]);
};
