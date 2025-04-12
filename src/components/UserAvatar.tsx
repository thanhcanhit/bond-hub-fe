import { User } from "@/types/base";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { cn } from "@/lib/utils";
import { HTMLProps } from "react";
import { getUserInitials } from "@/utils/userUtils";

export default function UserAvatar({
  user,
  className,
}: {
  user: User;
  className?: HTMLProps<HTMLElement>["className"];
}) {
  return (
    <Avatar
      className={cn(
        "cursor-pointer h-12 w-12 border-2 border-white hover:border-blue-300 transition-all",
        className,
      )}
    >
      <AvatarImage
        className="object-cover"
        src={user?.userInfo?.profilePictureUrl || undefined}
      />
      <AvatarFallback className="text-gray">
        {getUserInitials(user)}
      </AvatarFallback>
    </Avatar>
  );
}
