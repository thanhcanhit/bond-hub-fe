import { useEffect, useRef, useCallback } from "react";
import { Socket, io } from "socket.io-client";
import { useAuthStore } from "@/stores/authStore";
import { useChatStore } from "@/stores/chatStore";
import { useConversationsStore } from "@/stores/conversationsStore";
import { getGroupById } from "@/actions/group.action";
import { GroupRole } from "@/types/base";

/**
 * Hook to connect to the groups WebSocket namespace and handle group events
 */
// Biến để theo dõi thời gian gọi API gần nhất
let lastApiCallTimestamp = 0;
const API_THROTTLE_MS = 2000; // 2 giây

// Biến để theo dõi thời gian forceUpdate gần nhất
let lastForceUpdateTimestamp = 0;
const FORCE_UPDATE_THROTTLE_MS = 1000; // 1 giây

// Declare global type for timeout
declare global {
  interface Window {
    _groupSocketForceUpdateTimeout: NodeJS.Timeout | null;
  }
}

// Hàm throttle forceUpdate để tránh gọi quá nhiều lần
// Optimized to prevent infinite update loops
const throttledForceUpdate = () => {
  const now = Date.now();
  if (now - lastForceUpdateTimestamp > FORCE_UPDATE_THROTTLE_MS) {
    console.log("[useGroupSocket] Throttled forceUpdate");

    // Use a debounced version to prevent multiple calls in quick succession
    if (typeof window !== "undefined") {
      // Clear any existing timeout
      if (window._groupSocketForceUpdateTimeout) {
        clearTimeout(window._groupSocketForceUpdateTimeout);
      }

      // Set a new timeout
      window._groupSocketForceUpdateTimeout = setTimeout(() => {
        useConversationsStore.getState().forceUpdate();
        window._groupSocketForceUpdateTimeout = null;
      }, 50); // Small delay to batch multiple calls
    } else {
      // Fallback for SSR
      useConversationsStore.getState().forceUpdate();
    }

    lastForceUpdateTimestamp = now;
  } else {
    console.log("[useGroupSocket] Skipping forceUpdate due to throttling");
  }
};

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

    try {
      // Chỉ cập nhật UI và nhóm được chọn mà không tải lại danh sách cuộc trò chuyện
      throttledForceUpdate();

      // Then refresh the selected group
      console.log(
        "[useGroupSocket] Refreshing selected group in refreshAllGroupData",
      );
      await refreshSelectedGroup();
      console.log(
        "[useGroupSocket] Selected group refreshed in refreshAllGroupData",
      );
    } catch (error) {
      console.error("[useGroupSocket] Error in refreshAllGroupData:", error);
    }
  }, [refreshSelectedGroup]);

  const triggerGroupsReload = async () => {
    console.log("[useGroupSocket] Manually triggering groups reload");

    try {
      // Chỉ cập nhật UI mà không tải lại danh sách cuộc trò chuyện
      throttledForceUpdate();

      // Sau đó gửi sự kiện socket nếu có thể
      if (socketRef.current && socketRef.current.connected) {
        console.log("[useGroupSocket] Emitting requestReload event");
        socketRef.current.emit("requestReload");
        socketRef.current.emit("broadcastReload");
      } else {
        console.log(
          "[useGroupSocket] Socket not connected, refreshing selected group directly",
        );
        await refreshSelectedGroup();
      }
    } catch (error) {
      console.error("[useGroupSocket] Error in triggerGroupsReload:", error);
      // Fallback to refreshAllGroupData if anything fails
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

    // Join personal room immediately after connection - handled in the main connect event below

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
          "[useGroupSocket] Current user was added to a group, creating group conversation",
        );

        // Kiểm tra xem có thông tin nhóm trong data không
        const groupData = data.group || null;

        // Tạo cuộc trò chuyện nhóm mới nếu chưa tồn tại
        setTimeout(async () => {
          try {
            if (data.groupId) {
              // Tham gia vào phòng nhóm
              console.log(
                `[useGroupSocket] Joining group room: ${data.groupId} after being added`,
              );
              joinGroupRoom(data.groupId);

              // Kiểm tra xem cuộc trò chuyện nhóm đã tồn tại chưa
              const conversations =
                useConversationsStore.getState().conversations;
              const existingConversation = conversations.find(
                (conv) =>
                  conv.type === "GROUP" && conv.group?.id === data.groupId,
              );

              if (!existingConversation) {
                console.log(
                  `[useGroupSocket] Creating new group conversation for ${data.groupId}`,
                );

                // Nếu có thông tin nhóm trong data, sử dụng nó thay vì gọi API
                let groupInfo = null;

                if (groupData) {
                  console.log(
                    `[useGroupSocket] Using group data from socket event for ${data.groupId}`,
                  );
                  groupInfo = groupData;
                } else {
                  // Chỉ gọi API nếu đã quá thời gian throttle
                  const now = Date.now();
                  if (now - lastApiCallTimestamp > API_THROTTLE_MS) {
                    console.log(
                      `[useGroupSocket] Fetching group data from API for ${data.groupId}`,
                    );
                    const result = await getGroupById(data.groupId);
                    if (result.success && result.group) {
                      groupInfo = result.group;
                      lastApiCallTimestamp = now;
                    }
                  } else {
                    console.log(
                      `[useGroupSocket] API call throttled, skipping getGroupById for ${data.groupId}`,
                    );
                  }
                }

                if (groupInfo) {
                  // Tạo placeholder contact cho cuộc trò chuyện nhóm
                  const placeholderContact = {
                    id: currentUser.id,
                    email: currentUser.email || "",
                    phoneNumber: currentUser.phoneNumber || "",
                    passwordHash: currentUser.passwordHash,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    userInfo: currentUser.userInfo || {
                      id: currentUser.id,
                      fullName: "Group Member",
                      profilePictureUrl: null,
                      statusMessage: "",
                      blockStrangers: false,
                      createdAt: new Date(),
                      updatedAt: new Date(),
                      userAuth: currentUser,
                    },
                    refreshTokens: [],
                    qrCodes: [],
                    posts: [],
                    stories: [],
                    groupMembers: [],
                    cloudFiles: [],
                    pinnedItems: [],
                    sentFriends: [],
                    receivedFriends: [],
                    contacts: [],
                    contactOf: [],
                    settings: [],
                    postReactions: [],
                    hiddenPosts: [],
                    addedBy: [],
                    notifications: [],
                    sentMessages: [],
                    receivedMessages: [],
                    comments: [],
                  };

                  // Thêm cuộc trò chuyện nhóm mới
                  useConversationsStore.getState().addConversation({
                    contact: placeholderContact,
                    group: {
                      id: groupInfo.id,
                      name: groupInfo.name,
                      avatarUrl: groupInfo.avatarUrl,
                      createdAt: groupInfo.createdAt,
                    },
                    lastMessage: undefined,
                    unreadCount: 0,
                    lastActivity: new Date(),
                    type: "GROUP",
                  });

                  // Force update UI
                  useConversationsStore.getState().forceUpdate();
                  console.log(
                    `[useGroupSocket] Group conversation created for ${data.groupId}`,
                  );
                } else {
                  console.log(
                    `[useGroupSocket] Could not get group data for ${data.groupId}, falling back to loadConversations`,
                  );

                  const now = Date.now();
                  if (now - lastApiCallTimestamp > API_THROTTLE_MS) {
                    await useConversationsStore
                      .getState()
                      .loadConversations(currentUser.id);
                    lastApiCallTimestamp = now;
                    useConversationsStore.getState().forceUpdate();
                  }
                }
              } else {
                console.log(
                  `[useGroupSocket] Group conversation already exists for ${data.groupId}`,
                );
              }
            }
          } catch (error) {
            console.error(
              "[useGroupSocket] Error handling addedToGroup event:",
              error,
            );
          }
        }, 300);
      }
    });

    socket.on("groupCreated", (data) => {
      console.log("[useGroupSocket] Group created:", data);
      if (currentUser?.id) {
        console.log(
          "[useGroupSocket] Creating group conversation after group creation",
        );

        // Kiểm tra xem có thông tin nhóm trong data không
        const groupData = data.group || null;

        // Tạo cuộc trò chuyện nhóm mới nếu chưa tồn tại
        setTimeout(async () => {
          try {
            if (data.groupId) {
              // Tham gia vào phòng nhóm
              console.log(
                `[useGroupSocket] Joining group room: ${data.groupId} after creation`,
              );
              joinGroupRoom(data.groupId);

              // Kiểm tra xem cuộc trò chuyện nhóm đã tồn tại chưa
              const conversations =
                useConversationsStore.getState().conversations;
              const existingConversation = conversations.find(
                (conv) =>
                  conv.type === "GROUP" && conv.group?.id === data.groupId,
              );

              if (!existingConversation) {
                console.log(
                  `[useGroupSocket] Creating new group conversation for ${data.groupId}`,
                );

                // Nếu có thông tin nhóm trong data, sử dụng nó thay vì gọi API
                let groupInfo = null;

                if (groupData) {
                  console.log(
                    `[useGroupSocket] Using group data from socket event for ${data.groupId}`,
                  );
                  groupInfo = groupData;
                } else {
                  // Chỉ gọi API nếu đã quá thời gian throttle
                  const now = Date.now();
                  if (now - lastApiCallTimestamp > API_THROTTLE_MS) {
                    console.log(
                      `[useGroupSocket] Fetching group data from API for ${data.groupId}`,
                    );
                    const result = await getGroupById(data.groupId);
                    if (result.success && result.group) {
                      groupInfo = result.group;
                      lastApiCallTimestamp = now;
                    }
                  } else {
                    console.log(
                      `[useGroupSocket] API call throttled, skipping getGroupById for ${data.groupId}`,
                    );
                  }
                }

                if (groupInfo) {
                  // Tạo placeholder contact cho cuộc trò chuyện nhóm
                  const placeholderContact = {
                    id: currentUser.id,
                    email: currentUser.email || "",
                    phoneNumber: currentUser.phoneNumber || "",
                    passwordHash: currentUser.passwordHash,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    userInfo: currentUser.userInfo || {
                      id: currentUser.id,
                      fullName: "Group Member",
                      profilePictureUrl: null,
                      statusMessage: "",
                      blockStrangers: false,
                      createdAt: new Date(),
                      updatedAt: new Date(),
                      userAuth: currentUser,
                    },
                    refreshTokens: [],
                    qrCodes: [],
                    posts: [],
                    stories: [],
                    groupMembers: [],
                    cloudFiles: [],
                    pinnedItems: [],
                    sentFriends: [],
                    receivedFriends: [],
                    contacts: [],
                    contactOf: [],
                    settings: [],
                    postReactions: [],
                    hiddenPosts: [],
                    addedBy: [],
                    notifications: [],
                    sentMessages: [],
                    receivedMessages: [],
                    comments: [],
                  };

                  // Thêm cuộc trò chuyện nhóm mới
                  useConversationsStore.getState().addConversation({
                    contact: placeholderContact,
                    group: {
                      id: groupInfo.id,
                      name: groupInfo.name,
                      avatarUrl: groupInfo.avatarUrl,
                      createdAt: groupInfo.createdAt,
                    },
                    lastMessage: undefined,
                    unreadCount: 0,
                    lastActivity: new Date(),
                    type: "GROUP",
                  });

                  // Force update UI
                  useConversationsStore.getState().forceUpdate();
                  console.log(
                    `[useGroupSocket] Group conversation created for ${data.groupId}`,
                  );
                } else {
                  console.log(
                    `[useGroupSocket] Could not get group data for ${data.groupId}, falling back to loadConversations`,
                  );

                  const now = Date.now();
                  if (now - lastApiCallTimestamp > API_THROTTLE_MS) {
                    await useConversationsStore
                      .getState()
                      .loadConversations(currentUser.id);
                    lastApiCallTimestamp = now;
                    useConversationsStore.getState().forceUpdate();
                  }
                }
              } else {
                console.log(
                  `[useGroupSocket] Group conversation already exists for ${data.groupId}`,
                );
              }
            }
          } catch (error) {
            console.error(
              "[useGroupSocket] Error handling groupCreated event:",
              error,
            );
          }
        }, 300);
      }
    });

    socket.on("groupUpdated", (data) => {
      console.log("[useGroupSocket] Group updated:", data);

      // Chỉ cập nhật nhóm được chọn mà không tải lại toàn bộ danh sách cuộc trò chuyện
      const selectedGroup = useChatStore.getState().selectedGroup;
      if (selectedGroup && selectedGroup.id === data.groupId) {
        console.log(
          "[useGroupSocket] Refreshing selected group after group update",
        );
        refreshSelectedGroup();
      } else {
        // Chỉ cập nhật UI mà không gọi API
        throttledForceUpdate();
      }
    });

    socket.on("memberAdded", (data) => {
      console.log("[useGroupSocket] Member added to group:", data);

      // Chỉ cập nhật UI nếu đã quá thời gian throttle
      setTimeout(async () => {
        try {
          const now = Date.now();

          // Cập nhật nhóm được chọn nếu có
          const selectedGroup = useChatStore.getState().selectedGroup;
          if (selectedGroup && selectedGroup.id === data.groupId) {
            console.log(
              "[useGroupSocket] Refreshing selected group after member added",
            );
            await refreshSelectedGroup();
          }

          // Chỉ tải lại danh sách cuộc trò chuyện nếu đã quá thời gian throttle
          if (now - lastApiCallTimestamp > API_THROTTLE_MS) {
            if (currentUser?.id) {
              console.log(
                "[useGroupSocket] Throttled API call for memberAdded event",
              );
              // Cập nhật UI trước khi gọi API
              throttledForceUpdate();

              // Tải lại danh sách cuộc trò chuyện từ API
              await useConversationsStore
                .getState()
                .loadConversations(currentUser.id);
              console.log(
                "[useGroupSocket] Conversations reloaded after member added",
              );

              // Cập nhật timestamp
              lastApiCallTimestamp = now;

              // Đảm bảo UI được cập nhật
              throttledForceUpdate();
            }
          } else {
            console.log(
              "[useGroupSocket] Skipping API call for memberAdded event due to throttling",
            );
            // Vẫn cập nhật UI
            throttledForceUpdate();
          }
        } catch (error) {
          console.error(
            "[useGroupSocket] Error handling memberAdded event:",
            error,
          );
        }
      }, 300);
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

        // Force update UI
        throttledForceUpdate();

        // Chỉ tải lại danh sách cuộc trò chuyện nếu đã quá thời gian throttle
        setTimeout(async () => {
          try {
            const now = Date.now();
            if (
              currentUser?.id &&
              now - lastApiCallTimestamp > API_THROTTLE_MS
            ) {
              await useConversationsStore
                .getState()
                .loadConversations(currentUser.id);
              console.log(
                "[useGroupSocket] Conversations reloaded after user removed from group",
              );
              lastApiCallTimestamp = now;
              throttledForceUpdate();
            } else {
              console.log(
                "[useGroupSocket] Skipping API call after user removed due to throttling",
              );
            }
          } catch (error) {
            console.error(
              "[useGroupSocket] Error reloading conversations after user removed:",
              error,
            );
          }
        }, 300);
      } else {
        // If another member was removed, refresh the group data
        console.log(
          "[useGroupSocket] Another member was removed, refreshing group data",
        );

        // Chỉ cập nhật UI nếu đã quá thời gian throttle
        setTimeout(async () => {
          try {
            const now = Date.now();

            // Cập nhật nhóm được chọn nếu có
            const selectedGroup = useChatStore.getState().selectedGroup;
            if (selectedGroup && selectedGroup.id === data.groupId) {
              console.log(
                "[useGroupSocket] Refreshing selected group after member removed",
              );
              await refreshSelectedGroup();
            }

            // Chỉ tải lại danh sách cuộc trò chuyện nếu đã quá thời gian throttle
            if (now - lastApiCallTimestamp > API_THROTTLE_MS) {
              if (currentUser?.id) {
                console.log(
                  "[useGroupSocket] Throttled API call for memberRemoved event",
                );
                // Cập nhật UI trước khi gọi API
                throttledForceUpdate();

                // Tải lại danh sách cuộc trò chuyện từ API
                await useConversationsStore
                  .getState()
                  .loadConversations(currentUser.id);
                console.log(
                  "[useGroupSocket] Conversations reloaded after member removed",
                );

                // Cập nhật timestamp
                lastApiCallTimestamp = now;

                // Đảm bảo UI được cập nhật
                throttledForceUpdate();
              }
            } else {
              console.log(
                "[useGroupSocket] Skipping API call for memberRemoved event due to throttling",
              );
              // Vẫn cập nhật UI
              throttledForceUpdate();
            }
          } catch (error) {
            console.error(
              "[useGroupSocket] Error handling memberRemoved event:",
              error,
            );
          }
        }, 300);
      }
    });

    socket.on("memberRoleUpdated", (data) => {
      console.log("[useGroupSocket] Member role updated:", data);

      // Chỉ cập nhật nhóm được chọn mà không tải lại toàn bộ danh sách cuộc trò chuyện
      const selectedGroup = useChatStore.getState().selectedGroup;
      if (selectedGroup && selectedGroup.id === data.groupId) {
        console.log(
          "[useGroupSocket] Refreshing selected group after role update",
        );
        refreshSelectedGroup();
      } else {
        // Chỉ cập nhật UI mà không gọi API
        throttledForceUpdate();
      }
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

    // Sử dụng các biến đã khai báo ở phạm vi toàn cục

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

        // Xóa nhóm khỏi danh sách cuộc trò chuyện
        useConversationsStore.getState().removeConversation(data.groupId);
        throttledForceUpdate();
      } else if (data.action === "added_to_group") {
        console.log(
          `[useGroupSocket] User was added to a group via updateGroupList, creating group conversation`,
        );

        // Kiểm tra xem có thông tin nhóm trong data không
        const groupData = data.group || null;

        // Thêm: Tạo cuộc trò chuyện nhóm mới nếu chưa tồn tại
        setTimeout(async () => {
          try {
            if (currentUser?.id && data.groupId) {
              // Tham gia vào phòng nhóm
              console.log(
                `[useGroupSocket] Joining group room: ${data.groupId} after updateGroupList`,
              );
              joinGroupRoom(data.groupId);

              // Kiểm tra xem cuộc trò chuyện nhóm đã tồn tại chưa
              const conversations =
                useConversationsStore.getState().conversations;
              const existingConversation = conversations.find(
                (conv) =>
                  conv.type === "GROUP" && conv.group?.id === data.groupId,
              );

              if (!existingConversation) {
                console.log(
                  `[useGroupSocket] Creating new group conversation for ${data.groupId}`,
                );

                // Nếu có thông tin nhóm trong data, sử dụng nó thay vì gọi API
                let groupInfo = null;

                if (groupData) {
                  console.log(
                    `[useGroupSocket] Using group data from socket event for ${data.groupId}`,
                  );
                  groupInfo = groupData;
                } else {
                  // Chỉ gọi API nếu đã quá thời gian throttle
                  const now = Date.now();
                  if (now - lastApiCallTimestamp > API_THROTTLE_MS) {
                    console.log(
                      `[useGroupSocket] Fetching group data from API for ${data.groupId}`,
                    );
                    const result = await getGroupById(data.groupId);
                    if (result.success && result.group) {
                      groupInfo = result.group;
                      lastApiCallTimestamp = now;
                    }
                  } else {
                    console.log(
                      `[useGroupSocket] API call throttled, skipping getGroupById for ${data.groupId}`,
                    );
                  }
                }

                if (groupInfo) {
                  // Tạo placeholder contact cho cuộc trò chuyện nhóm
                  const placeholderContact = {
                    id: currentUser.id,
                    email: currentUser.email || "",
                    phoneNumber: currentUser.phoneNumber || "",
                    passwordHash: currentUser.passwordHash,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    userInfo: currentUser.userInfo || {
                      id: currentUser.id,
                      fullName: "Group Member",
                      profilePictureUrl: null,
                      statusMessage: "",
                      blockStrangers: false,
                      createdAt: new Date(),
                      updatedAt: new Date(),
                      userAuth: currentUser,
                    },
                    refreshTokens: [],
                    qrCodes: [],
                    posts: [],
                    stories: [],
                    groupMembers: [],
                    cloudFiles: [],
                    pinnedItems: [],
                    sentFriends: [],
                    receivedFriends: [],
                    contacts: [],
                    contactOf: [],
                    settings: [],
                    postReactions: [],
                    hiddenPosts: [],
                    addedBy: [],
                    notifications: [],
                    sentMessages: [],
                    receivedMessages: [],
                    comments: [],
                  };

                  // Thêm cuộc trò chuyện nhóm mới
                  useConversationsStore.getState().addConversation({
                    contact: placeholderContact,
                    group: {
                      id: groupInfo.id,
                      name: groupInfo.name,
                      avatarUrl: groupInfo.avatarUrl,
                      createdAt: groupInfo.createdAt,
                    },
                    lastMessage: undefined,
                    unreadCount: 0,
                    lastActivity: new Date(),
                    type: "GROUP",
                  });

                  // Force update UI
                  throttledForceUpdate();
                  console.log(
                    `[useGroupSocket] Group conversation created for ${data.groupId}`,
                  );
                } else {
                  console.log(
                    `[useGroupSocket] Could not get group data for ${data.groupId}, falling back to loadConversations`,
                  );

                  const now = Date.now();
                  if (now - lastApiCallTimestamp > API_THROTTLE_MS) {
                    await useConversationsStore
                      .getState()
                      .loadConversations(currentUser.id);
                    lastApiCallTimestamp = now;
                    throttledForceUpdate();
                  }
                }
              } else {
                console.log(
                  `[useGroupSocket] Group conversation already exists for ${data.groupId}`,
                );
              }
            }
          } catch (error) {
            console.error(
              "[useGroupSocket] Error handling updateGroupList event:",
              error,
            );
          }
        }, 300);
      }
    });

    socket.on("forceUpdateConversations", (data) => {
      console.log(
        "[useGroupSocket] Received forceUpdateConversations event:",
        data,
      );

      // Xử lý trước các thao tác liên quan đến nhóm cụ thể
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

      // Chỉ cập nhật UI mà không gọi API, trừ khi có yêu cầu cụ thể trong data
      setTimeout(async () => {
        try {
          // Kiểm tra xem có yêu cầu cụ thể để tải lại danh sách cuộc trò chuyện không
          const shouldReloadConversations = data?.forceReload === true;

          if (shouldReloadConversations && currentUser?.id) {
            const now = Date.now();
            if (now - lastApiCallTimestamp > API_THROTTLE_MS) {
              console.log(
                "[useGroupSocket] Forced API call for forceUpdateConversations event",
              );

              // Cập nhật UI trước khi gọi API
              throttledForceUpdate();

              // Tải lại danh sách cuộc trò chuyện từ API
              await useConversationsStore
                .getState()
                .loadConversations(currentUser.id);
              console.log(
                "[useGroupSocket] Conversations reloaded after forceUpdateConversations event",
              );

              // Cập nhật timestamp
              lastApiCallTimestamp = now;
            }
          }

          // Luôn cập nhật UI
          throttledForceUpdate();
        } catch (error) {
          console.error(
            "[useGroupSocket] Error handling forceUpdateConversations event:",
            error,
          );
          // Fallback to forceUpdate if anything fails
          throttledForceUpdate();
        }
      }, 300);
    });

    // Hàm xử lý chung cho cả reload và requestReload
    const handleReloadEvent = (eventName: string) => {
      console.log(
        `[useGroupSocket] Received ${eventName} event, refreshing data...`,
      );

      // Chỉ cập nhật UI và nhóm được chọn mà không tải lại danh sách cuộc trò chuyện
      setTimeout(async () => {
        try {
          // Cập nhật nhóm được chọn nếu có
          await refreshSelectedGroup();

          // Chỉ cập nhật UI mà không gọi API
          throttledForceUpdate();
        } catch (error) {
          console.error(
            `[useGroupSocket] Error handling ${eventName} event:`,
            error,
          );
        }
      }, 300);
    };

    socket.on("reload", () => handleReloadEvent("reload"));
    socket.on("requestReload", () => handleReloadEvent("requestReload"));

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
      console.log("[GroupSocket] Connected");
      joinUserRoom();

      setTimeout(() => {
        if (socket.connected) {
          console.log(
            "[useGroupSocket] Requesting server to broadcast reload to all clients",
          );
          socket.emit("broadcastReload");

          // Chỉ cập nhật UI và nhóm được chọn mà không tải lại danh sách cuộc trò chuyện
          console.log("[useGroupSocket] Updating UI after reconnect");

          // Cập nhật UI
          throttledForceUpdate();

          // Cập nhật nhóm được chọn nếu có
          refreshSelectedGroup();
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
