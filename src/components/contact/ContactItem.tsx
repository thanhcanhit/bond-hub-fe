"use client";
import { memo } from "react";

type ContactItemProps = {
  id: string;
  fullName: string;
  profilePictureUrl: string;
  status?: string;
};

function ContactItem({
  id,
  fullName,
  profilePictureUrl,
  status,
}: ContactItemProps) {
  return (
    <div className="group flex items-center justify-between p-2 hover:bg-gray-100 rounded-md cursor-pointer">
      <div className="flex items-center">
        <div className="h-10 w-10 mr-3 rounded-full overflow-hidden relative">
          <img
            src={profilePictureUrl}
            alt={fullName}
            className="h-full w-full object-cover"
          />
          {/* Fallback if image fails to load */}
          <div className="absolute inset-0 flex items-center justify-center bg-gray-200 opacity-0">
            {fullName.charAt(0)}
          </div>
        </div>
        <div className="font-medium">{fullName}</div>
      </div>
      <div className="flex items-center">
        {status === "online" && (
          <div className="w-2 h-2 rounded-full bg-green-500 mr-2"></div>
        )}
        <button className="h-8 w-8 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center hover:bg-gray-200">
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
            <circle cx="12" cy="12" r="1"></circle>
            <circle cx="19" cy="12" r="1"></circle>
            <circle cx="5" cy="12" r="1"></circle>
          </svg>
        </button>
      </div>
    </div>
  );
}

// Export memoized component to prevent unnecessary re-renders
export default memo(ContactItem);
