"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { User, UserInfo } from "@/types/base";
import { Bell, ChevronRight, FileImage, Trash, UserX, X } from "lucide-react";
import Image from "next/image";

interface ContactInfoProps {
  contact:
    | (User & { userInfo: UserInfo; online?: boolean; lastSeen?: Date })
    | null;
  onClose: () => void;
}

export default function ContactInfo({ contact, onClose }: ContactInfoProps) {
  if (!contact) return null;

  return (
    <div className="h-full w-full flex flex-col bg-white">
      <div className="p-3 h-[69px] border-b flex items-center justify-between shrink-0">
        <h3 className="font-semibold">Thông tin hội thoại</h3>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-5 w-5" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
        {/* Contact Profile */}
        <div className="flex flex-col items-center text-center">
          <div className="relative">
            <Avatar className="h-20 w-20 mb-2">
              <AvatarImage
                src={contact.userInfo.profilePictureUrl || ""}
                className="object-cover"
              />
              <AvatarFallback>
                {contact.userInfo.fullName?.slice(0, 2).toUpperCase() || "??"}
              </AvatarFallback>
            </Avatar>
            {/* Online status indicator */}
            {contact.online && (
              <span className="absolute bottom-2 right-0 h-4 w-4 rounded-full bg-green-500 border-2 border-white"></span>
            )}
          </div>
          <h3 className="font-semibold text-lg">{contact.userInfo.fullName}</h3>
          <p className="text-sm text-gray-500">
            {contact.online
              ? "Đang hoạt động"
              : contact.lastSeen
                ? `Hoạt động ${new Date(contact.lastSeen).toLocaleString()}`
                : contact.userInfo.statusMessage || "Không có trạng thái"}
          </p>

          <div className="flex gap-2 mt-3">
            <Button variant="outline" size="sm" className="rounded-full">
              Nhắn tin
            </Button>
            <Button variant="outline" size="sm" className="rounded-full">
              Gọi điện
            </Button>
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
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="aspect-square bg-gray-200 rounded-md overflow-hidden"
              >
                <Image
                  src={`https://picsum.photos/200/200?random=${index}`}
                  alt={`Media ${index + 1}`}
                  className="w-full h-full object-cover"
                  width={200}
                  height={200}
                />
              </div>
            ))}
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
            {Array.from({ length: 2 }).map((_, index) => (
              <div
                key={index}
                className="flex items-center p-2 border rounded-md"
              >
                <div className="bg-blue-100 p-2 rounded-md mr-3">
                  <FileImage className="h-5 w-5 text-blue-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">
                    Document-{index + 1}.pdf
                  </p>
                  <p className="text-xs text-gray-500">2.5 MB</p>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            ))}
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
              <Switch />
            </div>

            <Button
              variant="ghost"
              className="w-full justify-start text-red-500 pl-2"
            >
              <UserX className="h-5 w-5 mr-3" />
              <span>Chặn liên hệ</span>
            </Button>

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
