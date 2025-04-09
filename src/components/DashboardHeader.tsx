"use client";
import { Search, UserPlus, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function SearchHeader() {
  return (
    <div className="w-[300px] p-4 flex items-center justify-between border-r bg-white">
      <div className="flex items-center space-x-2 border bg-gray-100 rounded-md pl-2 h-8 w-[200px]">
        <Search className="h-4 w-4 text-gray-500" />
        <Input
          placeholder="Search"
          className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 h-8 bg-transparent"
        />
      </div>
      <div className="flex items-center space-x-2">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-full hover:bg-gray-100"
          title="Add friend"
        >
          <UserPlus className="h-5 w-5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-full hover:bg-gray-100"
          title="Create group"
        >
          <Users className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}
