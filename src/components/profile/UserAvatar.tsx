import { User } from "@/types/base";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { cn } from "@/lib/utils";
import { HTMLProps, useEffect, useState } from "react";
import { getUserInitials } from "@/utils/userUtils";

export default function UserAvatar({
  user,
  className,
}: {
  user: User;
  className?: HTMLProps<HTMLElement>["className"];
}) {
  // Sử dụng state thay vì useMemo để đảm bảo component re-render khi URL thay đổi
  const [profileImageSrc, setProfileImageSrc] = useState<string | null>(null);
  // Thêm state để theo dõi khi nào cần cập nhật URL
  const [imageVersion, setImageVersion] = useState<number>(0);

  // Cập nhật URL khi user hoặc imageVersion thay đổi
  useEffect(() => {
    if (
      !user?.userInfo?.profilePictureUrl ||
      user.userInfo.profilePictureUrl === ""
    ) {
      setProfileImageSrc(null);
      return;
    }

    // Tạo URL mới với timestamp để tránh cache
    const newSrc = `${user.userInfo.profilePictureUrl}?t=${new Date().getTime()}-v${imageVersion}`;
    setProfileImageSrc(newSrc);
  }, [user?.userInfo?.profilePictureUrl, imageVersion]);

  // Cập nhật imageVersion mỗi khi component mount để đảm bảo luôn tải hình ảnh mới nhất
  useEffect(() => {
    setImageVersion((prev) => prev + 1);
  }, []);

  return (
    <Avatar
      className={cn(
        "cursor-pointer h-12 w-12 border-2 border-white hover:border-blue-300 transition-all",
        className,
      )}
    >
      <AvatarImage
        className="object-cover"
        src={profileImageSrc || undefined}
        onError={() => {
          // Nếu hình ảnh không tải được, thử lại với version mới
          setImageVersion((prev) => prev + 1);
        }}
      />
      <AvatarFallback className="text-gray">
        {getUserInitials(user)}
      </AvatarFallback>
    </Avatar>
  );
}
