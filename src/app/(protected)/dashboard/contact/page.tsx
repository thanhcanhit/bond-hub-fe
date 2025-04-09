"use client";
import { useState, useMemo } from "react";
import ContactSidebar from "@/components/contact/ContactSidebar";
import ContactList from "@/components/contact/ContactList";
import SimpleSearchHeader from "@/components/SimpleSearchHeader";

type Friend = {
  id: string;
  fullName: string;
  profilePictureUrl: string;
  status: string;
};

// Sample data - defined outside component to prevent recreation
const mockFriends: Friend[] = [
  {
    id: "1",
    fullName: "Anh Trung",
    profilePictureUrl: "https://i.pravatar.cc/150?img=1",
    status: "online",
  },
  {
    id: "2",
    fullName: "Anh Ty",
    profilePictureUrl: "https://i.pravatar.cc/150?img=2",
    status: "offline",
  },
  {
    id: "3",
    fullName: "Anny Kim",
    profilePictureUrl: "https://i.pravatar.cc/150?img=3",
    status: "online",
  },
  {
    id: "4",
    fullName: "Ba",
    profilePictureUrl: "https://i.pravatar.cc/150?img=4",
    status: "offline",
  },
  {
    id: "5",
    fullName: "Ba Ngoai",
    profilePictureUrl: "https://i.pravatar.cc/150?img=5",
    status: "online",
  },
  {
    id: "6",
    fullName: "Beo Photocopy - Printing",
    profilePictureUrl: "https://i.pravatar.cc/150?img=6",
    status: "offline",
  },
  {
    id: "7",
    fullName: "Dũng",
    profilePictureUrl: "https://i.pravatar.cc/150?img=7",
    status: "online",
  },
  {
    id: "8",
    fullName: "Hà",
    profilePictureUrl: "https://i.pravatar.cc/150?img=8",
    status: "offline",
  },
  {
    id: "9",
    fullName: "Hùng",
    profilePictureUrl: "https://i.pravatar.cc/150?img=9",
    status: "online",
  },
  {
    id: "10",
    fullName: "Khánh",
    profilePictureUrl: "https://i.pravatar.cc/150?img=10",
    status: "offline",
  },
  {
    id: "11",
    fullName: "Linh",
    profilePictureUrl: "https://i.pravatar.cc/150?img=11",
    status: "online",
  },
  {
    id: "12",
    fullName: "Đạt",
    profilePictureUrl: "https://i.pravatar.cc/150?img=12",
    status: "offline",
  },
  {
    id: "13",
    fullName: "Hà Anh",
    profilePictureUrl: "https://i.pravatar.cc/150?img=13",
    status: "online",
  },
  {
    id: "14",
    fullName: "Hùng Nguyễn",
    profilePictureUrl: "https://i.pravatar.cc/150?img=14",
    status: "offline",
  },
  {
    id: "15",
    fullName: "Khánh Trần",
    profilePictureUrl: "https://i.pravatar.cc/150?img=15",
    status: "online",
  },
  {
    id: "16",
    fullName: "Linh Nguyễn",
    profilePictureUrl: "https://i.pravatar.cc/150?img=16",
    status: "offline",
  },
];

// Export the component directly
export default function ContactPage() {
  const [activeTab, setActiveTab] = useState<string>("friends");
  // Use the mockFriends directly instead of storing in state
  const friends = mockFriends;

  // Get title based on active tab using useMemo to avoid recalculation
  const tabTitle = useMemo(() => {
    switch (activeTab) {
      case "friends":
        return "Contacts";
      case "groups":
        return "Groups and Communities";
      case "requests":
        return "Friend Requests";
      case "invitations":
        return "Group Invitations";
      default:
        return "Contacts";
    }
  }, [activeTab]);

  return (
    <div className="flex flex-col flex-1 h-full w-full overflow-hidden">
      <div className="flex border-b bg-white">
        <SimpleSearchHeader />
        <div className="flex-1 p-4">
          <h1 className="text-lg font-semibold">{tabTitle}</h1>
        </div>
      </div>

      <div className="flex flex-1">
        {/* Left Sidebar - Contact Tabs */}
        <ContactSidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          contactCount={friends.length}
        />

        <div className="flex flex-col flex-1">
          {/* Main Content - Friend List */}
          <ContactList friends={friends} title={tabTitle} />
        </div>
      </div>
    </div>
  );
}
