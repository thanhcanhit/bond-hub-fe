"use client";
import { memo } from "react";

function SimpleSearchHeader() {
  return (
    <div className="w-[300px] p-4 flex items-center justify-between border-r bg-white">
      <div className="flex items-center border bg-[#ebecf0] rounded-md px-2 h-8 w-[200px]">
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
      <div className="flex items-center space-x-2">
        <button
          className="h-8 w-8 rounded-full hover:bg-gray-100 flex items-center justify-center"
          title="Add friend"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
            <circle cx="9" cy="7" r="4"></circle>
            <line x1="19" x2="19" y1="8" y2="14"></line>
            <line x1="16" x2="22" y1="11" y2="11"></line>
          </svg>
        </button>
        <button
          className="h-8 w-8 rounded-full hover:bg-gray-100 flex items-center justify-center"
          title="Create group"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
            <circle cx="9" cy="7" r="4"></circle>
            <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
          </svg>
        </button>
      </div>
    </div>
  );
}

// Export memoized component to prevent unnecessary re-renders
export default memo(SimpleSearchHeader);
