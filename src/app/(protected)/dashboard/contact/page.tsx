"use client";
import { useState, useMemo, useEffect } from "react";
import { Users, UserPlus, UsersRound } from "lucide-react";
import ContactSidebar from "@/components/contact/ContactSidebar";
import ContactList from "@/components/contact/ContactList";
import GroupList from "@/components/contact/GroupList";
import FriendRequests from "@/components/contact/FriendRequests";
import SearchHeader from "@/components/SearchHeader";
import { useFriendStore } from "@/stores/friendStore";
import { getUserGroups } from "@/actions/group.action";
import { toast } from "sonner";
import { Group, GroupMember } from "@/types/base";

// Define types for UI components
type GroupItem = {
  id: string;
  name: string;
  memberCount: number;
  imageUrl: string;
  avatarUrl?: string | null;
  members?: GroupMember[];
};

// Export the component directly
export default function ContactPage() {
  const [activeTab, setActiveTab] = useState<string>("friends");

  // State for storing real group data from API
  const [userGroups, setUserGroups] = useState<GroupItem[]>([]);

  // Get friend data from store
  const {
    friends,
    receivedRequests,
    sentRequests,
    fetchFriends,
    fetchReceivedRequests,
    fetchSentRequests,
    markFriendRequestsAsRead,
  } = useFriendStore();

  // Fetch user groups from API
  const fetchUserGroups = async () => {
    try {
      const result = await getUserGroups();
      if (result.success && result.groups) {
        // Transform the data to match the GroupItem type
        const formattedGroups = result.groups.map((group: Group) => ({
          id: group.id,
          name: group.name,
          memberCount: group.members?.length || 0,
          imageUrl: group.avatarUrl || "",
          avatarUrl: group.avatarUrl,
          members: group.members,
        }));
        setUserGroups(formattedGroups);
      } else {
        console.error("Failed to fetch groups:", result.error);
        toast.error("Không thể tải danh sách nhóm");
      }
    } catch (error) {
      console.error("Error fetching groups:", error);
      toast.error("Đã xảy ra lỗi khi tải danh sách nhóm");
    }
  };

  // Fetch data when component mounts
  useEffect(() => {
    fetchFriends();
    fetchReceivedRequests();
    fetchSentRequests();
    fetchUserGroups();

    // Mark friend requests as read if we're on the requests tab
    if (activeTab === "requests") {
      markFriendRequestsAsRead();
    }
  }, [
    fetchFriends,
    fetchReceivedRequests,
    fetchSentRequests,
    activeTab,
    markFriendRequestsAsRead,
  ]);

  // Get title and count based on active tab
  const { title, count } = useMemo(() => {
    switch (activeTab) {
      case "friends":
        return { title: "Bạn bè", count: friends.length };
      case "groups":
        return { title: "Nhóm và cộng đồng", count: userGroups.length };
      case "requests":
        return {
          title: "Lời mời kết bạn",
          count: receivedRequests.length + sentRequests.length,
        };

      default:
        return { title: "Danh bạ", count: 0 };
    }
  }, [
    activeTab,
    friends.length,
    receivedRequests.length,
    sentRequests.length,
    userGroups.length,
  ]);

  // Map tab IDs to their corresponding icons
  const tabIcons = useMemo(
    () => ({
      friends: Users,
      groups: UsersRound,
      requests: UserPlus,
    }),
    [],
  );

  // Render content based on active tab
  const renderContent = () => {
    switch (activeTab) {
      case "friends":
        return <ContactList friends={friends} />;
      case "groups":
        return <GroupList groups={userGroups} />;
      case "requests":
        return (
          <FriendRequests
            receivedRequests={receivedRequests}
            sentRequests={sentRequests}
          />
        );

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
