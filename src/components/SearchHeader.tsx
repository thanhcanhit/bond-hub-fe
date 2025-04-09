"use client";
import { Search, UserPlus, Users } from "lucide-react";

export default function SearchHeader() {
  return (
    <div className="w-[300px] p-4 flex items-center justify-between border-r bg-white">
      <div className="flex items-center space-x-2 border bg-gray-100 rounded-md pl-2 h-8 w-[200px]">
        <Search className="h-4 w-4 text-gray-500" />
        <input
          placeholder="Search"
          className="border-0 h-8 bg-transparent outline-none w-full"
        />
      </div>
      <div className="flex items-center space-x-2">
        <button
          className="h-8 w-8 rounded-full hover:bg-gray-100 flex items-center justify-center"
          title="Add friend"
        >
          <UserPlus className="h-5 w-5" />
        </button>
        <button
          className="h-8 w-8 rounded-full hover:bg-gray-100 flex items-center justify-center"
          title="Create group"
        >
          <Users className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
