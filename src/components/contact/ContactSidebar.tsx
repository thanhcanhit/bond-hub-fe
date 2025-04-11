"use client";
import { memo, useMemo } from "react";
import { Users, UserPlus, UsersRound, UserRoundPlus } from "lucide-react";

type ContactSidebarProps = {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  contactCount: number;
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
function ContactSidebar({
  activeTab,
  setActiveTab,
  contactCount,
}: ContactSidebarProps) {
  // Memoize the tab click handler for each tab
  const handleTabClick = useMemo(() => {
    const handlers: Record<string, () => void> = {};

    tabs.forEach((tab) => {
      handlers[tab.id] = () => setActiveTab(tab.id);
    });

    return handlers;
  }, [setActiveTab]);

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
            <div className="flex items-center gap-2">
              <tab.icon className="h-5 w-5" />
              <span className="font-semibold text-sm">{tab.label}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Export memoized component
export default memo(ContactSidebar);
