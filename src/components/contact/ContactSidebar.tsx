"use client";
import { memo, useMemo, useEffect } from "react";
import { Users, UserPlus, UsersRound, UserRoundPlus } from "lucide-react";
import { useFriendStore } from "@/stores/friendStore";

type ContactSidebarProps = {
  activeTab: string;
  setActiveTab: (tab: string) => void;
};

// Define tabs outside component to prevent recreation on each render
const tabs = [
  { id: "friends", label: "Danh sách bạn bè", icon: Users },
  { id: "groups", label: "Danh sách nhóm và cộng đồng", icon: UsersRound },
  { id: "requests", label: "Lời mời kết bạn", icon: UserPlus },
  {
    id: "invitations",
    label: "Lời mời vào nhóm và cộng đồng",
    icon: UserRoundPlus,
  },
];

// Use memo to prevent unnecessary re-renders
function ContactSidebar({ activeTab, setActiveTab }: ContactSidebarProps) {
  // Get unread friend requests count from store
  const { unreadReceivedRequests, markFriendRequestsAsRead } = useFriendStore();

  // Memoize the tab click handler for each tab
  const handleTabClick = useMemo(() => {
    const handlers: Record<string, () => void> = {};

    tabs.forEach((tab) => {
      handlers[tab.id] = () => {
        // If clicking on requests tab, mark requests as read
        if (tab.id === "requests") {
          markFriendRequestsAsRead();
        }
        setActiveTab(tab.id);
      };
    });

    return handlers;
  }, [setActiveTab, markFriendRequestsAsRead]);

  // Mark requests as read when the component mounts with requests tab active
  useEffect(() => {
    if (activeTab === "requests") {
      markFriendRequestsAsRead();
    }
  }, [activeTab, markFriendRequestsAsRead]);

  return (
    <div className="w-[300px] bg-white border-r flex flex-col h-full overflow-hidden">
      <div className="flex-1 overflow-y-auto no-scrollbar">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            className={`p-4 cursor-pointer hover:bg-[#F1F2F3] mb-1 ${
              activeTab === tab.id ? "bg-[#dbebff]" : ""
            }`}
            onClick={handleTabClick[tab.id]}
          >
            <div className="flex items-center gap-2 justify-between w-full">
              <div className="flex items-center gap-2">
                <tab.icon className="h-5 w-5" />
                <span className="font-semibold text-sm">{tab.label}</span>
              </div>
              {tab.id === "requests" && unreadReceivedRequests > 0 && (
                <div className="bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {unreadReceivedRequests > 9 ? "9+" : unreadReceivedRequests}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Export memoized component
export default memo(ContactSidebar);
