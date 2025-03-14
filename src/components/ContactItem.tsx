import { Mail, UserPlus, Users } from "lucide-react";
import { useState } from "react";

function ContactFilter({
  onFilterSelect,
}: {
  onFilterSelect: (filter: string) => void;
}) {
  const [activeFilter, setActiveFilter] = useState("friends"); // Filter mặc định là danh sách bạn bè

  const handleFilterClick = (filter: string) => {
    setActiveFilter(filter);
    onFilterSelect(filter); // Gửi filter được chọn lên parent component
  };

  return (
    <div className="p-4 border-b flex items-center gap-4">
      <div
        className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer ${
          activeFilter === "friends"
            ? "bg-blue-100 text-blue-800"
            : "hover:bg-gray-100"
        }`}
        onClick={() => handleFilterClick("friends")}
      >
        <Users className="h-4 w-4" />
        <p className="font-medium">Danh sách bạn bè</p>
      </div>
      <div
        className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer ${
          activeFilter === "groups"
            ? "bg-blue-100 text-blue-800"
            : "hover:bg-gray-100"
        }`}
        onClick={() => handleFilterClick("groups")}
      >
        <Users className="h-4 w-4" />
        <p className="font-medium">Danh sách nhóm</p>
      </div>
      <div
        className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer ${
          activeFilter === "friendRequests"
            ? "bg-blue-100 text-blue-800"
            : "hover:bg-gray-100"
        }`}
        onClick={() => handleFilterClick("friendRequests")}
      >
        <UserPlus className="h-4 w-4" />
        <p className="font-medium">Lời mời kết bạn</p>
      </div>
      <div
        className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer ${
          activeFilter === "groupInvites"
            ? "bg-blue-100 text-blue-800"
            : "hover:bg-gray-100"
        }`}
        onClick={() => handleFilterClick("groupInvites")}
      >
        <Mail className="h-4 w-4" />
        <p className="font-medium">Lời mời vào nhóm</p>
      </div>
    </div>
  );
}

export default ContactFilter;
