"use client";
import { memo, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useChatStore } from "@/stores/chatStore";

type GroupItemProps = {
  id: string;
  name: string;
  memberCount: number;
  imageUrl: string;
  avatarUrl?: string | null;
  onClick?: (id: string) => void;
};

function GroupItem({
  id,
  name,
  memberCount,
  imageUrl,
  avatarUrl,
  onClick,
}: GroupItemProps) {
  const handleClick = () => {
    if (onClick) {
      onClick(id);
    }
  };
  return (
    <div
      className="group flex items-center justify-between py-3 px-1 hover:bg-[#f0f2f5] cursor-pointer relative last:after:hidden after:content-[''] after:absolute after:left-[56px] after:right-0 after:bottom-0 after:h-[0.25px] after:bg-black/20"
      onClick={handleClick}
    >
      <div className="flex items-center">
        <Avatar className="h-11 w-11 mr-3">
          {(avatarUrl || imageUrl) && (
            <AvatarImage
              src={avatarUrl || imageUrl}
              alt={name}
              className="object-cover"
            />
          )}
          <AvatarFallback className="text-base font-medium bg-gray-200 text-gray-700">
            {name.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex flex-col">
          <div className="font-medium text-sm">{name}</div>
          <div className="text-xs text-gray-500">{memberCount} thành viên</div>
        </div>
      </div>
    </div>
  );
}

type GroupListProps = {
  groups: GroupItemProps[];
};

function GroupList({ groups }: GroupListProps) {
  const router = useRouter();
  const { openChat } = useChatStore();
  const [searchQuery, setSearchQuery] = useState("");

  const handleGroupClick = async (groupId: string) => {
    try {
      // Open the chat with the selected group
      const success = await openChat(groupId, "GROUP");

      if (success) {
        // Navigate to the chat page
        router.push(`/dashboard/chat?groupId=${groupId}`);
      }
    } catch (error) {
      console.error("Error opening group chat:", error);
    }
  };
  // Filter groups based on search query
  const filteredGroups = useMemo(() => {
    if (!searchQuery.trim()) return groups;

    return groups.filter((group) =>
      group.name.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [groups, searchQuery]);

  return (
    <div className="bg-white rounded-md shadow-sm overflow-hidden no-scrollbar">
      <div className="p-4 bg-white">
        <div className="flex items-center justify-between mb-4">
          <div className="relative w-full">
            <div className="flex items-center border bg-[#ebecf0] rounded-md px-2 h-8 w-full">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4 flex-shrink-0 my-auto"
              >
                <circle cx="11" cy="11" r="8"></circle>
                <path d="m21 21-4.3-4.3"></path>
              </svg>
              <input
                placeholder="Tìm kiếm"
                className="border-0 h-8 bg-transparent outline-none w-full placeholder:text-[0.8125rem] ml-2 py-0"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="space-y-1 overflow-auto no-scrollbar">
          {filteredGroups.length > 0 ? (
            filteredGroups.map((group) => (
              <GroupItem
                key={group.id}
                id={group.id}
                name={group.name}
                memberCount={group.memberCount}
                imageUrl={group.imageUrl}
                avatarUrl={group.avatarUrl}
                onClick={handleGroupClick}
              />
            ))
          ) : (
            <div className="text-center py-4 text-gray-500">
              Không tìm thấy nhóm nào phù hợp
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default memo(GroupList);
