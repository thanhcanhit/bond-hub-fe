"use client";
import { useState, useMemo } from "react";
import { Users, UserPlus, UsersRound, UserRoundPlus } from "lucide-react";
import ContactSidebar from "@/components/contact/ContactSidebar";
import ContactList from "@/components/contact/ContactList";
import GroupList from "@/components/contact/GroupList";
import FriendRequests from "@/components/contact/FriendRequests";
import GroupInvitations from "@/components/contact/GroupInvitations";
import SimpleSearchHeader from "@/components/SimpleSearchHeader";

type Friend = {
  id: string;
  fullName: string;
  profilePictureUrl: string;
};

type Group = {
  id: string;
  name: string;
  memberCount: number;
  imageUrl: string;
};

type FriendRequest = {
  id: string;
  fullName: string;
  profilePictureUrl: string;
  message: string;
  timeAgo: string;
};

type SentRequest = {
  id: string;
  fullName: string;
  profilePictureUrl: string;
  timeAgo: string;
};

type GroupInvitation = {
  id: string;
  groupName: string;
  groupImageUrl: string;
  inviterName: string;
  inviterImageUrl: string;
  memberCount: number;
};

// Sample data - defined outside component to prevent recreation
const mockFriends: Friend[] = [
  {
    id: "1",
    fullName: "Anh Trung",
    profilePictureUrl: "https://i.pravatar.cc/150?img=1",
  },
  {
    id: "2",
    fullName: "Anh Ty",
    profilePictureUrl: "https://i.pravatar.cc/150?img=2",
  },
  {
    id: "3",
    fullName: "Anny Kim",
    profilePictureUrl: "https://i.pravatar.cc/150?img=3",
  },
  {
    id: "4",
    fullName: "Ba",
    profilePictureUrl: "https://i.pravatar.cc/150?img=4",
  },
  {
    id: "5",
    fullName: "Ba Ngoai",
    profilePictureUrl: "https://i.pravatar.cc/150?img=5",
  },
  {
    id: "6",
    fullName: "Beo Photocopy - Printing",
    profilePictureUrl: "https://i.pravatar.cc/150?img=6",
  },
  {
    id: "7",
    fullName: "Dũng",
    profilePictureUrl: "https://i.pravatar.cc/150?img=7",
  },
  {
    id: "8",
    fullName: "Hà",
    profilePictureUrl: "https://i.pravatar.cc/150?img=8",
  },
  {
    id: "9",
    fullName: "Hùng",
    profilePictureUrl: "https://i.pravatar.cc/150?img=9",
  },
  {
    id: "10",
    fullName: "Khánh",
    profilePictureUrl: "https://i.pravatar.cc/150?img=10",
  },
  {
    id: "11",
    fullName: "Linh",
    profilePictureUrl: "https://i.pravatar.cc/150?img=11",
  },
  {
    id: "12",
    fullName: "Đạt",
    profilePictureUrl: "https://i.pravatar.cc/150?img=12",
  },
  {
    id: "13",
    fullName: "Hà Anh",
    profilePictureUrl: "https://i.pravatar.cc/150?img=13",
  },
  {
    id: "14",
    fullName: "Hùng Nguyễn",
    profilePictureUrl: "https://i.pravatar.cc/150?img=14",
  },
  {
    id: "15",
    fullName: "Khánh Trần",
    profilePictureUrl: "https://i.pravatar.cc/150?img=15",
  },
  {
    id: "16",
    fullName: "Linh Nguyễn",
    profilePictureUrl: "https://i.pravatar.cc/150?img=16",
  },
];

const mockGroups: Group[] = [
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
];

const mockReceivedRequests: FriendRequest[] = [
  {
    id: "1",
    fullName: "Thanh Cảnh",
    profilePictureUrl: "https://i.pravatar.cc/150?img=20",
    message: "Xin chào, mình là Nguyễn Thanh Cảnh. Kết bạn với mình nhé!",
    timeAgo: "2 phút - Từ của số trò chuyện",
  },
];

const mockSentRequests: SentRequest[] = [
  {
    id: "1",
    fullName: "Quỳnh Yến",
    profilePictureUrl: "https://i.pravatar.cc/150?img=21",
    timeAgo: "Bạn đã gửi lời mời",
  },
];

const mockGroupInvitations: GroupInvitation[] = [];

// Export the component directly
export default function ContactPage() {
  const [activeTab, setActiveTab] = useState<string>("friends");

  // Get title and count based on active tab
  const { title, count } = useMemo(() => {
    switch (activeTab) {
      case "friends":
        return { title: "Bạn bè", count: mockFriends.length };
      case "groups":
        return { title: "Nhóm và cộng đồng", count: mockGroups.length };
      case "requests":
        return {
          title: "Lời mời kết bạn",
          count: mockReceivedRequests.length + mockSentRequests.length,
        };
      case "invitations":
        return {
          title: "Lời mời vào nhóm và cộng đồng",
          count: mockGroupInvitations.length,
        };
      default:
        return { title: "Danh bạ", count: 0 };
    }
  }, [activeTab]);

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
        return <ContactList friends={mockFriends} />;
      case "groups":
        return <GroupList groups={mockGroups} />;
      case "requests":
        return (
          <FriendRequests
            receivedRequests={mockReceivedRequests}
            sentRequests={mockSentRequests}
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
        <SimpleSearchHeader />
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
        <ContactSidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          contactCount={mockFriends.length}
        />

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
