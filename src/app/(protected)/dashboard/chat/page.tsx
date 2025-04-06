"use client";
import { useEffect, useState } from "react";
import ContactList from "@/components/chat/ContactList";
import ChatArea from "@/components/chat/ChatArea";
import ContactInfo from "@/components/chat/ContactInfo";
import { currentUser, mockContacts } from "@/data/mockData";
import { User, UserInfo } from "@/types/base";

export default function ChatPage() {
  const [isTabContentVisible, setIsTabContentVisible] = useState(true);
  const [selectedContactId, setSelectedContactId] = useState<string | null>(
    null,
  );
  const [showContactInfo, setShowContactInfo] = useState(false);

  // Handle window resize for responsive layout
  useEffect(() => {
    const handleResize = () => {
      setIsTabContentVisible(window.innerWidth >= 768);
      if (window.innerWidth < 1024) {
        setShowContactInfo(false);
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Find the selected contact
  const selectedContact = selectedContactId
    ? mockContacts.find(
        (contact) => contact.contactUser.id === selectedContactId,
      )?.contactUser
    : null;

  // Toggle contact info sidebar
  const toggleContactInfo = () => {
    setShowContactInfo((prev) => !prev);
  };

  return (
    <div className="flex h-full w-full bg-gray-100 overflow-hidden">
      {/* Left Sidebar - Contact List */}
      <div
        className={`w-[340px] bg-white border-r flex flex-col overflow-hidden ${isTabContentVisible ? "flex" : "hidden"}`}
      >
        <ContactList
          onSelectContact={setSelectedContactId}
          selectedContactId={selectedContactId}
        />
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <ChatArea
          currentUser={currentUser}
          selectedContact={
            selectedContact as (User & { userInfo: UserInfo }) | null
          }
          onToggleInfo={toggleContactInfo}
        />
      </div>

      {/* Right Sidebar - Contact Info */}
      <div
        className={`w-[340px] bg-white border-l flex flex-col overflow-hidden transition-all duration-300 ${showContactInfo ? "flex" : "hidden"}`}
      >
        <ContactInfo
          contact={selectedContact as (User & { userInfo: UserInfo }) | null}
          onClose={() => setShowContactInfo(false)}
        />
      </div>
    </div>
  );
}
