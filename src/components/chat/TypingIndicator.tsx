"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getUserInitials } from "@/utils/userUtils";
import { Group, User, UserInfo } from "@/types/base";

interface TypingIndicatorProps {
  contact?: (User & { userInfo: UserInfo }) | null;
  group?: Group | null;
  isTyping: boolean;
  typingUsers?: Array<{
    userId: string;
    fullName: string;
    profilePictureUrl?: string | null;
    timestamp: Date;
  }>;
}

export default function TypingIndicator({
  contact,
  group,
  isTyping,
  typingUsers,
}: TypingIndicatorProps) {
  // Nếu không có ai đang nhập hoặc không có thông tin liên hệ/nhóm
  if (!isTyping || (!contact && !group)) return null;

  // Nếu là nhóm và có danh sách người đang nhập
  if (group && typingUsers && typingUsers.length > 0) {
    const firstUser = typingUsers[0];

    return (
      <div className="flex justify-start mb-2 relative">
        <div className="mr-2 flex-shrink-0">
          <Avatar className="h-8 w-8">
            <AvatarImage
              src={firstUser.profilePictureUrl || ""}
              className="object-cover"
            />
            <AvatarFallback>{firstUser.fullName.charAt(0)}</AvatarFallback>
          </Avatar>
        </div>
        <div className="max-w-[70%] relative overflow-visible">
          <div className="rounded-2xl px-3 py-2 break-words w-fit overflow-hidden bg-gray-200 text-gray-800 text-sm flex items-center">
            <span className="mr-1">
              {firstUser.fullName} đang nhập
              {typingUsers.length > 1 &&
                ` và ${typingUsers.length - 1} người khác`}
            </span>
            <span className="flex">
              <span className="animate-bounce mx-0.5 delay-0">.</span>
              <span className="animate-bounce mx-0.5 delay-100">.</span>
              <span className="animate-bounce mx-0.5 delay-200">.</span>
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Nếu là cuộc trò chuyện cá nhân
  return (
    <div className="flex justify-start mb-2 relative">
      <div className="mr-2 flex-shrink-0">
        <Avatar className="h-8 w-8">
          <AvatarImage
            src={contact?.userInfo?.profilePictureUrl || ""}
            className="object-cover"
          />
          <AvatarFallback>
            {contact ? getUserInitials(contact) : "?"}
          </AvatarFallback>
        </Avatar>
      </div>
      <div className="max-w-[70%] relative overflow-visible">
        <div className="rounded-2xl px-3 py-2 break-words w-fit overflow-hidden bg-gray-200 text-gray-800 text-sm flex items-center">
          <span className="mr-1">Đang nhập</span>
          <span className="flex">
            <span className="animate-bounce mx-0.5 delay-0">.</span>
            <span className="animate-bounce mx-0.5 delay-100">.</span>
            <span className="animate-bounce mx-0.5 delay-200">.</span>
          </span>
        </div>
      </div>
    </div>
  );
}
