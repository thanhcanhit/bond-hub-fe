"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Users, Upload, Search } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { createGroup, updateGroupAvatar } from "@/actions/group.action";
import { toast } from "sonner";
import { useFriendStore } from "@/stores/friendStore";
import { useConversationsStore } from "@/stores/conversationsStore";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { isEmail, isPhoneNumber } from "@/utils/helpers";

interface CreateGroupDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  preSelectedFriendId?: string;
}

export default function CreateGroupDialog({
  isOpen,
  onOpenChange,
  preSelectedFriendId,
}: CreateGroupDialogProps) {
  const [groupName, setGroupName] = useState("");
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const { user: currentUser } = useAuthStore();
  const { friends } = useFriendStore();

  // Memoize callback functions to prevent unnecessary re-renders
  const handleAvatarChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        setAvatarFile(file);
        const reader = new FileReader();
        reader.onloadend = () => {
          setAvatarPreview(reader.result as string);
        };
        reader.readAsDataURL(file);
      }
    },
    [],
  );

  const handleFriendSelection = useCallback((friendId: string) => {
    setSelectedFriends((prev) =>
      prev.includes(friendId)
        ? prev.filter((id) => id !== friendId)
        : [...prev, friendId],
    );
  }, []);

  const handleCreateGroup = useCallback(async () => {
    if (!groupName.trim()) {
      toast.error("Vui lòng nhập tên nhóm");
      return;
    }

    if (selectedFriends.length === 0) {
      toast.error("Vui lòng chọn ít nhất một thành viên");
      return;
    }

    setIsLoading(true);
    try {
      // Log dữ liệu trước khi gọi API để debug
      // Tạo nhóm với API
      // Chuyển đổi danh sách ID thành viên thành định dạng mới
      const initialMembers = selectedFriends.map((userId) => ({
        userId: userId,
        // addedById sẽ được thêm tự động trong createGroup
      }));

      // Kiểm tra currentUser có tồn tại không
      if (!currentUser || !currentUser.id) {
        toast.error("Bạn cần đăng nhập để tạo nhóm");
        setIsLoading(false);
        return;
      }

      const result = await createGroup({
        name: groupName.trim(),
        creatorId: currentUser.id, // Thêm creatorId vào payload
        initialMembers: initialMembers,
      });

      if (result.success && result.group) {
        // Nếu có file avatar, tải lên
        if (avatarFile) {
          const formData = new FormData();
          formData.append("file", avatarFile);

          const avatarResult = await updateGroupAvatar(
            result.group.id,
            formData,
          );

          if (!avatarResult.success) {
            console.error("Failed to upload group avatar:", avatarResult.error);
            // Không muốn thất bại toàn bộ quá trình nếu chỉ việc tải avatar thất bại
            toast.warning(
              "Nhóm đã được tạo nhưng không thể tải lên ảnh đại diện",
            );
          }
        }

        // Làm mới danh sách cuộc trò chuyện từ server
        if (currentUser?.id) {
          const conversationsStore = useConversationsStore.getState();
          conversationsStore.loadConversations(currentUser.id);

          // Log thông tin nhóm đã tạo
          console.log("Group created successfully:", {
            id: result.group.id,
            name: result.group.name,
            type: "GROUP",
          });
        }

        // Đóng dialog trước
        onOpenChange(false);

        // Thông báo thành công
        toast.success("Tạo nhóm thành công");

        // Sử dụng router để chuyển hướng đến trang chat
        // và truyền tham số để mở chat nhóm
        const url = `/dashboard/chat?groupId=${result.group.id}`;

        // Sử dụng setTimeout để đảm bảo store được cập nhật trước khi chuyển trang
        setTimeout(() => {
          window.location.href = url;
        }, 500);

        // Reset form
        setGroupName("");
        setSelectedFriends([]);
        setAvatarFile(null);
        setAvatarPreview(null);
      } else {
        toast.error(result.error || "Không thể tạo nhóm");
      }
    } catch (error) {
      console.error("Error creating group:", error);
      toast.error("Đã xảy ra lỗi khi tạo nhóm");
    } finally {
      setIsLoading(false);
    }
  }, [groupName, selectedFriends, avatarFile, currentUser, onOpenChange]);

  // State for search query
  const [searchQuery, setSearchQuery] = useState("");

  // Pre-select friend if provided and reset when dialog opens/closes
  useEffect(() => {
    // Reset selected friends when dialog opens/closes
    setSelectedFriends([]);

    // Only add preSelectedFriendId if dialog is open
    if (
      isOpen &&
      preSelectedFriendId &&
      friends.some((friend) => friend.id === preSelectedFriendId)
    ) {
      setSelectedFriends([preSelectedFriendId]);
    }
  }, [isOpen, preSelectedFriendId, friends]);

  // Use useMemo for filtered friends to avoid recalculating on every render
  const filteredFriends = useMemo(() => {
    if (!searchQuery.trim()) {
      return friends;
    }

    // Check if search query is a phone number or email
    const isPhone = isPhoneNumber(searchQuery);
    const isEmailValue = isEmail(searchQuery);

    // Filter friends based on search query
    return friends.filter((friend) => {
      // Search by phone number
      if (isPhone && friend.phoneNumber) {
        return friend.phoneNumber.includes(searchQuery);
      }
      // Search by email
      if (isEmailValue && friend.email) {
        return friend.email.toLowerCase().includes(searchQuery.toLowerCase());
      }
      // Search by name (default)
      return friend.fullName.toLowerCase().includes(searchQuery.toLowerCase());
    });
  }, [searchQuery, friends]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-center text-lg font-semibold">
            Tạo nhóm
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Group avatar upload */}
          <div className="flex flex-row w-full items-end justify-center">
            <div className="relative">
              <Avatar className="h-12 w-12 cursor-pointer">
                {avatarPreview ? (
                  <AvatarImage src={avatarPreview} alt="Group avatar" />
                ) : (
                  <>
                    <AvatarFallback className="bg-gray-200">
                      <Users className="h-8 w-8 text-gray-400" />
                    </AvatarFallback>
                  </>
                )}
              </Avatar>
              <label
                htmlFor="avatar-upload"
                className="absolute bottom-0 right-0 bg-blue-500 text-white p-1 rounded-full cursor-pointer"
              >
                <Upload className="h-4 w-4" />
                <input
                  id="avatar-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
              </label>
            </div>
            {/* Group name input */}
            <div className="ml-2 w-full border-b">
              <Input
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="Nhập tên nhóm..."
                className="w-full !border-none focus-visible:ring-0 focus-visible:ring-offset-0"
              />
            </div>
          </div>

          {/* Search input */}
          <div className="relative">
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

          {/* Friend selection */}
          <div>
            <div className="border rounded-md">
              <div className="p-2 border-b flex items-center justify-between">
                <span className="text-sm font-medium">Trò chuyện gần đây</span>
                <span className="text-sm text-blue-500">
                  Đã chọn: {selectedFriends.length}
                </span>
              </div>

              <ScrollArea className="h-[200px]">
                {filteredFriends.length > 0 ? (
                  <div>
                    {filteredFriends.map((friend) => (
                      <div
                        key={friend.id}
                        className="flex items-center py-2 px-3 hover:bg-gray-50 border-b border-gray-100"
                      >
                        <div className="flex items-center w-full">
                          <Checkbox
                            id={`friend-${friend.id}`}
                            checked={selectedFriends.includes(friend.id)}
                            onCheckedChange={() =>
                              handleFriendSelection(friend.id)
                            }
                            className="mr-3"
                          />
                          <Avatar className="h-10 w-10 mr-3">
                            <AvatarImage
                              src={friend.profilePictureUrl || undefined}
                              alt={friend.fullName || ""}
                            />
                            <AvatarFallback>
                              {friend.fullName?.charAt(0) || "U"}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm font-medium">
                            {friend.fullName}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 text-center text-gray-500">
                    <p>Không tìm thấy kết quả</p>
                  </div>
                )}
              </ScrollArea>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
            className="mr-2"
          >
            Hủy
          </Button>
          <Button
            onClick={handleCreateGroup}
            disabled={
              isLoading || !groupName.trim() || selectedFriends.length === 0
            }
            className="bg-blue-500 hover:bg-blue-600"
          >
            {isLoading ? (
              <>
                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                Đang tạo...
              </>
            ) : (
              "Tạo nhóm"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
