"use client";

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Group, GroupMember } from "@/types/base";
import {
  Info,
  Search,
  X,
  Users,
  ChevronLeft,
  AlertTriangle,
  Phone,
  Video,
} from "lucide-react";
import { useChatStore } from "@/stores/chatStore";
import { useConversationsStore } from "@/stores/conversationsStore";
import { useAuthStore } from "@/stores/authStore";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { getGroupById } from "@/actions/group.action";
import CallButton from "@/components/call/CallButton";

interface GroupChatHeaderProps {
  group: Group | null;
  onToggleInfo: () => void;
  onBackToList?: () => void;
}

export default function GroupChatHeader({
  group,
  onToggleInfo,
  onBackToList,
}: GroupChatHeaderProps) {
  const [isSearching, setIsSearching] = useState(false);
  const [isCheckingMembership, setIsCheckingMembership] = useState(false);
  const [membershipCheckInterval, setMembershipCheckInterval] =
    useState<NodeJS.Timeout | null>(null);
  const lastCheckTimestampRef = useRef<number>(0);
  const API_THROTTLE_MS = 30000; // 30 giây

  const { searchText, setSearchText, searchMessages, clearSearch } =
    useChatStore();
  const currentUser = useAuthStore((state) => state.user);

  // Lấy danh sách cuộc trò chuyện từ conversationsStore
  const conversations = useConversationsStore((state) => state.conversations);

  // Tìm thông tin nhóm từ conversationsStore
  const groupConversation = useMemo(() => {
    if (!group) return null;
    return conversations.find(
      (conv) => conv.type === "GROUP" && conv.group?.id === group.id,
    );
  }, [conversations, group]);

  // Tính toán số lượng thành viên
  const memberCount = useMemo(() => {
    // Ưu tiên sử dụng thông tin từ conversationsStore
    if (groupConversation?.group?.memberUsers) {
      return groupConversation.group.memberUsers.length;
    }
    // Nếu không có, sử dụng thông tin từ group prop
    return group?.members?.length || 0;
  }, [groupConversation?.group?.memberUsers, group?.members]);

  // Hàm xử lý khi người dùng không còn là thành viên của nhóm
  const handleUserNotInGroup = useCallback(
    (groupId: string, userId: string, groupName: string) => {
      // Hiển thị thông báo
      toast.error("Bạn không còn là thành viên của nhóm này", {
        description: "Bạn đã bị xóa khỏi nhóm hoặc nhóm đã bị giải tán",
        icon: <AlertTriangle className="h-5 w-5" />,
        duration: 5000,
      });

      // Xóa nhóm khỏi danh sách cuộc trò chuyện
      const conversationsStore = useConversationsStore.getState();
      conversationsStore.checkAndRemoveGroups(groupId, groupName);

      // Xóa tin nhắn của nhóm khỏi cache
      useChatStore.getState().clearChatCache("GROUP", groupId);

      // Chuyển về trạng thái không chọn nhóm
      useChatStore.getState().setSelectedGroup(null);

      // Tải lại danh sách cuộc trò chuyện
      if (userId) {
        conversationsStore.loadConversations(userId);
      }

      // Xóa interval kiểm tra
      if (membershipCheckInterval) {
        clearInterval(membershipCheckInterval);
        setMembershipCheckInterval(null);
      }
    },
    [membershipCheckInterval],
  );

  // Hàm kiểm tra xem người dùng hiện tại có còn là thành viên của nhóm không
  const checkGroupMembership = useCallback(async () => {
    // Store the current group and user IDs to avoid closure issues
    const currentGroupId = group?.id;
    const currentUserId = currentUser?.id;

    if (!currentGroupId || !currentUserId || isCheckingMembership) return;

    // Kiểm tra throttle để giảm số lượng request API
    const now = Date.now();
    if (now - lastCheckTimestampRef.current < API_THROTTLE_MS) {
      console.log(
        `[GroupChatHeader] Skipping membership check due to throttling. Last check was ${(now - lastCheckTimestampRef.current) / 1000}s ago`,
      );
      return;
    }

    try {
      setIsCheckingMembership(true);
      console.log(
        `[GroupChatHeader] Checking if user ${currentUserId} is still a member of group ${currentGroupId}`,
      );

      // Cập nhật timestamp trước khi gọi API
      lastCheckTimestampRef.current = now;

      // Ưu tiên sử dụng thông tin từ conversationsStore
      const conversationsStore = useConversationsStore.getState();
      const groupConversation = conversationsStore.conversations.find(
        (conv) => conv.type === "GROUP" && conv.group?.id === currentGroupId,
      );

      // Nếu có thông tin nhóm trong conversationsStore, sử dụng nó
      if (groupConversation?.group) {
        const isMember =
          groupConversation.group.memberIds?.includes(currentUserId) ||
          groupConversation.group.memberUsers?.some(
            (member) => member.id === currentUserId,
          );

        if (!isMember) {
          console.log(
            `[GroupChatHeader] User ${currentUserId} is no longer a member of group ${currentGroupId} (from conversationsStore)`,
          );
          handleUserNotInGroup(
            currentGroupId,
            currentUserId,
            groupConversation.group.name,
          );
          return;
        }

        console.log(
          `[GroupChatHeader] User ${currentUserId} is still a member of group ${currentGroupId} (from conversationsStore)`,
        );
        return;
      }

      // Nếu không có thông tin từ conversationsStore, kiểm tra cache
      const chatStore = useChatStore.getState();
      const cachedData =
        chatStore.groupCache && chatStore.groupCache[currentGroupId];
      const currentTime = new Date();
      const isCacheValid =
        cachedData &&
        currentTime.getTime() - cachedData.lastFetched.getTime() < 30 * 1000; // 30 seconds cache

      if (isCacheValid && cachedData.group) {
        console.log(
          `[GroupChatHeader] Using cached group data for membership check`,
        );

        const isMember =
          cachedData.group.members?.some(
            (member) => member.userId === currentUserId,
          ) ||
          cachedData.group.memberUsers?.some(
            (member) => member.id === currentUserId,
          );

        if (!isMember) {
          console.log(
            `[GroupChatHeader] User ${currentUserId} is no longer a member of group ${currentGroupId} (from cache)`,
          );
          handleUserNotInGroup(
            currentGroupId,
            currentUserId,
            cachedData.group.name,
          );
          return;
        }

        console.log(
          `[GroupChatHeader] User ${currentUserId} is still a member of group ${currentGroupId} (from cache)`,
        );
        return;
      }

      // Nếu không có thông tin từ cache hoặc conversationsStore, gọi API
      console.log(
        `[GroupChatHeader] Fetching fresh group data for membership check`,
      );
      const result = await getGroupById(currentGroupId);
      if (result.success && result.group) {
        // Update the cache
        if (chatStore.groupCache) {
          chatStore.groupCache[currentGroupId] = {
            group: result.group,
            lastFetched: new Date(),
          };
        }

        // Kiểm tra xem người dùng hiện tại có trong danh sách thành viên không
        const isMember =
          result.group.memberIds?.includes(currentUserId) ||
          result.group.memberUsers?.some(
            (member) => member.id === currentUserId,
          );

        if (!isMember) {
          console.log(
            `[GroupChatHeader] User ${currentUserId} is no longer a member of group ${currentGroupId} (from API)`,
          );
          handleUserNotInGroup(
            currentGroupId,
            currentUserId,
            result.group.name,
          );
        } else {
          console.log(
            `[GroupChatHeader] User ${currentUserId} is still a member of group ${currentGroupId} (from API)`,
          );
        }
      }
    } catch (error) {
      console.error(
        `[GroupChatHeader] Error checking group membership:`,
        error,
      );
    } finally {
      setIsCheckingMembership(false);
    }
  }, [isCheckingMembership, handleUserNotInGroup]);

  // Thiết lập interval kiểm tra thành viên nhóm
  useEffect(() => {
    // Thêm throttle để tránh thiết lập interval quá thường xuyên
    if (!window._lastGroupHeaderIntervalTime) {
      window._lastGroupHeaderIntervalTime = {};
    }

    // Chỉ thiết lập interval nếu có nhóm được chọn
    if (group?.id && currentUser?.id) {
      const groupId = group.id;
      const now = Date.now();
      const lastIntervalTime =
        window._lastGroupHeaderIntervalTime[groupId] || 0;
      const timeSinceLastInterval = now - lastIntervalTime;

      // Nếu đã thiết lập interval trong vòng 2 giây, bỏ qua
      if (timeSinceLastInterval < 2000) {
        console.log(
          `[GroupChatHeader] Skipping interval setup, last setup was ${timeSinceLastInterval}ms ago`,
        );
        return;
      }

      // Cập nhật thời gian thiết lập interval
      window._lastGroupHeaderIntervalTime[groupId] = now;

      console.log(
        `[GroupChatHeader] Setting up membership check interval for group ${groupId}`,
      );

      // Kiểm tra ngay lập tức, nhưng chỉ nếu đã quá thời gian throttle
      if (now - lastCheckTimestampRef.current >= API_THROTTLE_MS) {
        // Sử dụng setTimeout để tránh gọi checkGroupMembership trực tiếp trong useEffect
        setTimeout(() => {
          if (group?.id === groupId) {
            // Kiểm tra lại để đảm bảo nhóm không thay đổi
            checkGroupMembership();
          }
        }, 100);
      } else {
        console.log(
          `[GroupChatHeader] Skipping initial membership check due to throttling. Last check was ${(now - lastCheckTimestampRef.current) / 1000}s ago`,
        );
      }

      // Thiết lập interval kiểm tra mỗi 120 giây thay vì 60 giây để giảm số lượng API calls
      const intervalId = setInterval(() => {
        // Kiểm tra xem nhóm hiện tại có còn là nhóm ban đầu không
        if (group?.id === groupId) {
          checkGroupMembership();
        }
      }, 120000);

      // Lưu intervalId vào state
      setMembershipCheckInterval(intervalId);

      // Cleanup khi component unmount hoặc nhóm thay đổi
      return () => {
        console.log(
          `[GroupChatHeader] Cleaning up membership check interval for group ${groupId}`,
        );
        clearInterval(intervalId);
        setMembershipCheckInterval(null);
      };
    }
    // Loại bỏ checkGroupMembership khỏi dependencies để tránh vòng lặp vô hạn
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [group?.id, currentUser?.id]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchText.trim()) {
      searchMessages(searchText);
    }
  };

  const toggleSearch = () => {
    if (isSearching) {
      clearSearch();
    }
    setIsSearching(!isSearching);
  };

  if (!group) {
    return (
      <div className="border-b bg-white p-3 h-[69px] flex items-center justify-between">
        <h2 className="font-semibold">Chọn một cuộc trò chuyện</h2>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white border-b border-gray-200 p-3 h-[69px] flex items-center justify-between">
        <div className="flex items-center">
          {onBackToList && (
            <Button
              variant="ghost"
              size="icon"
              className="mr-2 md:hidden"
              onClick={onBackToList}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
          )}
          <div
            className="flex items-center cursor-pointer hover:bg-gray-100 p-1 rounded-md transition-colors"
            onClick={onToggleInfo}
          >
            <div className="relative">
              <Avatar className="h-10 w-10 mr-3">
                <AvatarImage
                  src={
                    // Ưu tiên sử dụng thông tin từ conversationsStore
                    groupConversation?.group?.avatarUrl ||
                    group.avatarUrl ||
                    undefined
                  }
                  className="object-cover"
                />
                <AvatarFallback>
                  {(groupConversation?.group?.name || group.name)
                    ?.slice(0, 2)
                    .toUpperCase() || "GR"}
                </AvatarFallback>
              </Avatar>
            </div>
            <div>
              <h2 className="text-sm font-semibold">
                {groupConversation?.group?.name || group.name || "Nhóm chat"}
              </h2>
              <p className="text-xs text-gray-500 flex items-center">
                <Users className="h-3 w-3 mr-1" />
                {memberCount} thành viên
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isSearching ? (
            <form onSubmit={handleSearch} className="flex items-center">
              <Input
                type="text"
                placeholder="Tìm kiếm tin nhắn..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="h-8 w-48 mr-2"
                autoFocus
              />
              <Button
                type="submit"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
              >
                <Search className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={toggleSearch}
                className="h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>
            </form>
          ) : (
            <>
              {/* Nút gọi điện và gọi video */}
              {group && (
                <CallButton
                  target={group}
                  targetType="GROUP"
                  variant="icon"
                  size="md"
                />
              )}

              {/* Nút tìm kiếm */}
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full"
                onClick={toggleSearch}
              >
                <Search className="h-5 w-5 text-gray-500" />
              </Button>

              {/* Nút thông tin */}
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full"
                onClick={onToggleInfo}
              >
                <Info className="h-5 w-5 text-gray-500" />
              </Button>
            </>
          )}
        </div>
      </div>
    </>
  );
}
