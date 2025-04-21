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
} from "lucide-react";
import { useChatStore } from "@/stores/chatStore";
import { useConversationsStore } from "@/stores/conversationsStore";
import { useAuthStore } from "@/stores/authStore";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { getGroupById } from "@/actions/group.action";

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
  const API_THROTTLE_MS = 10000; // 10 giây

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
  }, [groupConversation, group]);

  // Hàm kiểm tra xem người dùng hiện tại có còn là thành viên của nhóm không
  const checkGroupMembership = useCallback(async () => {
    if (!group?.id || !currentUser?.id || isCheckingMembership) return;

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
        `[GroupChatHeader] Checking if user ${currentUser.id} is still a member of group ${group.id}`,
      );

      // Cập nhật timestamp trước khi gọi API
      lastCheckTimestampRef.current = now;

      const result = await getGroupById(group.id);

      if (result.success && result.group) {
        // Kiểm tra xem người dùng hiện tại có trong danh sách thành viên không
        const isMember = result.group.members?.some(
          (member: GroupMember) => member.userId === currentUser.id,
        );

        if (!isMember) {
          console.log(
            `[GroupChatHeader] User ${currentUser.id} is no longer a member of group ${group.id}`,
          );

          // Hiển thị thông báo
          toast.error("Bạn không còn là thành viên của nhóm này", {
            description: "Bạn đã bị xóa khỏi nhóm hoặc nhóm đã bị giải tán",
            icon: <AlertTriangle className="h-5 w-5" />,
            duration: 5000,
          });

          // Xóa nhóm khỏi danh sách cuộc trò chuyện
          const conversationsStore = useConversationsStore.getState();
          conversationsStore.checkAndRemoveGroups(group.id, group.name);

          // Xóa tin nhắn của nhóm khỏi cache
          useChatStore.getState().clearChatCache("GROUP", group.id);

          // Chuyển về trạng thái không chọn nhóm
          // Sử dụng getState() để tránh gây ra vòng lặp vô hạn
          useChatStore.getState().setSelectedGroup(null);

          // Tải lại danh sách cuộc trò chuyện
          if (currentUser?.id) {
            conversationsStore.loadConversations(currentUser.id);
          }

          // Xóa interval kiểm tra
          if (membershipCheckInterval) {
            clearInterval(membershipCheckInterval);
            setMembershipCheckInterval(null);
          }
        } else {
          console.log(
            `[GroupChatHeader] User ${currentUser.id} is still a member of group ${group.id}`,
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
  }, [
    group?.id,
    currentUser?.id,
    isCheckingMembership,
    membershipCheckInterval,
  ]);

  // Thiết lập interval kiểm tra thành viên nhóm
  useEffect(() => {
    // Chỉ thiết lập interval nếu có nhóm được chọn
    if (group?.id && currentUser?.id) {
      console.log(
        `[GroupChatHeader] Setting up membership check interval for group ${group.id}`,
      );

      // Kiểm tra ngay lập tức, nhưng chỉ nếu đã quá thời gian throttle
      const now = Date.now();
      if (now - lastCheckTimestampRef.current >= API_THROTTLE_MS) {
        checkGroupMembership();
      } else {
        console.log(
          `[GroupChatHeader] Skipping initial membership check due to throttling. Last check was ${(now - lastCheckTimestampRef.current) / 1000}s ago`,
        );
      }

      // Thiết lập interval kiểm tra mỗi 60 giây thay vì 30 giây
      const intervalId = setInterval(checkGroupMembership, 60000);
      setMembershipCheckInterval(intervalId);

      // Cleanup khi component unmount hoặc nhóm thay đổi
      return () => {
        console.log(
          `[GroupChatHeader] Cleaning up membership check interval for group ${group.id}`,
        );
        clearInterval(intervalId);
        setMembershipCheckInterval(null);
      };
    }
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
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full"
                onClick={toggleSearch}
              >
                <Search className="h-5 w-5 text-gray-500" />
              </Button>
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
