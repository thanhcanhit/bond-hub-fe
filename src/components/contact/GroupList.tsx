"use client";
import { memo } from "react";
import Image from "next/image";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type GroupItemProps = {
  id: string;
  name: string;
  memberCount: number;
  imageUrl: string;
};

function GroupItem({ name, memberCount, imageUrl }: GroupItemProps) {
  return (
    <div className="group flex items-center justify-between py-3 px-1 hover:bg-[#f0f2f5] cursor-pointer relative last:after:hidden after:content-[''] after:absolute after:left-[56px] after:right-0 after:bottom-0 after:h-[0.25px] after:bg-black/20">
      <div className="flex items-center">
        <div className="h-11 w-11 mr-3 rounded-full overflow-hidden relative">
          <Image
            src={imageUrl}
            alt={name}
            fill
            sizes="44px"
            className="object-cover"
          />
          {/* Fallback if image fails to load */}
          <div className="absolute inset-0 flex items-center justify-center bg-gray-200 opacity-0">
            {name.charAt(0)}
          </div>
        </div>
        <div className="flex flex-col">
          <div className="font-medium text-sm">{name}</div>
          <div className="text-xs text-gray-500">{memberCount} thành viên</div>
        </div>
      </div>
      <div className="flex items-center">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="h-8 w-8 rounded-full flex items-center justify-center hover:bg-gray-200 outline-none focus:outline-none focus:ring-0">
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
              >
                <circle cx="12" cy="12" r="1"></circle>
                <circle cx="19" cy="12" r="1"></circle>
                <circle cx="5" cy="12" r="1"></circle>
              </svg>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem className="cursor-pointer">
              Xem thông tin
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer">
              Phân loại
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer">
              Rời cộng đồng
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="cursor-pointer text-red-500">
              Xóa nhóm
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

type GroupListProps = {
  groups: GroupItemProps[];
};

function GroupList({ groups }: GroupListProps) {
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
              />
            </div>
          </div>
        </div>

        <div className="space-y-1 overflow-auto no-scrollbar">
          {groups.map((group) => (
            <GroupItem
              key={group.id}
              id={group.id}
              name={group.name}
              memberCount={group.memberCount}
              imageUrl={group.imageUrl}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default memo(GroupList);
