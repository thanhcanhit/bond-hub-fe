"use client";

import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Group } from "@/types/base";
import { Info, Search, X, Users } from "lucide-react";
import { useChatStore } from "@/stores/chatStore";
import { Input } from "@/components/ui/input";

interface GroupChatHeaderProps {
  group: Group | null;
  onToggleInfo: () => void;
}

export default function GroupChatHeader({
  group,
  onToggleInfo,
}: GroupChatHeaderProps) {
  const [isSearching, setIsSearching] = useState(false);
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

  if (!group) {
    return (
      <div className="border-b bg-white p-3 h-[69px] flex items-center justify-between">
        <h2 className="font-semibold">Chọn một cuộc trò chuyện</h2>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white border-b border-gray-200 p-3 h-[69px] flex items-center justify-between">
        <div className="flex items-center cursor-pointer hover:bg-gray-100 p-1 rounded-md transition-colors">
          <div className="relative">
            <Avatar className="h-10 w-10 mr-3">
              <AvatarImage
                src={group.avatarUrl || undefined}
                className="object-cover"
              />
              <AvatarFallback>
                {group.name?.slice(0, 2).toUpperCase() || "GR"}
              </AvatarFallback>
            </Avatar>
          </div>
          <div>
            <h2 className="text-sm font-semibold">
              {group.name || "Nhóm chat"}
            </h2>
            <p className="text-xs text-gray-500 flex items-center">
              <Users className="h-3 w-3 mr-1" />
              {group.members?.length || 0} thành viên
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
    </>
  );
}
