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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { updateGroup } from "@/actions/group.action";
import { toast } from "sonner";
import { Group } from "@/types/base";

interface EditGroupNameDialogProps {
  group: Group | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onBack: () => void;
  onSuccess?: (updatedGroup: Group) => void;
}

export default function EditGroupNameDialog({
  group,
  isOpen,
  onOpenChange,
  onBack,
  onSuccess,
}: EditGroupNameDialogProps) {
  const [newGroupName, setNewGroupName] = useState(group?.name || "");
  const [isProcessing, setIsProcessing] = useState(false);

  // Reset the input when the dialog opens
  const handleOpenChange = (open: boolean) => {
    if (open) {
      setNewGroupName(group?.name || "");
    }
    onOpenChange(open);
  };

  const handleSubmit = async () => {
    if (!group?.id) return;

    // Validate input
    if (!newGroupName.trim()) {
      toast.error("Tên nhóm không được để trống");
      return;
    }

    setIsProcessing(true);
    try {
      const result = await updateGroup(group.id, { name: newGroupName.trim() });

      if (result.success && result.group) {
        toast.success("Đổi tên nhóm thành công");
        onOpenChange(false);

        // Call the success callback if provided
        if (onSuccess) {
          onSuccess(result.group);
        }
      } else {
        toast.error(result.error || "Không thể đổi tên nhóm");
      }
    } catch (error) {
      console.error("Error updating group name:", error);
      toast.error("Đã xảy ra lỗi khi đổi tên nhóm");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader className="flex flex-row items-center">
          <DialogTitle>Đổi tên nhóm</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center space-y-4 py-4">
          <Avatar className="h-20 w-20">
            <AvatarImage
              src={group?.avatarUrl || undefined}
              className="object-cover"
            />
            <AvatarFallback className="text-xl">
              {group?.name?.slice(0, 2).toUpperCase() || "GR"}
            </AvatarFallback>
          </Avatar>

          <div className="w-full">
            <Input
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              placeholder="Nhập tên nhóm mới..."
              className="w-full"
              autoFocus
            />
          </div>

          <p className="text-sm text-gray-500 text-center">
            Bạn có chắc chắn muốn đổi tên nhóm, khi xác nhận tên nhóm mới sẽ
            hiển thị với tất cả thành viên.
          </p>
        </div>

        <DialogFooter className="flex justify-between">
          <Button variant="outline" onClick={onBack} disabled={isProcessing}>
            Hủy
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              isProcessing ||
              !newGroupName.trim() ||
              newGroupName === group?.name
            }
          >
            {isProcessing ? (
              <>
                <div className="animate-spin h-4 w-4 border-2 border-white rounded-full border-t-transparent mr-2"></div>
                Đang xử lý...
              </>
            ) : (
              "Xác nhận"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
