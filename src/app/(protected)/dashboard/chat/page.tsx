// Code: src/app/%28protected%29/dashboard/chat/page.tsx
"use client";
import { useEffect, useState } from "react";
import { Search, UserPlus, Users } from "lucide-react";

import { Input } from "@/components/ui/input";
// import { Contact } from "@/types/auth";
export default function CoreUI() {
  const [isRightSidebarCollapsed] = useState(false);
  const [isTabContentVisible, setIsTabContentVisible] = useState(true);
  // const [activeFilter, setActiveFilter] = useState("friends");
  // const currentUserId = user?.id || null;
  useEffect(() => {
    const handleResize = () => {
      setIsTabContentVisible(window.innerWidth >= 1024);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div className="flex h-full bg-gray-100">
      {/* Left Sidebar - Chat List */}
      <div
        className={`w-[340px] bg-white border-r flex flex-col ${isTabContentVisible ? "flex" : "hidden"}`}
      >
        <div className="p-4 border-b flex items-center justify-between">
          <div className="flex items-center space-x-2 border bg-gray-200 rounded-md pl-2 h-8">
            <Search className="h-4 w-4" />
            <Input placeholder="Tìm kiếm" />
          </div>
          <UserPlus className="h-4 w-4" />
          <Users className="h-4 w-4" />
        </div>
        <div className="flex-1 overflow-y-scroll scroll-container custom-scrollbar"></div>
      </div>

      {/* Main Chat Area */}
      <div
        className={`flex-1 flex flex-col ${isRightSidebarCollapsed ? "w-full" : "w-[calc(100%-344px)]"} transition-all duration-300 ${isTabContentVisible ? "md:w-[calc(100%-408px)]" : "w-full"}`}
      >
        <div className="flex-1 bg-[#ebecf0] overflow-y-auto"></div>
      </div>
    </div>
  );
}
