import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Ban, Pencil, Share2, UserMinus } from "lucide-react";
import { User } from "@/types/base";
import Image from "next/image";
// import { useState } from "react";

interface ProfileDialogProps {
  user: User | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  isOwnProfile?: boolean;
  onChat?: () => void;
  onCall?: () => void;
}

export default function ProfileDialog({
  user,
  isOpen,
  onOpenChange,
  isOwnProfile = false,
  onChat,
  onCall,
}: ProfileDialogProps) {
  console.log("user", user);
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent
        className={`${
          isOwnProfile ? "sm:max-w-[425px]" : "sm:max-w-[425px]"
        } max-h-[100vh] overflow-y-auto !p-0 `}
      >
        <DialogHeader className="border-b border-gray-200">
          <DialogTitle>Thông tin tài khoản</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-7">
          <div className="relative">
            <div className="relative w-full h-40 bg-gray-200">
              <div className="flex flex-col">
                <Image
                  src={
                    user?.userInfo?.coverImgUrl ||
                    "https://i.ibb.co/yncCwjgj/default-cover.jpg"
                  }
                  alt="Cover Photo"
                  fill
                  className="object-cover cursor-pointer"
                  priority={true}
                />
              </div>

              <div className="flex items-center pb-4 gap-4 absolute -bottom-16 left-2 right-0">
                <Avatar className="h-16 w-16">
                  <AvatarImage
                    src={
                      user?.userInfo?.profilePictureUrl ||
                      "https://i.ibb.co/XxXXczsK/480479681-599145336423941-8941882180530449347-n.jpg"
                    }
                  />
                  <AvatarFallback>
                    {user?.userInfo?.fullName?.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="mt-3">
                  <h3 className="text-sm font-semibold">
                    {user?.userInfo?.fullName}
                  </h3>
                  {isOwnProfile && (
                    <Button variant="ghost" size="sm">
                      <Pencil className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Call/Chat Buttons (for other users) */}
          {!isOwnProfile && (
            <div className="flex gap-2">
              <Button onClick={onCall}>Call</Button>
              <Button onClick={onChat}>Chat</Button>
            </div>
          )}
          <div className="bg-gray-300 h-3px"></div>

          <div>
            {/* Personal Information */}
            <div className="grid gap-2">
              <h4 className="font-semibold">Personal Information</h4>
              <div className="grid grid-cols-2 gap-2">
                {user?.userInfo?.bio && (
                  <div className="grid gap-2">
                    <h4 className="font-semibold">Bio</h4>
                    <p>{user.userInfo.bio}</p>
                  </div>
                )}
                {user?.userInfo?.gender && (
                  <>
                    <span className="text-gray-500">Gender</span>
                    <span>{user.userInfo.gender}</span>
                  </>
                )}
                {user?.userInfo?.dateOfBirth && (
                  <>
                    <span className="text-gray-500">Birthday</span>
                    <span>
                      {new Date(user.userInfo.dateOfBirth).toLocaleDateString()}
                    </span>
                  </>
                )}
                {user?.phoneNumber && (
                  <>
                    <span className="text-gray-500">Phone number</span>
                    <span>{isOwnProfile ? user.phoneNumber : "*********"}</span>
                  </>
                )}
              </div>
              {isOwnProfile && user?.phoneNumber && (
                <p className="text-sm text-gray-500">
                  Only friends who have saved your number in their contacts can
                  see the number
                </p>
              )}
            </div>
          </div>
          {/* Bio */}

          {/* Photos/Videos */}
          {user?.posts && user.posts.length > 0 && (
            <div className="grid gap-2">
              <h4 className="font-semibold">Photos/Videos</h4>
              <div className="grid grid-cols-3 gap-2"></div>
              <Button variant="link">View all</Button>
            </div>
          )}

          {/* Additional Options for Other User's Profile */}
          {!isOwnProfile && (
            <div className="grid gap-2">
              <div className="flex items-center gap-2">
                <UserMinus className="h-5 w-5 text-gray-500" />
                <span>Mutual group (4)</span>
              </div>
              <Button variant="ghost" className="justify-start">
                <Share2 className="h-5 w-5 mr-2 text-gray-500" />
                Share contact
              </Button>
              <Button variant="ghost" className="justify-start">
                <Ban className="h-5 w-5 mr-2 text-gray-500" />
                Block messages and calls
              </Button>
              <Button variant="ghost" className="justify-start">
                <AlertTriangle className="h-5 w-5 mr-2 text-gray-500" />
                Report
              </Button>
              <Button variant="ghost" className="justify-start text-red-500">
                <UserMinus className="h-5 w-5 mr-2" />
                Remove friend
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
