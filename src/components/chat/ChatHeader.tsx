"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { User, UserInfo } from "@/types/base";
import { Phone, Video, Info } from "lucide-react";

interface ChatHeaderProps {
  contact: (User & { userInfo: UserInfo }) | null;
  onToggleInfo: () => void;
}

export default function ChatHeader({ contact, onToggleInfo }: ChatHeaderProps) {
  if (!contact) {
    return (
      <div className="border-b bg-white p-4 flex items-center justify-between">
        <h2 className="font-semibold">Chọn một cuộc trò chuyện</h2>
      </div>
    );
  }

  return (
    <div className="border-b bg-white p-3 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Avatar className="h-10 w-10 border">
          <AvatarImage src={contact.userInfo.profilePictureUrl || ""} />
          <AvatarFallback>
            {contact.userInfo.fullName?.slice(0, 2).toUpperCase() || "??"}
          </AvatarFallback>
        </Avatar>
        <div>
          <h2 className="font-semibold">{contact.userInfo.fullName}</h2>
          <p className="text-xs text-gray-500">
            {contact.userInfo.statusMessage}
          </p>
        </div>
      </div>
      <div className="flex gap-2">
        <Button variant="ghost" size="icon" className="rounded-full h-9 w-9">
          <Phone className="h-5 w-5 text-gray-600" />
        </Button>
        <Button variant="ghost" size="icon" className="rounded-full h-9 w-9">
          <Video className="h-5 w-5 text-gray-600" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full h-9 w-9"
          onClick={onToggleInfo}
        >
          <Info className="h-5 w-5 text-gray-600" />
        </Button>
      </div>
    </div>
  );
}
