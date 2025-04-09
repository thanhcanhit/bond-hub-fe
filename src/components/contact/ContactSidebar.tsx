"use client";
import { memo, useMemo } from "react";

type ContactSidebarProps = {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  contactCount: number;
};

// Define tabs outside component to prevent recreation on each render
const tabs = [
  { id: "friends", label: "Friends list" },
  { id: "groups", label: "Joined groups and communities" },
  { id: "requests", label: "Friend requests" },
  { id: "invitations", label: "Group and community invitations" },
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
    <div className="w-[300px] bg-white border-r flex flex-col h-full">
      <div className="flex-1 overflow-y-auto">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            className={`p-4 cursor-pointer hover:bg-[#0841a3] hover:text-white ${
              activeTab === tab.id ? "bg-[#0841a3] text-white" : ""
            }`}
            onClick={handleTabClick[tab.id]}
          >
            <span className="font-medium text-base">{tab.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Export memoized component
export default memo(ContactSidebar);
