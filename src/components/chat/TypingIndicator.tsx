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
    <div className="flex justify-start mb-2 relative">
      <div className="mr-2 flex-shrink-0">
        <Avatar className="h-8 w-8">
          <AvatarImage
            src={contact.userInfo?.profilePictureUrl || ""}
            className="object-cover"
          />
          <AvatarFallback>{getUserInitials(contact)}</AvatarFallback>
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
