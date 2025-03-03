import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";

function ChatItem({
  name,
  message,
  time,
  avatar,
  onClick,
}: {
  name: string;
  message: string;
  time: string;
  avatar: string;
  onClick: () => void;
}) {
  return (
    <div
      className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded-lg cursor-pointer"
      onClick={onClick}
    >
      <Avatar>
        <AvatarImage src={avatar} />
        <AvatarFallback>{name.slice(0, 2).toUpperCase()}</AvatarFallback>
      </Avatar>
      <div className="flex-1">
        <div className="flex justify-between">
          <p className="font-medium">{name}</p>
          <span className="text-xs text-gray-500">{time}</span>
        </div>
        <p className="text-sm text-gray-500 truncate">{message}</p>
      </div>
    </div>
  );
}
export default ChatItem;
