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
  const socketRef = useRef<Socket | null>(null);
  const { isAuthenticated, accessToken, currentUser } = useAuthStore();

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
  const updateConversation = useConversationsStore(
    (state) => state.updateConversation,
  );
  const conversations = useConversationsStore((state) => state.conversations);

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
        // toast.success(`Bạn đã được thêm vào nhóm ${data.group?.name || "mới"}`);
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

        useChatStore.getState().refreshSelectedGroup();

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

            useConversationsStore.getState().forceUpdate();

            if (typeof window !== "undefined" && window.triggerGroupsReload) {
              console.log(
                "[useGroupSocket] Triggering global group reload event after member added",
              );
              window.triggerGroupsReload();
            }
          }
        }, 100);
      } else {
        refreshAllGroupData();

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
      const selectedGroup = useChatStore.getState().selectedGroup;
      if (selectedGroup && selectedGroup.id === data.groupId) {
        console.log(
          "[useGroupSocket] Refreshing selected group after member removed",
        );
        useChatStore.getState().refreshSelectedGroup();
        setTimeout(() => {
          const updatedGroup = useChatStore.getState().selectedGroup;
          if (updatedGroup) {
            console.log(
              "[useGroupSocket] Updated members count:",
              updatedGroup.members.length,
            );
          }
        }, 0);
      }
    });

    socket.on("groupDissolved", (data) => {
      console.log("[useGroupSocket] Group dissolved event received:", data);
      const selectedGroup = useChatStore.getState().selectedGroup;
      if (selectedGroup && selectedGroup.id === data.groupId) {
        console.log(
          `[useGroupSocket] Leaving group room: group:${data.groupId} via groupDissolved`,
        );
        socket.emit("leaveGroup", { groupId: data.groupId });
        useChatStore.getState().setSelectedGroup(null);
      }
    });

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

      if (data && data.groupId) {
        console.log(
          `[useGroupSocket] Processing removal from group ${data.groupId}`,
        );

        const selectedGroup = useChatStore.getState().selectedGroup;
        if (selectedGroup && selectedGroup.id === data.groupId) {
          console.log(
            `[useGroupSocket] Currently selected group was left, clearing selection`,
          );
          useChatStore.getState().setSelectedGroup(null);
        }

        useChatStore.getState().clearChatCache("GROUP", data.groupId);

        const groupName = data.groupName || "chat";
        if (data.kicked) {
          toast.info(`Bạn đã bị xóa khỏi nhóm ${groupName}`);
        } else if (data.left) {
          toast.info(`Bạn đã rời khỏi nhóm ${groupName}`);
        } else {
          toast.info(`Bạn không còn là thành viên của nhóm ${groupName}`);
        }

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

        setTimeout(() => {
          console.log(
            `[useGroupSocket] Forcing UI update after removal from group ${data.groupId}`,
          );
          conversationsStore.forceUpdate();
        }, 0);

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

    socket.on("roleChanged", (data) => {
      console.log("[useGroupSocket] Member role changed:", data);
      refreshAllGroupData();
    });

    socket.on("avatarUpdated", (data) => {
      console.log("[useGroupSocket] Group avatar updated:", data);
      refreshAllGroupData();
    });

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

    socket.on("groupDeleted", (data) => {
      console.log(
        "[useGroupSocket] Group deleted (legacy event) received:",
        data,
      );

      if (data && data.groupId) {
        console.log(
          `[useGroupSocket] Leaving group room: group:${data.groupId} via groupDeleted`,
        );
        socket.emit("leaveGroup", {
          groupId: data.groupId,
          userId: currentUser?.id,
        });
      }
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

    socket.on("updateConversationList", (data) => {
      console.log(
        "[useGroupSocket] Update conversation list event received:",
        data,
      );

      if (data.action === "group_dissolved" && data.groupId) {
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
          `[useGroupSocket] Leaving group room: group:${data.groupId} via updateConversationList`,
        );
        socket.emit("leaveGroup", {
          groupId: data.groupId,
          userId: currentUser?.id,
        });
      }
    });

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

        if (
          data.eventName === "removedFromGroup" ||
          (data.eventName === "updateGroupList" &&
            data.eventData.action === "removed_from_group") ||
          (data.eventName === "updateConversationList" &&
            data.eventData.action === "member_removed")
        ) {
          const eventData = data.eventData as Record<string, unknown>;
          const groupId = eventData.groupId as string;

          console.log(
            `[useGroupSocket] Leaving group room: group:${groupId} via directUserEvent`,
          );
          socket.emit("leaveGroup", { groupId, userId: currentUser?.id });
        }
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
    };
  }, [
    accessToken,
    isAuthenticated,
    currentUser,
    refreshSelectedGroup,
    updateConversation,
    conversations,
    refreshAllGroupData,
    joinUserRoom,
  ]);

  return {
    socket: socketRef.current,
    joinGroupRoom,
    joinUserRoom,
  };
};
