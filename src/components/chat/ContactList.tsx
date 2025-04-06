"use client";

import { useState } from "react";
import { Search, UserPlus, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  formatMessageTime,
  getLastMessage,
  mockContacts,
} from "@/data/mockData";
import { Contact, User, UserInfo } from "@/types/base";

type ContactWithLastMessage = Contact & {
  contactUser: User & { userInfo: UserInfo };
  lastMessage?: {
    text: string;
    time: string;
  };
};

interface ContactListProps {
  onSelectContact: (contactId: string) => void;
  selectedContactId: string | null;
}

export default function ContactList({
  onSelectContact,
  selectedContactId,
}: ContactListProps) {
  const [searchQuery, setSearchQuery] = useState("");

  // Process contacts to include last message
  const contactsWithLastMessage: ContactWithLastMessage[] = mockContacts.map(
    (contact) => {
      const lastMessage = getLastMessage(contact.contactUser.id);
      return {
        ...contact,
        lastMessage: lastMessage
          ? {
              text: lastMessage.content.text || "",
              time: formatMessageTime(lastMessage.createdAt),
            }
          : undefined,
      };
    },
  );

  // Filter contacts based on search query
  const filteredContacts = contactsWithLastMessage.filter((contact) =>
    contact.contactUser.userInfo.fullName
      ?.toLowerCase()
      .includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="flex flex-col h-full w-full">
      <div className="p-4 border-b flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-2 border rounded-md pl-2 h-9 flex-1 bg-gray-50">
          <Search className="h-4 w-4 text-gray-500" />
          <Input
            placeholder="Tìm kiếm"
            className="border-0 h-8 focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-2 ml-2">
          <UserPlus className="h-5 w-5 text-gray-600 cursor-pointer" />
          <Users className="h-5 w-5 text-gray-600 cursor-pointer" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {filteredContacts.map((contact) => (
          <div
            key={contact.id}
            className={`flex items-center gap-3 p-3 hover:bg-gray-100 cursor-pointer ${
              selectedContactId === contact.contactUser.id ? "bg-blue-50" : ""
            }`}
            onClick={() => onSelectContact(contact.contactUser.id)}
          >
            <Avatar className="h-12 w-12 border">
              <AvatarImage
                src={contact.contactUser.userInfo.profilePictureUrl || ""}
              />
              <AvatarFallback>
                {contact.contactUser.userInfo.fullName
                  ?.slice(0, 2)
                  .toUpperCase() || "??"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-center">
                <p className="font-medium truncate">
                  {contact.contactUser.userInfo.fullName}
                </p>
                {contact.lastMessage && (
                  <span className="text-xs text-gray-500 whitespace-nowrap ml-1">
                    {contact.lastMessage.time}
                  </span>
                )}
              </div>
              {contact.lastMessage && (
                <p className="text-sm text-gray-500 truncate">
                  {contact.lastMessage.text}
                </p>
              )}
              {!contact.lastMessage &&
                contact.contactUser.userInfo.statusMessage && (
                  <p className="text-sm text-gray-500 truncate">
                    {contact.contactUser.userInfo.statusMessage}
                  </p>
                )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
