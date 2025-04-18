"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Users, Upload, UserPlus } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { createGroup, updateGroupAvatar } from "@/actions/group.action";
import { toast } from "sonner";
import { useFriendStore } from "@/stores/friendStore";
// import { useChatStore } from "@/stores/chatStore"; // Không cần thiết nữa
import { useConversationsStore } from "@/stores/conversationsStore";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";

interface CreateGroupDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CreateGroupDialog({
  isOpen,
  onOpenChange,
}: CreateGroupDialogProps) {
  const [groupName, setGroupName] = useState("");
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const { user: currentUser } = useAuthStore();
  const { friends } = useFriendStore();

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFriendSelection = (friendId: string) => {
    setSelectedFriends((prev) =>
      prev.includes(friendId)
        ? prev.filter((id) => id !== friendId)
        : [...prev, friendId],
    );
  };

  const handleCreateGroup = async () => {
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
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-center text-xl font-semibold">
            Tạo nhóm mới
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Group avatar upload */}
          <div className="flex flex-col items-center justify-center">
            <div className="relative">
              <Avatar className="h-24 w-24 cursor-pointer">
                {avatarPreview ? (
                  <AvatarImage src={avatarPreview} alt="Group avatar" />
                ) : (
                  <>
                    <AvatarFallback className="bg-gray-200">
                      <Users className="h-12 w-12 text-gray-400" />
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
            <p className="text-xs text-gray-500 mt-2">
              Tải lên ảnh đại diện nhóm (không bắt buộc)
            </p>
          </div>

          {/* Group name input */}
          <div className="space-y-2">
            <Label htmlFor="group-name">Tên nhóm</Label>
            <Input
              id="group-name"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="Nhập tên nhóm"
            />
          </div>

          {/* Friend selection */}
          <div className="space-y-2">
            <Label>Thêm thành viên</Label>
            <div className="border rounded-md">
              <div className="p-2 border-b flex items-center justify-between">
                <span className="text-sm font-medium">
                  Bạn bè ({friends.length})
                </span>
                <span className="text-sm text-blue-500">
                  Đã chọn: {selectedFriends.length}
                </span>
              </div>

              <ScrollArea className="h-[200px]">
                {friends.length > 0 ? (
                  <div className="p-2 space-y-2">
                    {friends.map((friend) => (
                      <div
                        key={friend.id}
                        className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-md"
                      >
                        <div className="flex items-center">
                          <Avatar className="h-8 w-8 mr-2">
                            <AvatarImage
                              src={friend.profilePictureUrl || ""}
                              alt={friend.fullName || ""}
                            />
                            <AvatarFallback>
                              {friend.fullName?.charAt(0) || "U"}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm">{friend.fullName}</span>
                        </div>
                        <Checkbox
                          checked={selectedFriends.includes(friend.id)}
                          onCheckedChange={() =>
                            handleFriendSelection(friend.id)
                          }
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 text-center text-gray-500">
                    <UserPlus className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                    <p>Bạn chưa có bạn bè nào</p>
                    <p className="text-xs mt-1">Hãy thêm bạn bè để tạo nhóm</p>
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
          >
            Hủy
          </Button>
          <Button
            onClick={handleCreateGroup}
            disabled={
              isLoading || !groupName.trim() || selectedFriends.length === 0
            }
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
