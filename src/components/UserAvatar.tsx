import { User } from "@/types/base";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { cn } from "@/lib/utils";
import { HTMLProps } from "react";

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
        src={user?.userInfo?.profilePictureUrl || ""}
      />
      <AvatarFallback className="text-gray">
        {user?.userInfo?.fullName?.split(" ")?.map((w) => w[0])}
      </AvatarFallback>
    </Avatar>
  );
}
