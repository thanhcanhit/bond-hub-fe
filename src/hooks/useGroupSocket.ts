import { useEffect, useRef, useCallback } from "react";
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
  const refreshAllGroupData = useCallback(async () => {
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
  }, [conversations, refreshSelectedGroup, updateConversation]);

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

  // Polling interval for conversation updates (in milliseconds)
  const POLLING_INTERVAL = 10000; // 10 seconds

  // Set up polling for conversation updates
  useEffect(() => {
    // Only set up polling if user is authenticated
    if (!isAuthenticated || !currentUser?.id) {
      return;
    }

    console.log(
      `[useGroupSocket] Setting up polling for conversation updates every ${POLLING_INTERVAL}ms`,
    );

    // Function to poll for conversation updates
    const pollConversations = () => {
      console.log("[useGroupSocket] Polling for conversation updates");
      useConversationsStore.getState().loadConversations(currentUser.id);
    };

    // Set up interval for polling
    const intervalId = setInterval(pollConversations, POLLING_INTERVAL);

    // Clean up interval on unmount
    return () => {
      console.log("[useGroupSocket] Cleaning up polling interval");
      clearInterval(intervalId);
    };
  }, [isAuthenticated, currentUser]);

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

      // Join user's personal room
      console.log(
        `[useGroupSocket] Joining personal room: user:${currentUser.id}`,
      );
      socket.emit("joinUserRoom", { userId: currentUser.id });

      // Also join using socket.io room functionality directly
      console.log(
        `[useGroupSocket] Joining socket.io room: user:${currentUser.id}`,
      );
      socket.emit("join", { room: `user:${currentUser.id}` });

      // Register user socket with backend
      console.log(
        `[useGroupSocket] Registering socket for user: ${currentUser.id}`,
      );
      socket.emit("registerUserSocket", { userId: currentUser.id });

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

    // Listen for removedFromGroup event (when current user is removed from a group)
    socket.on("removedFromGroup", (data) => {
      console.log(
        "[useGroupSocket] User removed from group event received:",
        data,
      );
      console.log(
        "[useGroupSocket] Removed from group data type:",
        typeof data,
      );
      console.log(
        "[useGroupSocket] Removed from group data keys:",
        Object.keys(data),
      );

      // Make sure we have a groupId
      if (data && data.groupId) {
        console.log(
          `[useGroupSocket] Processing removal from group ${data.groupId}`,
        );

        // Nếu đang xem nhóm này, chuyển về trạng thái không chọn nhóm
        const selectedGroup = useChatStore.getState().selectedGroup;
        if (selectedGroup && selectedGroup.id === data.groupId) {
          console.log(
            `[useGroupSocket] Currently selected group was left, clearing selection`,
          );
          useChatStore.getState().setSelectedGroup(null);
        }

        // Xóa tin nhắn của nhóm khỏi cache
        useChatStore.getState().clearChatCache("GROUP", data.groupId);

        // Hiển thị thông báo phù hợp
        const groupName = data.groupName || "chat";
        if (data.kicked) {
          toast.info(`Bạn đã bị xóa khỏi nhóm ${groupName}`);
        } else if (data.left) {
          toast.info(`Bạn đã rời khỏi nhóm ${groupName}`);
        } else {
          toast.info(`Bạn không còn là thành viên của nhóm ${groupName}`);
        }

        // Xóa nhóm khỏi danh sách cuộc trò chuyện
        const conversationsStore = useConversationsStore.getState();
        const removed = conversationsStore.checkAndRemoveGroups(
          data.groupId,
          groupName,
        );

        if (removed) {
          console.log(
            `[useGroupSocket] Successfully removed group ${data.groupId} from conversations`,
          );
        } else {
          console.log(
            `[useGroupSocket] Group ${data.groupId} not found in conversations`,
          );
        }

        // Tải lại danh sách cuộc trò chuyện sau một khoảng thời gian ngắn để đảm bảo UI được cập nhật
        if (currentUser?.id) {
          setTimeout(() => {
            console.log(
              `[useGroupSocket] Reloading conversations after removal from group ${data.groupId}`,
            );
            conversationsStore.loadConversations(currentUser.id);
          }, 100);
        }

        // Leave the group room to stop receiving messages
        console.log(
          `[useGroupSocket] Leaving group room: group:${data.groupId}`,
        );
        socket.emit("leaveGroup", {
          groupId: data.groupId,
          userId: currentUser?.id,
        });
      } else {
        console.error(
          "[useGroupSocket] Invalid removedFromGroup event data:",
          data,
        );
      }
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

        // Nếu đang xem nhóm này, chuyển về trạng thái không chọn nhóm
        const selectedGroup = useChatStore.getState().selectedGroup;
        if (selectedGroup && selectedGroup.id === data.groupId) {
          console.log(
            `[useGroupSocket] Currently selected group was dissolved, clearing selection`,
          );
          useChatStore.getState().setSelectedGroup(null);
        }

        // Xóa tin nhắn của nhóm khỏi cache
        useChatStore.getState().clearChatCache("GROUP", data.groupId);
        console.log(
          `[useGroupSocket] Cleared chat cache for dissolved group ${data.groupId}`,
        );

        // Hiển thị thông báo
        const groupName = data.groupName || "chat";
        toast.info(`Nhóm ${groupName} đã bị giải tán`);

        // Xóa nhóm khỏi danh sách cuộc trò chuyện
        const conversationsStore = useConversationsStore.getState();
        const removed = conversationsStore.checkAndRemoveGroups(
          data.groupId,
          groupName,
        );

        if (removed) {
          console.log(
            `[useGroupSocket] Successfully removed dissolved group ${data.groupId} from conversations`,
          );
        } else {
          console.log(
            `[useGroupSocket] Dissolved group ${data.groupId} not found in conversations`,
          );
        }

        // Tải lại danh sách cuộc trò chuyện sau một khoảng thời gian ngắn để đảm bảo UI được cập nhật
        if (currentUser?.id) {
          setTimeout(() => {
            console.log(
              `[useGroupSocket] Reloading conversations after group dissolution ${data.groupId}`,
            );
            conversationsStore.loadConversations(currentUser.id);
          }, 100);
        }

        // Leave the group room to stop receiving messages
        console.log(
          `[useGroupSocket] Leaving group room: group:${data.groupId} via groupDissolved`,
        );
        socket.emit("leaveGroup", {
          groupId: data.groupId,
          userId: currentUser?.id,
        });
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

        // Nếu đang xem nhóm này, chuyển về trạng thái không chọn nhóm
        const selectedGroup = useChatStore.getState().selectedGroup;
        if (selectedGroup && selectedGroup.id === data.groupId) {
          console.log(
            `[useGroupSocket] Currently selected group was deleted, clearing selection`,
          );
          useChatStore.getState().setSelectedGroup(null);
        }

        // Xóa tin nhắn của nhóm khỏi cache
        useChatStore.getState().clearChatCache("GROUP", data.groupId);
        console.log(
          `[useGroupSocket] Cleared chat cache for deleted group ${data.groupId}`,
        );

        // Hiển thị thông báo
        const groupName = data.groupName || "chat";
        toast.info(`Nhóm ${groupName} đã bị xóa`);

        // Xóa nhóm khỏi danh sách cuộc trò chuyện
        const conversationsStore = useConversationsStore.getState();
        const removed = conversationsStore.checkAndRemoveGroups(
          data.groupId,
          groupName,
        );

        if (removed) {
          console.log(
            `[useGroupSocket] Successfully removed deleted group ${data.groupId} from conversations`,
          );
        } else {
          console.log(
            `[useGroupSocket] Deleted group ${data.groupId} not found in conversations`,
          );
        }

        // Tải lại danh sách cuộc trò chuyện sau một khoảng thời gian ngắn để đảm bảo UI được cập nhật
        if (currentUser?.id) {
          setTimeout(() => {
            console.log(
              `[useGroupSocket] Reloading conversations after group deletion ${data.groupId}`,
            );
            conversationsStore.loadConversations(currentUser.id);
          }, 100);
        }

        // Leave the group room to stop receiving messages
        console.log(
          `[useGroupSocket] Leaving group room: group:${data.groupId} via groupDeleted`,
        );
        socket.emit("leaveGroup", {
          groupId: data.groupId,
          userId: currentUser?.id,
        });
      } else {
        console.error(
          "[useGroupSocket] Invalid groupDeleted event data:",
          data,
        );
      }
    });

    // Listen for updateGroupList event
    socket.on("updateGroupList", (data) => {
      console.log("[useGroupSocket] Update group list event received:", data);

      if (data.action === "removed_from_group" && data.groupId) {
        console.log(
          `[useGroupSocket] User was removed from group ${data.groupId}, updating group list`,
        );

        // Nếu đang xem nhóm này, chuyển về trạng thái không chọn nhóm
        const selectedGroup = useChatStore.getState().selectedGroup;
        if (selectedGroup && selectedGroup.id === data.groupId) {
          console.log(
            `[useGroupSocket] Clearing selected group ${data.groupId} via updateGroupList`,
          );
          useChatStore.getState().setSelectedGroup(null);
        }

        // Xóa tin nhắn của nhóm khỏi cache
        useChatStore.getState().clearChatCache("GROUP", data.groupId);
        console.log(
          `[useGroupSocket] Cleared chat cache for group ${data.groupId} via updateGroupList`,
        );

        // Hiển thị thông báo
        toast.info(`Bạn đã bị xóa khỏi một nhóm`);

        // Xóa nhóm khỏi danh sách cuộc trò chuyện
        const conversationsStore = useConversationsStore.getState();
        const removed = conversationsStore.checkAndRemoveGroups(data.groupId);

        if (removed) {
          console.log(
            `[useGroupSocket] Successfully removed group ${data.groupId} from conversations via updateGroupList`,
          );
        } else {
          console.log(
            `[useGroupSocket] Group ${data.groupId} not found in conversations via updateGroupList`,
          );
        }

        // Tải lại danh sách cuộc trò chuyện sau một khoảng thời gian ngắn để đảm bảo UI được cập nhật
        if (currentUser?.id) {
          setTimeout(() => {
            console.log(
              `[useGroupSocket] Reloading conversations after removal from group ${data.groupId} via updateGroupList`,
            );
            conversationsStore.loadConversations(currentUser.id);
          }, 100);
        }

        // Leave the group room to stop receiving messages
        console.log(
          `[useGroupSocket] Leaving group room: group:${data.groupId} via updateGroupList`,
        );
        socket.emit("leaveGroup", {
          groupId: data.groupId,
          userId: currentUser?.id,
        });
      } else if (data.action === "added_to_group") {
        // Tải lại danh sách cuộc trò chuyện để lấy nhóm mới
        if (currentUser?.id) {
          console.log(
            `[useGroupSocket] User was added to a group, reloading conversations`,
          );
          useConversationsStore.getState().loadConversations(currentUser.id);
        }
      }
    });

    // Listen for updateConversationList event
    socket.on("updateConversationList", (data) => {
      console.log(
        "[useGroupSocket] Update conversation list event received:",
        data,
      );

      if (data.action === "group_dissolved" && data.groupId) {
        console.log(
          `[useGroupSocket] Group ${data.groupId} was dissolved, updating conversation list`,
        );

        // Nếu đang xem nhóm này, chuyển về trạng thái không chọn nhóm
        const selectedGroup = useChatStore.getState().selectedGroup;
        if (selectedGroup && selectedGroup.id === data.groupId) {
          console.log(
            `[useGroupSocket] Clearing selected dissolved group ${data.groupId}`,
          );
          useChatStore.getState().setSelectedGroup(null);
        }

        // Xóa tin nhắn của nhóm khỏi cache
        useChatStore.getState().clearChatCache("GROUP", data.groupId);
        console.log(
          `[useGroupSocket] Cleared chat cache for dissolved group ${data.groupId}`,
        );

        // Hiển thị thông báo
        const groupName = data.groupName || "chat";
        toast.info(`Nhóm ${groupName} đã bị giải tán`);

        // Xóa nhóm khỏi danh sách cuộc trò chuyện
        const conversationsStore = useConversationsStore.getState();
        const removed = conversationsStore.checkAndRemoveGroups(
          data.groupId,
          groupName,
        );

        if (removed) {
          console.log(
            `[useGroupSocket] Successfully removed dissolved group ${data.groupId} from conversations via updateConversationList`,
          );
        } else {
          console.log(
            `[useGroupSocket] Dissolved group ${data.groupId} not found in conversations via updateConversationList`,
          );
        }

        // Tải lại danh sách cuộc trò chuyện sau một khoảng thời gian ngắn để đảm bảo UI được cập nhật
        if (currentUser?.id) {
          setTimeout(() => {
            console.log(
              `[useGroupSocket] Reloading conversations after group dissolution ${data.groupId} via updateConversationList`,
            );
            conversationsStore.loadConversations(currentUser.id);
          }, 100);
        }

        // Leave the group room to stop receiving messages
        console.log(
          `[useGroupSocket] Leaving group room: group:${data.groupId} via updateConversationList`,
        );
        socket.emit("leaveGroup", {
          groupId: data.groupId,
          userId: currentUser?.id,
        });
      } else if (
        data.action === "member_removed" &&
        data.userId === currentUser?.id
      ) {
        console.log(
          `[useGroupSocket] Current user was removed from group ${data.groupId}, updating conversation list via updateConversationList`,
        );

        // Nếu đang xem nhóm này, chuyển về trạng thái không chọn nhóm
        const selectedGroup = useChatStore.getState().selectedGroup;
        if (selectedGroup && selectedGroup.id === data.groupId) {
          console.log(
            `[useGroupSocket] Clearing selected group ${data.groupId} via updateConversationList`,
          );
          useChatStore.getState().setSelectedGroup(null);
        }

        // Xóa tin nhắn của nhóm khỏi cache
        useChatStore.getState().clearChatCache("GROUP", data.groupId);
        console.log(
          `[useGroupSocket] Cleared chat cache for group ${data.groupId} via updateConversationList`,
        );

        // Hiển thị thông báo
        const groupName = data.groupName || "chat";
        toast.info(`Bạn đã bị xóa khỏi nhóm ${groupName}`);

        // Xóa nhóm khỏi danh sách cuộc trò chuyện
        const conversationsStore = useConversationsStore.getState();
        const removed = conversationsStore.checkAndRemoveGroups(
          data.groupId,
          groupName,
        );

        if (removed) {
          console.log(
            `[useGroupSocket] Successfully removed group ${data.groupId} from conversations via updateConversationList`,
          );
        } else {
          console.log(
            `[useGroupSocket] Group ${data.groupId} not found in conversations via updateConversationList`,
          );
        }

        // Tải lại danh sách cuộc trò chuyện sau một khoảng thời gian ngắn để đảm bảo UI được cập nhật
        if (currentUser?.id) {
          setTimeout(() => {
            console.log(
              `[useGroupSocket] Reloading conversations after removal from group ${data.groupId} via updateConversationList`,
            );
            conversationsStore.loadConversations(currentUser.id);
          }, 100);
        }

        // Leave the group room to stop receiving messages
        console.log(
          `[useGroupSocket] Leaving group room: group:${data.groupId} via updateConversationList`,
        );
        socket.emit("leaveGroup", {
          groupId: data.groupId,
          userId: currentUser?.id,
        });
      }
    });

    // Handle direct user events
    socket.on("directUserEvent", (data) => {
      console.log("[useGroupSocket] Direct user event received:", data);

      if (
        data &&
        data.targetUserId === currentUser?.id &&
        data.eventName &&
        data.eventData
      ) {
        console.log(
          `[useGroupSocket] Processing direct event ${data.eventName} for current user`,
        );

        // Directly process the event data without using handlers
        if (
          data.eventName === "removedFromGroup" ||
          (data.eventName === "updateGroupList" &&
            data.eventData.action === "removed_from_group") ||
          (data.eventName === "updateConversationList" &&
            data.eventData.action === "member_removed")
        ) {
          // Extract common data
          const eventData = data.eventData as Record<string, unknown>;
          const groupId = eventData.groupId as string;
          const groupName = (eventData.groupName as string) || "chat";

          console.log(
            `[useGroupSocket] Processing removal from group ${groupId} via directUserEvent`,
          );

          // Force immediate removal of the group from conversations
          const conversationsStore = useConversationsStore.getState();

          // If this is the currently selected group, clear selection
          const selectedGroup = useChatStore.getState().selectedGroup;
          if (selectedGroup && selectedGroup.id === groupId) {
            console.log(
              `[useGroupSocket] Clearing selected group ${groupId} via directUserEvent`,
            );
            useChatStore.getState().setSelectedGroup(null);
          }

          // Clear chat messages for this group
          useChatStore.getState().clearChatCache("GROUP", groupId);
          console.log(
            `[useGroupSocket] Cleared chat cache for group ${groupId} via directUserEvent`,
          );

          // Show notification
          toast.info(`Bạn đã bị xóa khỏi nhóm ${groupName}`);

          // Use the checkAndRemoveGroups function to remove the group from conversations
          const removed = conversationsStore.checkAndRemoveGroups(
            groupId,
            groupName,
          );

          if (removed) {
            console.log(
              `[useGroupSocket] Successfully removed group ${groupId} from conversations via directUserEvent`,
            );
          } else {
            console.log(
              `[useGroupSocket] Group ${groupId} not found in conversations via directUserEvent`,
            );
          }

          // Reload conversations after a short delay to ensure UI is updated
          if (currentUser?.id) {
            setTimeout(() => {
              console.log(
                `[useGroupSocket] Reloading conversations after removal from group ${groupId} via directUserEvent`,
              );
              conversationsStore.loadConversations(currentUser.id);
            }, 100);
          }

          // Leave the group room to stop receiving messages
          console.log(
            `[useGroupSocket] Leaving group room: group:${groupId} via directUserEvent`,
          );
          socket.emit("leaveGroup", { groupId, userId: currentUser?.id });
        }
      }
    });

    // Handle forceUpdateConversations event
    socket.on("forceUpdateConversations", (data) => {
      console.log(
        "[useGroupSocket] Received forceUpdateConversations event:",
        data,
      );

      // Force reload conversations immediately
      if (currentUser?.id) {
        console.log(
          "[useGroupSocket] Forcing immediate reload of conversations",
        );
        useConversationsStore.getState().loadConversations(currentUser.id);

        // Also force UI update
        setTimeout(() => {
          useConversationsStore.getState().forceUpdate();
        }, 0);

        // If this is related to a group removal, check if we need to clear selection
        if (data && data.groupId) {
          const selectedGroup = useChatStore.getState().selectedGroup;
          if (selectedGroup && selectedGroup.id === data.groupId) {
            console.log(
              `[useGroupSocket] Clearing selected group ${data.groupId} via forceUpdateConversations`,
            );
            useChatStore.getState().setSelectedGroup(null);
          }

          // Clear chat messages for this group
          useChatStore.getState().clearChatCache("GROUP", data.groupId);
        }
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
        socket.off("removedFromGroup");
        socket.off("roleChanged");
        socket.off("avatarUpdated");
        socket.off("groupDissolved");
        socket.off("updateGroupList");
        socket.off("updateConversationList");
        socket.off("directUserEvent");
        socket.off("forceUpdateConversations");

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
    conversations,
    refreshAllGroupData,
  ]);

  return socketRef.current;
};
