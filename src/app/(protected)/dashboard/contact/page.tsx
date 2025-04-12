"use client";
import { useState, useMemo, useEffect } from "react";
import { Users, UserPlus, UsersRound, UserRoundPlus } from "lucide-react";
import ContactSidebar from "@/components/contact/ContactSidebar";
import ContactList from "@/components/contact/ContactList";
import GroupList from "@/components/contact/GroupList";
import FriendRequests from "@/components/contact/FriendRequests";
import GroupInvitations from "@/components/contact/GroupInvitations";
import SearchHeader from "@/components/SearchHeader";
import { useFriendStore } from "@/stores/friendStore";

// Define types for UI components
type Group = {
  id: string;
  name: string;
  memberCount: number;
  imageUrl: string;
};

type GroupInvitation = {
  id: string;
  groupName: string;
  groupImageUrl: string;
  inviterName: string;
  inviterImageUrl: string;
  memberCount: number;
};

// Export the component directly
export default function ContactPage() {
  const [activeTab, setActiveTab] = useState<string>("friends");

  // Mock data for groups - will be replaced with real API data later
  const [mockGroups] = useState<Group[]>([
    {
      id: "1",
      name: "Nhóm 03: KHÁCH VIP KHỐ GÀ 2AE",
      memberCount: 452,
      imageUrl: "https://i.pravatar.cc/150?img=50",
    },
    {
      id: "2",
      name: "Vodka",
      memberCount: 4,
      imageUrl: "https://i.pravatar.cc/150?img=51",
    },
    {
      id: "3",
      name: "TTHCM T4/TIẾT 1-3/HK2/2024-2025",
      memberCount: 63,
      imageUrl: "https://i.pravatar.cc/150?img=52",
    },
    {
      id: "4",
      name: "SinhVien_Nganh_SE_Khoa 17",
      memberCount: 345,
      imageUrl: "https://i.pravatar.cc/150?img=53",
    },
    {
      id: "5",
      name: "Hủy diệt thầy Thắng",
      memberCount: 5,
      imageUrl: "https://i.pravatar.cc/150?img=54",
    },
    {
      id: "6",
      name: "Săn Sale Bí Mật Cùng Tiệm Giày Boot 2",
      memberCount: 977,
      imageUrl: "https://i.pravatar.cc/150?img=55",
    },
  ]);

  const [mockGroupInvitations] = useState<GroupInvitation[]>([]);

  // Get friend data from store
  const {
    friends,
    receivedRequests,
    sentRequests,
    fetchFriends,
    fetchReceivedRequests,
    fetchSentRequests,
  } = useFriendStore();

  // Fetch data when component mounts
  useEffect(() => {
    fetchFriends();
    fetchReceivedRequests();
    fetchSentRequests();
  }, [fetchFriends, fetchReceivedRequests, fetchSentRequests]);

  // Get title and count based on active tab
  const { title, count } = useMemo(() => {
    switch (activeTab) {
      case "friends":
        return { title: "Bạn bè", count: friends.length };
      case "groups":
        return { title: "Nhóm và cộng đồng", count: mockGroups.length };
      case "requests":
        return {
          title: "Lời mời kết bạn",
          count: receivedRequests.length + sentRequests.length,
        };
      case "invitations":
        return {
          title: "Lời mời vào nhóm và cộng đồng",
          count: mockGroupInvitations.length,
        };
      default:
        return { title: "Danh bạ", count: 0 };
    }
  }, [
    activeTab,
    friends.length,
    receivedRequests.length,
    sentRequests.length,
    mockGroups.length,
    mockGroupInvitations.length,
  ]);

  // Map tab IDs to their corresponding icons
  const tabIcons = useMemo(
    () => ({
      friends: Users,
      groups: UsersRound,
      requests: UserPlus,
      invitations: UserRoundPlus,
    }),
    [],
  );

  // Render content based on active tab
  const renderContent = () => {
    switch (activeTab) {
      case "friends":
        return <ContactList friends={friends} />;
      case "groups":
        return <GroupList groups={mockGroups} />;
      case "requests":
        return (
          <FriendRequests
            receivedRequests={receivedRequests}
            sentRequests={sentRequests}
          />
        );
      case "invitations":
        return <GroupInvitations invitations={mockGroupInvitations} />;
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-screen w-full overflow-hidden">
      <div className="flex bg-white ">
        <SearchHeader />
        <div className="flex-1 p-4 border-b">
          <div className="flex items-center pt-2 gap-2">
            {(() => {
              const IconComponent =
                tabIcons[activeTab as keyof typeof tabIcons];
              return IconComponent ? (
                <IconComponent className="h-5 w-5" />
              ) : null;
            })()}
            <h1 className="text-sm font-semibold">{title}</h1>
          </div>
        </div>
      </div>

      <div className="flex flex-1 bg-[#f0f2f5] overflow-hidden">
        {/* Left Sidebar - Contact Tabs */}
        <ContactSidebar activeTab={activeTab} setActiveTab={setActiveTab} />

        <div className="flex flex-col flex-1 p-4 overflow-hidden">
          {/* Dynamic count display based on active tab */}
          <div className="text-sm font-semibold text-gray-700 mb-6 mt-2 -px-1 ">
            {title} ({count})
          </div>

          {/* Main Content - Dynamic based on active tab */}
          <div className="flex-1 overflow-auto no-scrollbar">
            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  );
}
