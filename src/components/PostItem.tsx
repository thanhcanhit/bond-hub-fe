import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";

function PostItem({
  user,
  content,
  time,
  avatar,
  onClick,
}: {
  user: string;
  content: string;
  time: string;
  avatar: string;
  onClick: () => void;
}) {
  return (
    <div
      className="p-2 hover:bg-gray-100 rounded-lg cursor-pointer"
      onClick={onClick}
    >
      <div className="flex items-center gap-2">
        <Avatar>
          <AvatarImage src={avatar} />
          <AvatarFallback>{user.slice(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div>
          <p className="font-medium">{user}</p>
          <p className="text-sm text-gray-500">{content}</p>
          <span className="text-xs text-gray-400">{time}</span>
        </div>
      </div>
    </div>
  );
}
export default PostItem;
