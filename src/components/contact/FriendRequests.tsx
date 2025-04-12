"use client";
import { memo } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";

type FriendRequestProps = {
  id: string;
  fullName: string;
  profilePictureUrl: string;
  message: string;
  timeAgo: string;
};

function FriendRequestItem({
  // id is kept for future functionality
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  id,
  fullName,
  profilePictureUrl,
  message,
  timeAgo,
}: FriendRequestProps) {
  return (
    <div className="bg-white rounded-md p-4 mb-4 w-[302px] shadow-sm">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center">
          <div className="h-10 w-10 mr-3 rounded-full overflow-hidden relative flex-shrink-0">
            <Image
              src={profilePictureUrl}
              alt={fullName}
              fill
              sizes="40px"
              className="object-cover"
            />
          </div>
          <div>
            <div className="font-semibold text-sm">{fullName}</div>
            <div className="text-xs text-gray-500">{timeAgo}</div>
          </div>
        </div>
        <button className="text-gray-500 hover:text-gray-700">
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
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
            <polyline points="22,6 12,13 2,6"></polyline>
          </svg>
        </button>
      </div>

      <div className="text-sm text-gray-700 mb-4 bg-[#ebecf0] p-3 rounded-md">
        {message.length > 150 ? `${message.substring(0, 150)}...` : message}
      </div>

      <div className="flex gap-2">
        <Button
          variant="outline"
          className="flex-1 bg-[#e5e7eb] hover:bg-gray-300 border-gray-200 text-sm h-10 font-semibold"
        >
          Từ chối
        </Button>
        <Button className="flex-1 bg-blue-500 hover:bg-blue-600 text-white text-sm h-10 font-semibold">
          Đồng ý
        </Button>
      </div>
    </div>
  );
}

type SentRequestProps = {
  id: string;
  fullName: string;
  profilePictureUrl: string;
  timeAgo: string;
};

function SentRequestItem({
  // id is kept for future functionality
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  id,
  fullName,
  profilePictureUrl,
  timeAgo,
}: SentRequestProps) {
  return (
    <div className="bg-white rounded-md p-4 mb-4 w-[302px] shadow-sm">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center">
          <div className="h-10 w-10 mr-3 rounded-full overflow-hidden relative flex-shrink-0">
            <Image
              src={profilePictureUrl}
              alt={fullName}
              fill
              sizes="40px"
              className="object-cover"
            />
          </div>
          <div>
            <div className="font-semibold text-sm">{fullName}</div>
            <div className="text-xs text-gray-500">{timeAgo}</div>
          </div>
        </div>
      </div>

      <div className="mt-4">
        <Button
          variant="outline"
          className="w-full bg-[#e5e7eb] hover:bg-gray-300 border-gray-200 text-sm h-10 font-semibold"
        >
          Thu hồi lời mời
        </Button>
      </div>
    </div>
  );
}

type FriendRequestsProps = {
  receivedRequests: FriendRequestProps[];
  sentRequests: SentRequestProps[];
};

function FriendRequests({
  receivedRequests,
  sentRequests,
}: FriendRequestsProps) {
  return (
    <div className="space-y-6 overflow-auto no-scrollbar">
      {receivedRequests.length > 0 && (
        <div>
          <div className="flex flex-wrap gap-4 overflow-auto no-scrollbar">
            {receivedRequests.map((request) => (
              <FriendRequestItem
                key={request.id}
                id={request.id}
                fullName={request.fullName}
                profilePictureUrl={request.profilePictureUrl}
                message={request.message}
                timeAgo={request.timeAgo}
              />
            ))}
          </div>
        </div>
      )}

      {sentRequests.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold mb-3">
            Lời mời đã gửi ({sentRequests.length})
          </h2>
          <div className="flex flex-wrap gap-4 overflow-auto no-scrollbar">
            {sentRequests.map((request) => (
              <SentRequestItem
                key={request.id}
                id={request.id}
                fullName={request.fullName}
                profilePictureUrl={request.profilePictureUrl}
                timeAgo={request.timeAgo}
              />
            ))}
          </div>
        </div>
      )}

      {receivedRequests.length === 0 && sentRequests.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="mb-4">
            <Image
              src="/mailbox.png"
              alt="No friend requests"
              width={120}
              height={120}
            />
          </div>
          <p className="text-gray-500 text-center">Bạn không có lời mời nào</p>
        </div>
      )}
    </div>
  );
}

export default memo(FriendRequests);
