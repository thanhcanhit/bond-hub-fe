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

    console.log(
      `[useGroupSocket] Refreshing ${groupConversations.length} group conversations`,
    );

    for (const conv of groupConversations) {
      if (conv.group?.id) {
        try {
          console.log(`[useGroupSocket] Refreshing group ${conv.group.id}`);
          const result = await getGroupById(conv.group.id);
          if (result.success && result.group) {
            console.log(
              `[useGroupSocket] Successfully refreshed group ${conv.group.id}`,
            );
            // Update the conversation with new group data
            updateConversation(conv.group.id, {
              group: {
                ...conv.group,
                name: result.group.name,
                avatarUrl: result.group.avatarUrl,
                memberUsers: result.group.memberUsers,
                memberIds: result.group.memberIds, // Ensure member IDs are updated
              },
            });

            // Force UI update
            setTimeout(() => {
              useConversationsStore.getState().forceUpdate();
            }, 0);
          }
        } catch (error) {
          console.error(
            `[useGroupSocket] Error refreshing group ${conv.group.id}:`,
            error,
          );
        }
      }
    }

    // Trigger a global event to notify all components about the data refresh
    if (typeof window !== "undefined" && window.triggerGroupsReload) {
      console.log(
        "[useGroupSocket] Triggering global group reload event after refreshAllGroupData",
      );
      setTimeout(() => {
        window.triggerGroupsReload?.();
      }, 100);
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

  // Polling interval for conversation updates (in milliseconds) - DISABLED
  // const POLLING_INTERVAL = 10000; // 10 seconds

  // Set up polling for conversation updates - DISABLED to prevent frequent reloading
  // useEffect(() => {
  //   // Only set up polling if user is authenticated
  //   if (!isAuthenticated || !currentUser?.id) {
  //     return;
  //   }

  //   console.log(
  //     `[useGroupSocket] Setting up polling for conversation updates every ${POLLING_INTERVAL}ms`,
  //   );

  //   // Function to poll for conversation updates
  //   const pollConversations = () => {
  //     console.log("[useGroupSocket] Polling for conversation updates");
  //     useConversationsStore.getState().loadConversations(currentUser.id);
  //   };

  //   // Set up interval for polling
  //   const intervalId = setInterval(pollConversations, POLLING_INTERVAL);

  //   // Clean up interval on unmount
  //   return () => {
  //     console.log("[useGroupSocket] Cleaning up polling interval");
  //     clearInterval(intervalId);
  //   };
  // }, [isAuthenticated, currentUser]);

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
          "[useGroupSocket] Current user was added to a group, updating UI",
        );
        // Không cần gọi loadConversations, chỉ cần forceUpdate để cập nhật UI
        setTimeout(() => {
          useConversationsStore.getState().forceUpdate();
        }, 0);

        // Đã tắt toast thông báo khi được thêm vào nhóm
        // toast.success(`Bạn đã được thêm vào nhóm ${data.group?.name || "mới"}`);
      }
    });

    socket.on("groupCreated", (data) => {
      console.log("[useGroupSocket] Group created:", data);
      // When a group is created, we need to update the UI
      if (currentUser?.id) {
        console.log("[useGroupSocket] Updating UI to show new group");
        // Không cần gọi loadConversations, chỉ cần forceUpdate để cập nhật UI
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

      // Immediately update the selected group if this is the currently selected group
      const selectedGroup = useChatStore.getState().selectedGroup;
      if (selectedGroup && selectedGroup.id === data.groupId) {
        console.log(
          "[useGroupSocket] Refreshing selected group after member added",
        );

        // Refresh from API to get the new member's details
        useChatStore.getState().refreshSelectedGroup();

        // Wait a bit for the refresh to complete
        setTimeout(() => {
          const updatedGroup = useChatStore.getState().selectedGroup;
          if (updatedGroup) {
            console.log(
              "[useGroupSocket] Successfully refreshed group with new member",
            );
            console.log(
              "[useGroupSocket] New members count:",
              updatedGroup.members?.length || 0,
            );

            // Force UI update
            useConversationsStore.getState().forceUpdate();

            // Trigger a global event to notify all components about the member change
            if (typeof window !== "undefined" && window.triggerGroupsReload) {
              console.log(
                "[useGroupSocket] Triggering global group reload event after member added",
              );
              window.triggerGroupsReload();
            }
          }
        }, 100);
      } else {
        // When a member is added to a group that's not currently selected, refresh all group data
        refreshAllGroupData();

        // Trigger a global event to notify all components about the member change
        if (typeof window !== "undefined" && window.triggerGroupsReload) {
          console.log(
            "[useGroupSocket] Triggering global group reload event for member added",
          );
          window.triggerGroupsReload();
        }
      }
    });

    socket.on("memberRemoved", (data) => {
      console.log("[useGroupSocket] Member removed from group:", data);

      // Immediately update the selected group if this is the currently selected group
      const selectedGroup = useChatStore.getState().selectedGroup;
      if (selectedGroup && selectedGroup.id === data.groupId) {
        console.log(
          "[useGroupSocket] Refreshing selected group after member removed",
        );

        // Immediately update the members list in the selected group
        if (selectedGroup.members) {
          console.log(
            "[useGroupSocket] Current members count:",
            selectedGroup.members.length,
          );

          // Filter out the removed member
          const updatedMembers = selectedGroup.members.filter(
            (member) => member.userId !== data.userId,
          );
          console.log(
            "[useGroupSocket] Updated members count:",
            updatedMembers.length,
          );

          // Update the selected group with the new members list
          if (updatedMembers.length !== selectedGroup.members.length) {
            console.log(
              "[useGroupSocket] Updating selected group members list",
            );
            selectedGroup.members = updatedMembers;

            // Update the selected group in the store
            useChatStore.getState().setSelectedGroup({ ...selectedGroup });
          }
        }

        // Also refresh from API to ensure we have the latest data
        useChatStore.getState().refreshSelectedGroup();
      }

      // Refresh all group data
      refreshAllGroupData();

      // Trigger a global event to notify all components about the member change
      if (typeof window !== "undefined" && window.triggerGroupsReload) {
        console.log(
          "[useGroupSocket] Triggering global group reload event for member removed",
        );
        window.triggerGroupsReload();
      }
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

        // Đảm bảo UI được cập nhật ngay lập tức
        setTimeout(() => {
          console.log(
            `[useGroupSocket] Forcing UI update after removal from group ${data.groupId}`,
          );
          conversationsStore.forceUpdate();
        }, 0);

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
    // Chỉ xử lý việc rời khỏi phòng nhóm, phần xử lý chính được thực hiện trong GroupSocketHandler
    socket.on("groupDissolved", (data) => {
      console.log("[useGroupSocket] Group dissolved event received:", data);

      // Chỉ xử lý việc rời khỏi phòng nhóm
      if (data && data.groupId) {
        // Leave the group room to stop receiving messages
        console.log(
          `[useGroupSocket] Leaving group room: group:${data.groupId} via groupDissolved`,
        );
        socket.emit("leaveGroup", {
          groupId: data.groupId,
          userId: currentUser?.id,
        });
      }
    });

    // For backward compatibility
    // Chỉ xử lý việc rời khỏi phòng nhóm, phần xử lý chính được thực hiện trong GroupSocketHandler
    socket.on("groupDeleted", (data) => {
      console.log(
        "[useGroupSocket] Group deleted (legacy event) received:",
        data,
      );

      // Chỉ xử lý việc rời khỏi phòng nhóm
      if (data && data.groupId) {
        // Leave the group room to stop receiving messages
        console.log(
          `[useGroupSocket] Leaving group room: group:${data.groupId} via groupDeleted`,
        );
        socket.emit("leaveGroup", {
          groupId: data.groupId,
          userId: currentUser?.id,
        });
      }
    });

    // Listen for updateGroupList event
    // Chỉ xử lý việc rời khỏi phòng nhóm và tải lại danh sách cuộc trò chuyện khi được thêm vào nhóm mới
    socket.on("updateGroupList", (data) => {
      console.log("[useGroupSocket] Update group list event received:", data);

      if (data.action === "removed_from_group" && data.groupId) {
        // Chỉ xử lý việc rời khỏi phòng nhóm
        console.log(
          `[useGroupSocket] Leaving group room: group:${data.groupId} via updateGroupList`,
        );
        socket.emit("leaveGroup", {
          groupId: data.groupId,
          userId: currentUser?.id,
        });
      } else if (data.action === "added_to_group") {
        // Cập nhật UI để hiển thị nhóm mới
        console.log(`[useGroupSocket] User was added to a group, updating UI`);
        setTimeout(() => {
          useConversationsStore.getState().forceUpdate();
        }, 0);
      }
    });

    // Listen for updateConversationList event
    // Chỉ xử lý việc rời khỏi phòng nhóm, phần xử lý chính được thực hiện trong GroupSocketHandler
    socket.on("updateConversationList", (data) => {
      console.log(
        "[useGroupSocket] Update conversation list event received:",
        data,
      );

      if (data.action === "group_dissolved" && data.groupId) {
        // Chỉ xử lý việc rời khỏi phòng nhóm
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
        // Chỉ xử lý việc rời khỏi phòng nhóm
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
    // Chỉ xử lý việc rời khỏi phòng nhóm, phần xử lý chính được thực hiện trong GroupSocketHandler
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

        // Chỉ xử lý việc rời khỏi phòng nhóm
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

          // Leave the group room to stop receiving messages
          console.log(
            `[useGroupSocket] Leaving group room: group:${groupId} via directUserEvent`,
          );
          socket.emit("leaveGroup", { groupId, userId: currentUser?.id });
        }
      }
    });

    // Handle forceUpdateConversations event
    // Chỉ xử lý việc cập nhật UI, không gọi loadConversations
    socket.on("forceUpdateConversations", (data) => {
      console.log(
        "[useGroupSocket] Received forceUpdateConversations event:",
        data,
      );

      // Force UI update
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
