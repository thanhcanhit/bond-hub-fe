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
  id,
  fullName,
  profilePictureUrl,
  message,
  timeAgo,
}: FriendRequestProps) {
  return (
    <div className="bg-white rounded-md p-3 mb-4 w-[302px] h-[217px] flex flex-col justify-between shadow-sm">
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center">
            <div className="h-10 w-10 mr-2 rounded-full overflow-hidden relative flex-shrink-0">
              <Image
                src={profilePictureUrl}
                alt={fullName}
                fill
                sizes="40px"
                className="object-cover"
              />
            </div>
            <div className="font-semibold text-sm">{fullName}</div>
          </div>
          <div className="text-xs text-gray-500">{timeAgo}</div>
        </div>
        <div className="text-xs text-gray-700 mb-2 line-clamp-3 bg-gray-100 p-2 rounded-md max-h-[70px] overflow-hidden">
          {message}
        </div>
      </div>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          className="flex-1 bg-[#e5e7eb] hover:bg-gray-300 border-gray-200 text-xs h-8 font-semibold"
        >
          Từ chối
        </Button>
        <Button
          size="sm"
          className="flex-1 bg-blue-500 hover:bg-blue-600 text-white text-xs h-8 font-semibold"
        >
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
  id,
  fullName,
  profilePictureUrl,
  timeAgo,
}: SentRequestProps) {
  return (
    <div className="bg-white rounded-md p-3 mb-4 w-[302px] h-[142px] flex flex-col justify-between shadow-sm">
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center">
            <div className="h-10 w-10 mr-2 rounded-full overflow-hidden relative flex-shrink-0">
              <Image
                src={profilePictureUrl}
                alt={fullName}
                fill
                sizes="40px"
                className="object-cover"
              />
            </div>
            <div className="font-semibold text-sm">{fullName}</div>
          </div>
          <div className="text-xs text-gray-500">{timeAgo}</div>
        </div>
        <div className="text-xs text-gray-500 mb-2">Bạn đã gửi lời mời</div>
      </div>
      <div>
        <Button
          variant="outline"
          size="sm"
          className="w-full bg-[#e5e7eb] hover:bg-gray-300 border-gray-200 text-xs h-8 font-semibold"
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
          <h2 className="text-sm font-semibold mb-3">
            Lời mời đã nhận ({receivedRequests.length})
          </h2>
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
          <div className="text-gray-400 mb-4">
            <svg
              width="64"
              height="64"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M16 21V19C16 17.9391 15.5786 16.9217 14.8284 16.1716C14.0783 15.4214 13.0609 15 12 15H5C3.93913 15 2.92172 15.4214 2.17157 16.1716C1.42143 16.9217 1 17.9391 1 19V21"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M8.5 11C10.7091 11 12.5 9.20914 12.5 7C12.5 4.79086 10.7091 3 8.5 3C6.29086 3 4.5 4.79086 4.5 7C4.5 9.20914 6.29086 11 8.5 11Z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M20 8V14"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M23 11H17"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <p className="text-gray-500 text-center">
            Không có lời mời kết bạn nào
          </p>
          <p className="text-blue-500 text-sm mt-2 cursor-pointer">
            Tìm bạn bè
          </p>
        </div>
      )}
    </div>
  );
}

export default memo(FriendRequests);
