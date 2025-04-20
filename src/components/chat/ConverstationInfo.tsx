"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { User, UserInfo, GroupRole } from "@/types/base";
import {
  Bell,
  ChevronRight,
  FileImage,
  Trash,
  UserX,
  X,
  Users,
} from "lucide-react";
import { formatLastActivity } from "@/utils/dateUtils";

interface ContactInfoProps {
  contact?:
    | (User & { userInfo: UserInfo; online?: boolean; lastSeen?: Date })
    | null;
  group?: {
    id: string;
    name: string;
    avatarUrl?: string | null;
    createdAt?: Date;
    memberIds?: string[];
    memberUsers?: Array<{
      id: string;
      fullName: string;
      profilePictureUrl?: string | null;
      role: GroupRole;
    }>;
  } | null;
  onClose: () => void;
}

export default function ContactInfo({
  contact,
  group,
  onClose,
}: ContactInfoProps) {
  if (!contact && !group) return null;

  // Determine if we're showing info for a user or a group
  const isGroup = !!group;

  // Simplified approach - no state, no dynamic content
  const memberCount = group?.memberUsers?.length || 0;

  return (
    <div className="h-full w-full flex flex-col bg-white">
      <div className="p-3 h-[69px] border-b flex items-center justify-between shrink-0">
        <h3 className="font-semibold">
          {isGroup ? "Thông tin nhóm" : "Thông tin hội thoại"}
        </h3>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-5 w-5" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
        {/* Profile (User or Group) */}
        <div className="flex flex-col items-center text-center">
          <div className="relative">
            <Avatar className="h-20 w-20 mb-2">
              <AvatarImage
                src={
                  isGroup
                    ? group?.avatarUrl || undefined
                    : contact?.userInfo.profilePictureUrl || undefined
                }
                className="object-cover"
              />
              <AvatarFallback>
                {isGroup
                  ? group?.name?.slice(0, 2).toUpperCase() || "GP"
                  : contact?.userInfo.fullName?.slice(0, 2).toUpperCase() ||
                    "??"}
              </AvatarFallback>
            </Avatar>
            {/* Online status indicator for users */}
            {!isGroup && contact?.online && (
              <span className="absolute bottom-2 right-0 h-4 w-4 rounded-full bg-green-500 border-2 border-white"></span>
            )}
            {/* Group indicator for groups */}
            {isGroup && (
              <span className="absolute bottom-2 right-0 h-6 w-6 rounded-full bg-blue-500 border-2 border-white flex items-center justify-center">
                <Users className="h-3 w-3 text-white" />
              </span>
            )}
          </div>
          <h3 className="font-semibold text-lg">
            {isGroup ? group?.name : contact?.userInfo.fullName}
          </h3>
          {isGroup ? (
            <p className="text-sm text-gray-500">{memberCount} thành viên</p>
          ) : (
            <p className="text-sm text-gray-500">
              {contact?.online
                ? "Đang hoạt động"
                : contact?.lastSeen
                  ? `Hoạt động ${formatLastActivity(contact.lastSeen)}`
                  : contact?.userInfo.statusMessage || "Không có trạng thái"}
            </p>
          )}

          <div className="flex gap-2 mt-3">
            <Button variant="outline" size="sm" className="rounded-full">
              Nhắn tin
            </Button>
            {!isGroup && (
              <Button variant="outline" size="sm" className="rounded-full">
                Gọi điện
              </Button>
            )}
          </div>
        </div>

        {/* Shared Media */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <h4 className="font-medium">Ảnh/Video</h4>
            <Button variant="ghost" size="sm" className="text-blue-500 h-8">
              Xem tất cả
            </Button>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="aspect-square bg-gray-200 rounded-md"></div>
            <div className="aspect-square bg-gray-200 rounded-md"></div>
            <div className="aspect-square bg-gray-200 rounded-md"></div>
            <div className="aspect-square bg-gray-200 rounded-md"></div>
            <div className="aspect-square bg-gray-200 rounded-md"></div>
            <div className="aspect-square bg-gray-200 rounded-md"></div>
          </div>
        </div>

        {/* Files */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <h4 className="font-medium">File</h4>
            <Button variant="ghost" size="sm" className="text-blue-500 h-8">
              Xem tất cả
            </Button>
          </div>

          <div className="space-y-2">
            <div className="flex items-center p-2 border rounded-md">
              <div className="bg-blue-100 p-2 rounded-md mr-3">
                <FileImage className="h-5 w-5 text-blue-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">Document-1.pdf</p>
                <p className="text-xs text-gray-500">2.5 MB</p>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center p-2 border rounded-md">
              <div className="bg-blue-100 p-2 rounded-md mr-3">
                <FileImage className="h-5 w-5 text-blue-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">Document-2.pdf</p>
                <p className="text-xs text-gray-500">2.5 MB</p>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Settings */}
        <div className="space-y-4">
          <h4 className="font-medium">Cài đặt hội thoại</h4>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Bell className="h-5 w-5 mr-3 text-gray-500" />
                <span>Thông báo</span>
              </div>
              <div className="relative inline-flex h-[24px] w-[44px] shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 bg-blue-500">
                <span className="pointer-events-none inline-block h-[20px] w-[20px] rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out translate-x-5" />
              </div>
            </div>

            {!isGroup && (
              <Button
                variant="ghost"
                className="w-full justify-start text-red-500 pl-2"
              >
                <UserX className="h-5 w-5 mr-3" />
                <span>Chặn liên hệ</span>
              </Button>
            )}

            {isGroup && (
              <Button
                variant="ghost"
                className="w-full justify-start text-red-500 pl-2"
              >
                <UserX className="h-5 w-5 mr-3" />
                <span>Rời nhóm</span>
              </Button>
            )}

            <Button
              variant="ghost"
              className="w-full justify-start text-red-500 pl-2"
            >
              <Trash className="h-5 w-5 mr-3" />
              <span>Xóa cuộc trò chuyện</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
