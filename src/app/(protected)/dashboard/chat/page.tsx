"use client";
import { useEffect, useState, useCallback } from "react";
import SearchHeader from "@/components/SearchHeader";

export default function ChatPage() {
  // Use constants for values that don't change
  const isRightSidebarCollapsed = false;
  const [isTabContentVisible, setIsTabContentVisible] = useState(true);

  // Memoize the resize handler to prevent recreation on each render
  const handleResize = useCallback(() => {
    setIsTabContentVisible(window.innerWidth >= 1024);
  }, []);

  // Only run effect once on mount
  useEffect(() => {
    // Set initial state
    handleResize();

    // Add event listener
    window.addEventListener("resize", handleResize);

    // Clean up on unmount
    return () => window.removeEventListener("resize", handleResize);
  }, [handleResize]);

  return (
    <div className="flex flex-col flex-1 h-full w-full overflow-hidden">
      <div className="flex border-b bg-white">
        <SearchHeader />
        <div className="flex-1 p-4">
          <h1 className="text-lg font-semibold">Chat</h1>
        </div>
      </div>

      <div className="flex flex-1 bg-gray-100">
        {/* Left Sidebar - Chat List */}
        <div
          className={`w-[340px] bg-white border-r flex flex-col ${isTabContentVisible ? "flex" : "hidden"}`}
        >
          <div className="flex-1 overflow-y-scroll scroll-container custom-scrollbar"></div>
        </div>

        {/* Main Chat Area */}
        <div
          className={`flex-1 flex flex-col ${isRightSidebarCollapsed ? "w-full" : "w-[calc(100%-344px)]"} transition-all duration-300 ${isTabContentVisible ? "md:w-[calc(100%-408px)]" : "w-full"}`}
        >
          <div className="flex-1 bg-[#ebecf0] overflow-y-auto"></div>
        </div>
      </div>
    </div>
  );
}
