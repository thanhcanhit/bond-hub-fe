import { Contact, User, Friend, Group, GroupMember } from "@/types/auth";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { useState } from "react";
import ChatContent from "./ChatContent";

function ContactContent({
  activeFilter,
  data,
  // onContactSelect,
  currentUserId,
}: {
  activeFilter: string;
  data: {
    users: User[];
    contacts: Contact[];
    friends: Friend[];
    groups: Group[];
    groupMembers: GroupMember[];
  };
  onContactSelect: (contact: Contact) => void;
  currentUserId: number; // ID của user hiện tại (số thay vì string để khớp với interface User)
}) {
  const [
    selectedContact,
    // setSelectedContact
  ] = useState<Contact | null>(null); // Contact được chọn để chat

  // const handleContactClick = (contact: Contact) => {
  //   setSelectedContact(contact); // Chọn contact
  //   onContactSelect(contact); // Gửi contact lên CoreUI để chuyển sang ChatContent
  // };

  // Logic để lọc dữ liệu dựa trên filter và interface mới
  const getFilteredItems = () => {
    switch (activeFilter) {
      case "friends":
        // Lấy danh sách bạn bè (Friend với status = ACCEPTED)
        return data.friends
          .filter((friend) => friend.status === "ACCEPTED")
          .map((friend) => {
            const friendUserId =
              friend.userOne.id === currentUserId
                ? friend.userTwo.id
                : friend.userOne.id;
            const friendUser = data.users.find(
              (user) => user.id === friendUserId,
            );
            return {
              id: Number(friend.id),
              name: friendUser?.userInfo?.fullName || "Unknown",
              phone: friendUser?.phoneNumber || "",
              avatar: friendUser?.userInfo?.profilePictureUrl || "",
              userId: friendUserId,
            };
          });
      case "groups":
        // Lấy danh sách nhóm mà user là thành viên (GroupMember với role != PENDING)
        return data.groups
          .filter((group) =>
            data.groupMembers.some(
              (member) =>
                member.group.id === group.id &&
                member.user.id === currentUserId &&
                member.role !== "PENDING",
            ),
          )
          .map((group) => ({
            id: Number(group.id),
            name: group.name,
            members: data.groupMembers.filter((m) => m.group.id === group.id)
              .length,
            avatar: group.avatarUrl,
          }));
      case "friendRequests":
        // Lấy lời mời kết bạn (Contact hoặc Friend với status = PENDING)
        return data.contacts
          .filter(
            (contact) =>
              contact.status === "PENDING" &&
              contact.contactUser.id === currentUserId,
          )
          .map((contact) => {
            const requester = data.users.find(
              (user) => user.id === contact.user.id,
            );
            return {
              id: Number(contact.id),
              name: requester?.userInfo?.fullName || "Unknown",
              phone: requester?.phoneNumber || "",
              avatar: requester?.userInfo?.profilePictureUrl || "",
            };
          });
      case "groupInvites":
        // Lấy lời mời vào nhóm (GroupMember với role = PENDING)
        return data.groupMembers
          .filter(
            (member) =>
              member.role === "PENDING" && member.user.id === currentUserId,
          )
          .map((member) => {
            const group = data.groups.find((g) => g.id === member.group.id);
            const inviter = data.users.find((u) => u.id === member.addedBy.id);
            return {
              id: Number(member.id),
              name: group?.name || "Unknown Group",
              inviter: inviter?.userInfo?.fullName || "Unknown",
              avatar: group?.avatarUrl || "",
            };
          });
      default:
        return [];
    }
  };

  const filteredItems = getFilteredItems();

  // Hiển thị nội dung dựa trên filter
  if (selectedContact) {
    return (
      <ChatContent
        chat={{
          id: Number(selectedContact.id),
          name: selectedContact.user.userInfo.fullName,
          message: "Tin nhắn đầu tiên...",
          time: new Date().toLocaleTimeString(),
          avatar: selectedContact.user.userInfo.profilePictureUrl,
          phone: selectedContact.user.phoneNumber || "",
          content: "",
        }}
      />
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4">
        {filteredItems.map((item) => (
          <div
            key={item.id}
            className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded-lg cursor-pointer"
            // onClick={() => handleContactClick({item})}
          >
            <Avatar>
              <AvatarImage src={item.avatar} />
              <AvatarFallback>
                {item.name.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="font-medium">{item.name}</p>
              {/* {item. && <p className="text-sm text-gray-500">{item.phone}</p>}
              {item.members && <p className="text-sm text-gray-500">{`${item.members} thành viên`}</p>}
              {item.inviter && <p className="text-sm text-gray-500">{`Mời bởi: ${item.inviter}`}</p>} */}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ContactContent;
