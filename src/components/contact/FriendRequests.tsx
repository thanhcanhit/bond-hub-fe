"use client";
import { memo, useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { useFriendStore } from "@/stores/friendStore";
import { toast } from "sonner";

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
  const [isAccepting, setIsAccepting] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const { acceptRequest, rejectRequest } = useFriendStore();

  const handleAccept = async () => {
    setIsAccepting(true);
    try {
      const success = await acceptRequest(id);
      if (success) {
        toast.success(`Đã chấp nhận lời mời kết bạn từ ${fullName}`);
      } else {
        toast.error(
          "Không thể chấp nhận lời mời kết bạn. Vui lòng thử lại sau.",
        );
      }
    } catch (error) {
      console.error("Error accepting friend request:", error);
      toast.error("Đã xảy ra lỗi khi chấp nhận lời mời kết bạn");
    } finally {
      setIsAccepting(false);
    }
  };

  const handleReject = async () => {
    setIsRejecting(true);
    try {
      const success = await rejectRequest(id);
      if (success) {
        toast.success(`Đã từ chối lời mời kết bạn từ ${fullName}`);
      } else {
        toast.error("Không thể từ chối lời mời kết bạn. Vui lòng thử lại sau.");
      }
    } catch (error) {
      console.error("Error rejecting friend request:", error);
      toast.error("Đã xảy ra lỗi khi từ chối lời mời kết bạn");
    } finally {
      setIsRejecting(false);
    }
  };

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
          onClick={handleReject}
          disabled={isRejecting || isAccepting}
        >
          {isRejecting ? "Đang từ chối..." : "Từ chối"}
        </Button>
        <Button
          className="flex-1 bg-blue-500 hover:bg-blue-600 text-white text-sm h-10 font-semibold"
          onClick={handleAccept}
          disabled={isAccepting || isRejecting}
        >
          {isAccepting ? "Đang chấp nhận..." : "Đồng ý"}
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
  const [isCanceling, setIsCanceling] = useState(false);
  const { cancelRequest } = useFriendStore();

  const handleCancel = async () => {
    setIsCanceling(true);
    try {
      const success = await cancelRequest(id);
      if (success) {
        toast.success(`Đã thu hồi lời mời kết bạn đến ${fullName}`);
      } else {
        toast.error("Không thể thu hồi lời mời kết bạn. Vui lòng thử lại sau.");
      }
    } catch (error) {
      console.error("Error canceling friend request:", error);
      toast.error("Đã xảy ra lỗi khi thu hồi lời mời kết bạn");
    } finally {
      setIsCanceling(false);
    }
  };

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
          onClick={handleCancel}
          disabled={isCanceling}
        >
          {isCanceling ? "Đang thu hồi..." : "Thu hồi lời mời"}
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
