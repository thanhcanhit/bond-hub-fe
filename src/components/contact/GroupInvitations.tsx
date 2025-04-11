"use client";
import { memo } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";

type GroupInvitationProps = {
  id: string;
  groupName: string;
  groupImageUrl: string;
  inviterName: string;
  inviterImageUrl: string;
  memberCount: number;
};

function GroupInvitationItem({
  id,
  groupName,
  groupImageUrl,
  inviterName,
  inviterImageUrl,
  memberCount,
}: GroupInvitationProps) {
  return (
    <div className="bg-white rounded-md p-4 mb-4">
      <div className="flex">
        <div className="h-16 w-16 mr-3 rounded-md overflow-hidden relative flex-shrink-0">
          <Image
            src={groupImageUrl}
            alt={groupName}
            fill
            sizes="64px"
            className="object-cover"
          />
        </div>
        <div className="flex-1">
          <div className="font-medium">{groupName}</div>
          <div className="flex items-center mt-1 mb-2">
            <div className="h-5 w-5 rounded-full overflow-hidden relative mr-2">
              <Image
                src={inviterImageUrl}
                alt={inviterName}
                fill
                sizes="20px"
                className="object-cover"
              />
            </div>
            <span className="text-xs text-gray-500">
              {inviterName} đã mời bạn tham gia • {memberCount} thành viên
            </span>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1 bg-gray-100 hover:bg-gray-200 border-gray-200"
            >
              Từ chối
            </Button>
            <Button className="flex-1 bg-blue-500 hover:bg-blue-600 text-white">
              Tham gia
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

type GroupInvitationsProps = {
  invitations: GroupInvitationProps[];
};

function GroupInvitations({ invitations }: GroupInvitationsProps) {
  return (
    <div>
      {invitations.length > 0 ? (
        <div className="space-y-2">
          {invitations.map((invitation) => (
            <GroupInvitationItem
              key={invitation.id}
              id={invitation.id}
              groupName={invitation.groupName}
              groupImageUrl={invitation.groupImageUrl}
              inviterName={invitation.inviterName}
              inviterImageUrl={invitation.inviterImageUrl}
              memberCount={invitation.memberCount}
            />
          ))}
        </div>
      ) : (
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
                d="M17 21V19C17 16.7909 15.2091 15 13 15H5C2.79086 15 1 16.7909 1 19V21"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M9 11C11.2091 11 13 9.20914 13 7C13 4.79086 11.2091 3 9 3C6.79086 3 5 4.79086 5 7C5 9.20914 6.79086 11 9 11Z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M23 21V19C22.9986 17.1771 21.765 15.5857 20 15.13"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M16 3.13C17.7699 3.58317 19.0078 5.17799 19.0078 7.005C19.0078 8.83201 17.7699 10.4268 16 10.88"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <p className="text-gray-500 text-center">
            Không có lời mời vào nhóm và cộng đồng
          </p>
          <p className="text-blue-500 text-sm mt-2 cursor-pointer">
            Tìm hiểu thêm
          </p>
        </div>
      )}
    </div>
  );
}

export default memo(GroupInvitations);
