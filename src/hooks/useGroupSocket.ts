import { useEffect, useRef } from "react";
import { Socket, io } from "socket.io-client";
import { useAuthStore } from "@/stores/authStore";
import { useChatStore } from "@/stores/chatStore";
import { useConversationsStore } from "@/stores/conversationsStore";
import { getGroupById } from "@/actions/group.action";
import { toast } from "sonner";

/**
 * Hook to connect to the groups WebSocket namespace and handle group events
 */
export const useGroupSocket = () => {
  // Store socket in a ref to maintain it across renders
  const socketRef = useRef<Socket | null>(null);

  // Get auth state
  const { isAuthenticated, accessToken, user: currentUser } = useAuthStore();

  // Get store methods for updating group data
  const refreshSelectedGroup = useChatStore(
    (state) => state.refreshSelectedGroup,
  );
  const updateConversation = useConversationsStore(
    (state) => state.updateConversation,
  );
  const conversations = useConversationsStore((state) => state.conversations);

  // Function to refresh all group data
  const refreshAllGroupData = async () => {
    console.log("[useGroupSocket] Refreshing all group data");

    // Refresh the currently selected group if any
    await refreshSelectedGroup();

    // Refresh all group conversations
    const groupConversations = conversations.filter(
      (conv) => conv.type === "GROUP",
    );

    for (const conv of groupConversations) {
      if (conv.group?.id) {
        try {
          const result = await getGroupById(conv.group.id);
          if (result.success && result.group) {
            // Update the conversation with new group data
            updateConversation(conv.group.id, {
              group: {
                ...conv.group,
                name: result.group.name,
                avatarUrl: result.group.avatarUrl,
                memberUsers: result.group.memberUsers,
              },
            });
          }
        } catch (error) {
          console.error(
            `[useGroupSocket] Error refreshing group ${conv.group.id}:`,
            error,
          );
        }
      }
    }
  };

  // Function to manually trigger a reload of all groups
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

  // Expose the triggerGroupsReload function to window for debugging
  if (typeof window !== "undefined") {
    window.triggerGroupsReload = triggerGroupsReload;
  }

  useEffect(() => {
    // Only connect if user is authenticated and has a token
    if (!isAuthenticated || !accessToken || !currentUser) {
      return;
    }

    // Create socket connection to the groups namespace
    const socket = io(
      `${process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3000"}/groups`,
      {
        auth: { token: accessToken },
        transports: ["websocket"],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        query: {
          userId: currentUser?.id, // Send user ID to help backend track user sockets
        },
      },
    );

    // Store socket in ref and window object for access from action functions
    socketRef.current = socket;

    // Store in window object for access from action functions
    if (typeof window !== "undefined") {
      window.groupSocket = socket;
    }

    // Connection events
    socket.on("connect", () => {
      console.log(
        "[useGroupSocket] Connected to groups WebSocket namespace with ID:",
        socket.id,
      );

      // Debug: Theo dõi tất cả các event
      socket.onAny((event, ...args) => {
        console.log(`[useGroupSocket] Event received: ${event}`, args);
      });

      // Join rooms for all groups the user is a member of
      joinGroupRooms(socket, currentUser.id);
    });

    // Helper function to join all group rooms
    const joinGroupRooms = async (socket: Socket, userId: string) => {
      try {
        // Get all groups the user is a member of
        const groupConversations = conversations.filter(
          (conv) => conv.type === "GROUP",
        );

        console.log(
          `[useGroupSocket] Joining ${groupConversations.length} group rooms`,
        );

        // Join each group room
        for (const conv of groupConversations) {
          if (conv.group?.id) {
            console.log(
              `[useGroupSocket] Joining group room: group:${conv.group.id}`,
            );
            socket.emit("joinGroup", { groupId: conv.group.id, userId });
          }
        }
      } catch (error) {
        console.error("[useGroupSocket] Error joining group rooms:", error);
      }
    };

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

    // Listen for group events - match backend event names
    socket.on("addedToGroup", (data) => {
      console.log("[useGroupSocket] User added to group event received:", data);
      // This event is sent directly to the user when they are added to a group
      if (currentUser?.id) {
        console.log(
          "[useGroupSocket] Current user was added to a group, reloading conversations",
        );
        useConversationsStore.getState().loadConversations(currentUser.id);

        // Show a toast notification
        toast.success(`Bạn đã được thêm vào nhóm ${data.group?.name || "mới"}`);
      }
    });

    socket.on("groupCreated", (data) => {
      console.log("[useGroupSocket] Group created:", data);
      // When a group is created, we need to load the user's conversations to get the new group
      if (currentUser?.id) {
        console.log(
          "[useGroupSocket] Reloading conversations to get new group",
        );
        useConversationsStore.getState().loadConversations(currentUser.id);
      }
    });

    socket.on("groupUpdated", (data) => {
      console.log("[useGroupSocket] Group updated:", data);
      refreshAllGroupData();
    });

    socket.on("memberAdded", (data) => {
      console.log("[useGroupSocket] Member added to group:", data);
      // When a member is added to a group, refresh the group data
      // The addedToGroup event will handle adding the group to the conversation list
      refreshAllGroupData();
    });

    socket.on("memberRemoved", (data) => {
      console.log("[useGroupSocket] Member removed from group:", data);
      refreshAllGroupData();
    });

    // Backend uses roleChanged instead of memberRoleUpdated
    socket.on("roleChanged", (data) => {
      console.log("[useGroupSocket] Member role changed:", data);
      refreshAllGroupData();
    });

    // Backend uses avatarUpdated instead of groupAvatarUpdated
    socket.on("avatarUpdated", (data) => {
      console.log("[useGroupSocket] Group avatar updated:", data);
      refreshAllGroupData();
    });

    // For backward compatibility, still listen to our original event names
    socket.on("memberRoleUpdated", (data) => {
      console.log("[useGroupSocket] Member role updated (legacy event):", data);
      refreshAllGroupData();
    });

    socket.on("groupAvatarUpdated", (data) => {
      console.log(
        "[useGroupSocket] Group avatar updated (legacy event):",
        data,
      );
      refreshAllGroupData();
    });

    socket.on("groupNameUpdated", (data) => {
      console.log("[useGroupSocket] Group name updated (legacy event):", data);
      refreshAllGroupData();
    });

    // Backend uses groupDissolved instead of groupDeleted
    socket.on("groupDissolved", (data) => {
      console.log("[useGroupSocket] Group dissolved event received:", data);
      console.log("[useGroupSocket] Group dissolved data type:", typeof data);
      console.log(
        "[useGroupSocket] Group dissolved data keys:",
        Object.keys(data),
      );

      // Xóa nhóm khỏi danh sách cuộc trò chuyện
      if (data && data.groupId) {
        console.log(
          `[useGroupSocket] Removing dissolved group ${data.groupId} from conversations`,
        );

        // Kiểm tra xem nhóm có tồn tại trong danh sách cuộc trò chuyện không
        const conversations = useConversationsStore.getState().conversations;
        const groupExists = conversations.some(
          (conv) => conv.type === "GROUP" && conv.group?.id === data.groupId,
        );

        console.log(
          `[useGroupSocket] Group ${data.groupId} exists in conversations: ${groupExists}`,
        );

        if (groupExists) {
          // Xóa nhóm khỏi danh sách cuộc trò chuyện
          useConversationsStore.getState().removeConversation(data.groupId);
          console.log(
            `[useGroupSocket] Group ${data.groupId} removed from conversations`,
          );

          // Nếu đang xem nhóm này, chuyển về trạng thái không chọn nhóm
          const selectedGroup = useChatStore.getState().selectedGroup;
          if (selectedGroup && selectedGroup.id === data.groupId) {
            console.log(
              `[useGroupSocket] Currently selected group was dissolved, clearing selection`,
            );
            useChatStore.getState().setSelectedGroup(null);
          }

          // Hiển thị thông báo
          const groupName = data.groupName || "chat";
          toast.info(`Nhóm ${groupName} đã bị giải tán`);
        } else {
          console.log(
            `[useGroupSocket] Group ${data.groupId} not found in conversations, nothing to remove`,
          );
        }
      } else {
        console.error(
          "[useGroupSocket] Invalid groupDissolved event data:",
          data,
        );
      }
    });

    // For backward compatibility
    socket.on("groupDeleted", (data) => {
      console.log(
        "[useGroupSocket] Group deleted (legacy event) received:",
        data,
      );
      console.log("[useGroupSocket] Group deleted data type:", typeof data);
      console.log(
        "[useGroupSocket] Group deleted data keys:",
        Object.keys(data),
      );

      // Xử lý giống như groupDissolved
      if (data && data.groupId) {
        console.log(
          `[useGroupSocket] Removing deleted group ${data.groupId} from conversations`,
        );

        // Kiểm tra xem nhóm có tồn tại trong danh sách cuộc trò chuyện không
        const conversations = useConversationsStore.getState().conversations;
        const groupExists = conversations.some(
          (conv) => conv.type === "GROUP" && conv.group?.id === data.groupId,
        );

        console.log(
          `[useGroupSocket] Group ${data.groupId} exists in conversations: ${groupExists}`,
        );

        if (groupExists) {
          // Xóa nhóm khỏi danh sách cuộc trò chuyện
          useConversationsStore.getState().removeConversation(data.groupId);
          console.log(
            `[useGroupSocket] Group ${data.groupId} removed from conversations`,
          );

          // Nếu đang xem nhóm này, chuyển về trạng thái không chọn nhóm
          const selectedGroup = useChatStore.getState().selectedGroup;
          if (selectedGroup && selectedGroup.id === data.groupId) {
            console.log(
              `[useGroupSocket] Currently selected group was deleted, clearing selection`,
            );
            useChatStore.getState().setSelectedGroup(null);
          }

          // Hiển thị thông báo
          const groupName = data.groupName || "chat";
          toast.info(`Nhóm ${groupName} đã bị xóa`);
        } else {
          console.log(
            `[useGroupSocket] Group ${data.groupId} not found in conversations, nothing to remove`,
          );
        }
      } else {
        console.error(
          "[useGroupSocket] Invalid groupDeleted event data:",
          data,
        );
      }
    });

    // Generic reload event
    socket.on("reload", () => {
      console.log(
        "[useGroupSocket] Received reload event from groups WebSocket, refreshing data...",
      );
      refreshAllGroupData();
    });

    // Handle request reload event
    socket.on("requestReload", () => {
      console.log(
        "[useGroupSocket] Received requestReload event, refreshing data...",
      );
      refreshAllGroupData();
    });

    // Handle joinGroup response
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

    // Send a request to server to broadcast reload to all clients
    socket.on("connect", () => {
      // Request server to broadcast reload to all clients after a short delay
      setTimeout(() => {
        if (socket.connected) {
          console.log(
            "[useGroupSocket] Requesting server to broadcast reload to all clients",
          );
          socket.emit("broadcastReload");
        }
      }, 1000);
    });

    // Cleanup on unmount
    return () => {
      if (socket) {
        console.log("[useGroupSocket] Cleaning up groups WebSocket connection");
        socket.off("addedToGroup");
        socket.off("groupCreated");
        socket.off("groupUpdated");
        socket.off("memberAdded");
        socket.off("memberRemoved");
        socket.off("roleChanged");
        socket.off("avatarUpdated");
        socket.off("groupDissolved");

        // Legacy event names
        socket.off("memberRoleUpdated");
        socket.off("groupAvatarUpdated");
        socket.off("groupNameUpdated");
        socket.off("groupDeleted");

        // Utility events
        socket.off("reload");
        socket.off("requestReload");
        socket.off("broadcastReload");
        socket.off("joinGroupSuccess");
        socket.off("joinGroupError");
        socket.disconnect();
        socketRef.current = null;

        // Remove from window object
        if (typeof window !== "undefined") {
          window.groupSocket = null;
        }
      }
    };
  }, [
    accessToken,
    isAuthenticated,
    currentUser,
    refreshSelectedGroup,
    updateConversation,
  ]);

  return socketRef.current;
};
