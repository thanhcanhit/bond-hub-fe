"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, Check, UserCheck } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useFriendStore } from "@/stores/friendStore";
import { addGroupMember, getGroupById } from "@/actions/group.action";
import { toast } from "sonner";
import { useAuthStore } from "@/stores/authStore";
import { GroupRole } from "@/types/base";

interface AddMemberDialogProps {
  groupId: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function AddGroupMemberDialog({
  groupId,
  isOpen,
  onOpenChange,
}: AddMemberDialogProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [existingMembers, setExistingMembers] = useState<string[]>([]);

  const { friends, fetchFriends } = useFriendStore();
  const currentUser = useAuthStore((state) => state.user);

  // Load friends and group members when dialog opens
  useEffect(() => {
    if (isOpen && groupId) {
      // Fetch friends
      fetchFriends();
      setSelectedFriends([]);
      setSearchQuery("");

      // Fetch group to get existing members
      const fetchGroupMembers = async () => {
        try {
          const result = await getGroupById(groupId);
          if (result.success && result.group && result.group.members) {
            // Extract member IDs
            const memberIds = result.group.members.map(
              (member: { userId: string }) => member.userId,
            );
            // const memberIds = result.group.members.map(member => member.userId);
            setExistingMembers(memberIds);
          }
        } catch (error) {
          console.error("Error fetching group members:", error);
        }
      };

      fetchGroupMembers();
    }
  }, [isOpen, groupId, fetchFriends]);

  // Filter friends based on search query and active tab
  const filteredFriends = friends.filter((friend) => {
    const matchesSearch =
      !searchQuery ||
      (friend.fullName &&
        friend.fullName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (friend.email &&
        friend.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (friend.phoneNumber && friend.phoneNumber.includes(searchQuery));
    return matchesSearch;
  });

  // Toggle friend selection
  const handleFriendSelection = (friendId: string) => {
    setSelectedFriends((prev) =>
      prev.includes(friendId)
        ? prev.filter((id) => id !== friendId)
        : [...prev, friendId],
    );
  };

  // Add selected members to group
  const handleAddMembers = async () => {
    if (selectedFriends.length === 0) {
      toast.error("Vui lòng chọn ít nhất một thành viên");
      return;
    }

    setIsLoading(true);

    try {
      // Add each selected friend to the group
      for (const friendId of selectedFriends) {
        const result = await addGroupMember(
          groupId,
          friendId,
          currentUser?.id || "",
          GroupRole.MEMBER,
        );
        if (!result.success) {
          toast.error(`Không thể thêm thành viên: ${result.error}`);
        }
      }

      toast.success("Đã thêm thành viên vào nhóm");
      onOpenChange(false);
    } catch (error) {
      console.error("Error adding members to group:", error);
      toast.error("Đã xảy ra lỗi khi thêm thành viên");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] p-0">
        <DialogHeader className="px-4 py-2 border-b flex flex-row items-center justify-between">
          <DialogTitle className="text-base font-semibold">
            Thêm thành viên
          </DialogTitle>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => onOpenChange(false)}
          ></Button>
        </DialogHeader>

        <div className="p-4">
          <div className="relative mb-4">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <Input
              type="text"
              placeholder="Nhập tên, số điện thoại, hoặc danh sách số điện thoại"
              className="pl-10 w-full text-xs"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <ScrollArea className="h-[300px] pr-4">
            {filteredFriends.length > 0 ? (
              <div className="space-y-1">
                {filteredFriends.map((friend) => (
                  <div
                    key={friend.id}
                    className="flex items-center py-2 hover:bg-gray-50 rounded-md"
                  >
                    {existingMembers.includes(friend.id) ? (
                      <div className="ml-2 mr-3 h-4 w-4 flex items-center justify-center text-green-500">
                        <UserCheck className="h-4 w-4" />
                      </div>
                    ) : (
                      <Checkbox
                        id={`friend-${friend.id}`}
                        checked={selectedFriends.includes(friend.id)}
                        onCheckedChange={() => handleFriendSelection(friend.id)}
                        className="ml-2 mr-3"
                      />
                    )}
                    <Avatar className="h-10 w-10 mr-3">
                      <AvatarImage
                        src={friend.profilePictureUrl || undefined}
                        alt={friend.fullName || ""}
                      />
                      <AvatarFallback>
                        {friend.fullName ? friend.fullName.charAt(0) : "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{friend.fullName}</p>
                      {existingMembers.includes(friend.id) && (
                        <p className="text-xs text-green-500">
                          Đã là thành viên
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>Không tìm thấy kết quả</p>
              </div>
            )}
          </ScrollArea>

          <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Hủy
            </Button>
            <Button
              onClick={handleAddMembers}
              disabled={selectedFriends.length === 0 || isLoading}
              className="bg-blue-500 hover:bg-blue-600 text-white"
            >
              {isLoading ? (
                <>
                  <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Đang xử lý...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Xác nhận
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
