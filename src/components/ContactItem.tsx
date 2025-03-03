import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";

function ContactItem({
  name,
  phone,
  avatar,
  onClick,
}: {
  name: string;
  phone: string;
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
        <p className="font-medium">{name}</p>
        <p className="text-sm text-gray-500">{phone}</p>
      </div>
    </div>
  );
}
export default ContactItem;
