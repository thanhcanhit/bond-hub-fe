import { useEffect, useRef, useCallback } from "react";
import { Socket, io } from "socket.io-client";
import { useAuthStore } from "@/stores/authStore";
import { useChatStore } from "@/stores/chatStore";
import { useConversationsStore } from "@/stores/conversationsStore";
// import { getGroupById } from "@/actions/group.action";

/**
 * Hook to connect to the groups WebSocket namespace and handle group events
 */
export const useGroupSocket = () => {
  const socketRef = useRef<Socket | null>(null);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const accessToken = useAuthStore((state) => state.accessToken);
  const currentUser = useAuthStore((state) => state.user);

  const joinGroupRoom = useCallback(
    (groupId: string) => {
      if (!socketRef.current) return;

      socketRef.current.emit("joinGroup", {
        userId: currentUser?.id,
        groupId,
      });
    },
    [currentUser?.id],
  );

  const joinUserRoom = useCallback(() => {
    if (!socketRef.current || !currentUser?.id) return;

    socketRef.current.emit("joinUserRoom", {
      userId: currentUser.id,
    });
  }, [currentUser?.id]);

  const refreshSelectedGroup = useChatStore(
    (state) => state.refreshSelectedGroup,
  );

  const refreshAllGroupData = useCallback(async () => {
    console.log("[useGroupSocket] Refreshing all group data");

    // Refresh the selected group
    refreshSelectedGroup();

    // Refresh conversations list
    if (currentUser?.id) {
      const conversationsStore = useConversationsStore.getState();
      await conversationsStore.loadConversations(currentUser.id);
    }
  }, [refreshSelectedGroup, currentUser?.id]);

  const triggerGroupsReload = () => {
    if (socketRef.current && socketRef.current.connected) {
      console.log("[useGroupSocket] Manually triggering groups reload");
      socketRef.current.emit("requestReload");
    } else {
      console.log(
        "[useGroupSocket] Socket not connected, refreshing data directly",
      );
      refreshAllGroupData();
    }
  };

  if (typeof window !== "undefined") {
    window.triggerGroupsReload = triggerGroupsReload;
    window.groupSocket = socketRef.current;
  }

  useEffect(() => {
    if (!isAuthenticated || !accessToken || !currentUser) return;

    const socket = io(`${process.env.NEXT_PUBLIC_SOCKET_URL}/groups`, {
      auth: { token: accessToken },
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      query: { userId: currentUser.id },
    });

    socketRef.current = socket;

    // Expose socket to window for other components to use
    if (typeof window !== "undefined") {
      window.groupSocket = socket;
      console.log("[GroupSocket] Socket exposed to window.groupSocket");
    }

    // Join personal room immediately after connection
    socket.on("connect", () => {
      console.log("[GroupSocket] Connected");
      joinUserRoom();
    });

    // Handle join confirmations
    socket.on("joinedGroup", (data) => {
      console.log(`[GroupSocket] Joined group room: ${data.groupId}`);
    });

    socket.on("joinedUserRoom", (data) => {
      console.log(`[GroupSocket] Joined personal room: user:${data.userId}`);
    });

    socket.on("disconnect", (reason) => {
      console.log(
        "[useGroupSocket] Disconnected from groups WebSocket namespace. Reason:",
        reason,
      );
    });

    socket.on("connect_error", (error) => {
      console.error(
        "[useGroupSocket] Groups WebSocket connection error:",
        error,
      );
    });

    socket.on("addedToGroup", (data) => {
      console.log("[useGroupSocket] User added to group event received:", data);
      if (currentUser?.id) {
        console.log(
          "[useGroupSocket] Current user was added to a group, updating UI",
        );
        setTimeout(() => {
          useConversationsStore.getState().forceUpdate();
        }, 0);
      }
    });

    socket.on("groupCreated", (data) => {
      console.log("[useGroupSocket] Group created:", data);
      if (currentUser?.id) {
        console.log("[useGroupSocket] Updating UI to show new group");
        setTimeout(() => {
          useConversationsStore.getState().forceUpdate();
        }, 0);
      }
    });

    socket.on("groupUpdated", (data) => {
      console.log("[useGroupSocket] Group updated:", data);
      refreshAllGroupData();
    });

    socket.on("memberAdded", (data) => {
      console.log("[useGroupSocket] Member added to group:", data);

      const selectedGroup = useChatStore.getState().selectedGroup;
      if (selectedGroup && selectedGroup.id === data.groupId) {
        console.log(
          "[useGroupSocket] Refreshing selected group after member added",
        );
        refreshSelectedGroup();
      }
    });

    socket.on("memberRemoved", (data) => {
      console.log("[useGroupSocket] Member removed from group:", data);

      // Check if the current user was removed
      if (data.userId === currentUser?.id) {
        console.log("[useGroupSocket] Current user was removed from group");

        // If this is the currently selected group, clear it
        const selectedGroup = useChatStore.getState().selectedGroup;
        if (selectedGroup && selectedGroup.id === data.groupId) {
          useChatStore.getState().setSelectedGroup(null);
        }

        // Remove the group from conversations
        useConversationsStore.getState().removeConversation(data.groupId);
      } else {
        // If another member was removed, refresh the group data
        refreshAllGroupData();
      }
    });

    socket.on("memberRoleUpdated", (data) => {
      console.log("[useGroupSocket] Member role updated:", data);
      refreshAllGroupData();
    });

    socket.on("groupDeleted", (data) => {
      console.log("[useGroupSocket] Group deleted:", data);

      // If this is the currently selected group, clear it
      const selectedGroup = useChatStore.getState().selectedGroup;
      if (selectedGroup && selectedGroup.id === data.groupId) {
        useChatStore.getState().setSelectedGroup(null);
      }

      // Remove the group from conversations
      useConversationsStore.getState().removeConversation(data.groupId);
    });

    socket.on("removedFromGroup", (data) => {
      console.log("[useGroupSocket] Removed from group event received:", data);

      // If this is the currently selected group, clear it
      const selectedGroup = useChatStore.getState().selectedGroup;
      if (selectedGroup && selectedGroup.id === data.groupId) {
        useChatStore.getState().setSelectedGroup(null);
      }

      // Remove the group from conversations
      useConversationsStore.getState().removeConversation(data.groupId);
    });

    socket.on("updateGroupList", (data) => {
      console.log("[useGroupSocket] Update group list event received:", data);

      if (data.action === "removed_from_group" && data.groupId) {
        console.log(
          `[useGroupSocket] Leaving group room: group:${data.groupId} via updateGroupList`,
        );
        socket.emit("leaveGroup", {
          groupId: data.groupId,
          userId: currentUser?.id,
        });
      } else if (data.action === "added_to_group") {
        console.log(`[useGroupSocket] User was added to a group, updating UI`);
        setTimeout(() => {
          useConversationsStore.getState().forceUpdate();
        }, 0);
      }
    });

    socket.on("forceUpdateConversations", (data) => {
      console.log(
        "[useGroupSocket] Received forceUpdateConversations event:",
        data,
      );

      setTimeout(() => {
        useConversationsStore.getState().forceUpdate();
      }, 0);

      if (data && data.groupId) {
        const selectedGroup = useChatStore.getState().selectedGroup;
        if (selectedGroup && selectedGroup.id === data.groupId) {
          console.log(
            `[useGroupSocket] Clearing selected group ${data.groupId} via forceUpdateConversations`,
          );
          useChatStore.getState().setSelectedGroup(null);
        }

        useChatStore.getState().clearChatCache("GROUP", data.groupId);
      }
    });

    socket.on("reload", () => {
      console.log(
        "[useGroupSocket] Received reload event from groups WebSocket, refreshing data...",
      );
      refreshAllGroupData();
    });

    socket.on("requestReload", () => {
      console.log(
        "[useGroupSocket] Received requestReload event, refreshing data...",
      );
      refreshAllGroupData();
    });

    socket.on("joinGroupSuccess", (data) => {
      console.log(
        `[useGroupSocket] Successfully joined group room: ${data.groupId}`,
      );
    });

    socket.on("joinGroupError", (data) => {
      console.error(
        `[useGroupSocket] Error joining group room: ${data.groupId}`,
        data.error,
      );
    });

    socket.on("connect", () => {
      setTimeout(() => {
        if (socket.connected) {
          console.log(
            "[useGroupSocket] Requesting server to broadcast reload to all clients",
          );
          socket.emit("broadcastReload");
        }
      }, 1000);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;

      // Clean up window reference
      if (typeof window !== "undefined" && window.groupSocket === socket) {
        window.groupSocket = null;
        console.log("[GroupSocket] Cleaned up window.groupSocket reference");
      }
    };
  }, [
    isAuthenticated,
    accessToken,
    currentUser,
    joinUserRoom,
    refreshSelectedGroup,
    refreshAllGroupData,
  ]);

  // Expose the socket and joinGroupRoom function
  return {
    socket: socketRef.current,
    joinGroupRoom,
    triggerGroupsReload,
  };
};

// Declare the window interface to include our socket and helper functions
declare global {
  interface Window {
    groupSocket: Socket | null;
    triggerGroupsReload?: () => void;
  }
}
