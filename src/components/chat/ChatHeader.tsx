"use client";

import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { User, UserInfo } from "@/types/base";
import { Info, Search, X } from "lucide-react";
import { useChatStore } from "@/stores/chatStore";

import { Input } from "@/components/ui/input";

import ProfileDialog from "@/components/profile/ProfileDialog";

interface ChatHeaderProps {
  contact:
    | (User & { userInfo: UserInfo; online?: boolean; lastSeen?: Date })
    | null;
  onToggleInfo: () => void;
}

export default function ChatHeader({ contact, onToggleInfo }: ChatHeaderProps) {
  const [isSearching, setIsSearching] = useState(false);
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const { searchText, setSearchText, searchMessages, clearSearch } =
    useChatStore();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchText.trim()) {
      searchMessages(searchText);
    }
  };

  const toggleSearch = () => {
    if (isSearching) {
      clearSearch();
    }
    setIsSearching(!isSearching);
  };

  if (!contact) {
    return (
      <div className="border-b bg-white p-3 h-[69px] flex items-center justify-between">
        <h2 className="font-semibold">Chọn một cuộc trò chuyện</h2>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white border-b border-gray-200 p-3 h-[69px] flex items-center justify-between">
        <div
          className="flex items-center cursor-pointer hover:bg-gray-100 p-1 rounded-md transition-colors"
          onClick={() => setShowProfileDialog(true)}
        >
          <div className="relative">
            <Avatar className="h-10 w-10 mr-3">
              <AvatarImage
                src={contact.userInfo?.profilePictureUrl || undefined}
                className="object-cover"
              />
              <AvatarFallback>
                {contact.userInfo?.fullName?.slice(0, 2).toUpperCase() || "??"}
              </AvatarFallback>
            </Avatar>
            {/* Online status indicator */}
            {contact.online && (
              <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 border-2 border-white"></span>
            )}
          </div>
          <div>
            <h2 className="text-sm font-semibold">
              {contact.userInfo?.fullName || "Người dùng"}
            </h2>
            <p className="text-xs text-gray-500">
              {contact.online
                ? "Đang hoạt động"
                : contact.lastSeen
                  ? `Hoạt động ${new Date(contact.lastSeen).toLocaleString()}`
                  : contact.userInfo?.statusMessage || "Không có trạng thái"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isSearching ? (
            <form onSubmit={handleSearch} className="flex items-center">
              <Input
                type="text"
                placeholder="Tìm kiếm tin nhắn..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="h-8 w-48 mr-2"
                autoFocus
              />
              <Button
                type="submit"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
              >
                <Search className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={toggleSearch}
                className="h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>
            </form>
          ) : (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full"
                onClick={toggleSearch}
              >
                <Search className="h-5 w-5 text-gray-500" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full"
                onClick={onToggleInfo}
              >
                <Info className="h-5 w-5 text-gray-500" />
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Profile Dialog */}
      {contact && (
        <ProfileDialog
          user={contact}
          isOpen={showProfileDialog}
          onOpenChange={setShowProfileDialog}
          isOwnProfile={false}
        />
      )}
    </>
  );
}
