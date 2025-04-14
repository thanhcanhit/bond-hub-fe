"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getUserInitials } from "@/utils/userUtils";
import { User, UserInfo } from "@/types/base";

interface TypingIndicatorProps {
  contact: (User & { userInfo: UserInfo }) | null;
  isTyping: boolean;
}

export default function TypingIndicator({
  contact,
  isTyping,
}: TypingIndicatorProps) {
  if (!isTyping || !contact) return null;

  return (
    <div className="flex items-start gap-2 mb-2 px-3">
      <Avatar className="h-8 w-8 mt-1">
        <AvatarImage
          src={contact.userInfo?.profilePictureUrl || ""}
          className="object-cover"
        />
        <AvatarFallback>{getUserInitials(contact)}</AvatarFallback>
      </Avatar>
      <div className="bg-gray-200 text-gray-800 rounded-2xl px-3 py-2 text-sm flex items-center">
        <span className="mr-1">Đang nhập</span>
        <span className="flex">
          <span className="animate-bounce mx-0.5 delay-0">.</span>
          <span className="animate-bounce mx-0.5 delay-100">.</span>
          <span className="animate-bounce mx-0.5 delay-200">.</span>
        </span>
      </div>
    </div>
  );
}
