"use client";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import ContactList from "@/components/chat/ConverstationList";
import ChatArea from "@/components/chat/ChatArea";
import ContactInfo from "@/components/chat/ConverstationInfo";
import GroupInfo from "@/components/chat/GroupInfo";
import ChatSocketHandler from "@/components/chat/ChatSocketHandler";
import { User, UserInfo } from "@/types/base";
import { useAuthStore } from "@/stores/authStore";
import { useChatStore } from "@/stores/chatStore";
import { useConversationsStore } from "@/stores/conversationsStore";
//import { getUserDataById } from "@/actions/user.action";

export default function ChatPage() {
  const [isTabContentVisible, setIsTabContentVisible] = useState(true);
  const [showContactInfo, setShowContactInfo] = useState(false);

  // Get state from stores
  const currentUser = useAuthStore((state) => state.user);
  const {
    selectedContact,
    selectedGroup,
    currentChatType,
    setSelectedContact,
    setSelectedGroup,
  } = useChatStore();
  const { loadConversations } = useConversationsStore();

  // Get URL search params
  const searchParams = useSearchParams();
  const groupIdParam = searchParams.get("groupId");
  const userIdParam = searchParams.get("userId");

  // Load conversations when component mounts
  useEffect(() => {
    if (currentUser?.id) {
      loadConversations(currentUser.id);
      // The API now returns both user and group conversations
    }
  }, [currentUser?.id, loadConversations]);

  // Handle URL parameters for opening specific chats
  useEffect(() => {
    const handleUrlParams = async () => {
      if (!currentUser?.id) return;

      // Wait for conversations to load
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const chatStore = useChatStore.getState();

      // Open group chat if groupId is provided
      if (groupIdParam) {
        console.log(`Opening group chat with ID: ${groupIdParam}`);
        await chatStore.openChat(groupIdParam, "GROUP");
      }
      // Open user chat if userId is provided
      else if (userIdParam) {
        console.log(`Opening user chat with ID: ${userIdParam}`);
        await chatStore.openChat(userIdParam, "USER");
      }
    };

    handleUrlParams();
  }, [groupIdParam, userIdParam, currentUser?.id]);

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

  // Handle selecting a conversation (contact or group)
  const handleSelectConversation = async (
    conversationId: string | null,
    type: "USER" | "GROUP",
  ) => {
    if (!conversationId) {
      setSelectedContact(null);
      setSelectedGroup(null);
      return;
    }

    // Use the new openChat method that handles both USER and GROUP types
    const chatStore = useChatStore.getState();
    const success = await chatStore.openChat(conversationId, type);

    if (!success) {
      console.error(`Failed to open ${type} chat with ID: ${conversationId}`);

      // Fallback to basic selection if openChat fails
      if (type === "USER") {
        setSelectedContact(null);
      } else {
        setSelectedGroup(null);
      }
    }

    // On mobile, hide the conversation list after selecting a chat
    if (window.innerWidth < 768) {
      setIsTabContentVisible(false);
    }
  };

  // Toggle contact info sidebar
  const toggleContactInfo = () => {
    setShowContactInfo((prev) => !prev);
  };

  return (
    <div className="flex h-full w-full bg-gray-100 overflow-hidden">
      {/* Socket handler for real-time updates */}
      <ChatSocketHandler />

      {/* Left Sidebar - Contact List */}
      <div
        className={`w-[340px] bg-white border-r flex flex-col overflow-hidden ${isTabContentVisible ? "flex" : "hidden"}`}
      >
        <ContactList onSelectConversation={handleSelectConversation} />
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <ChatArea
          currentUser={currentUser as User}
          onToggleInfo={toggleContactInfo}
        />
      </div>

      {/* Right Sidebar - Contact/Group Info */}
      <div
        className={`w-[340px] bg-white border-l flex flex-col overflow-hidden transition-all duration-300 ${showContactInfo ? "flex" : "hidden"}`}
      >
        {currentChatType === "USER" ? (
          <ContactInfo
            contact={selectedContact as (User & { userInfo: UserInfo }) | null}
            onClose={() => setShowContactInfo(false)}
          />
        ) : (
          <GroupInfo
            group={selectedGroup}
            onClose={() => setShowContactInfo(false)}
          />
        )}
      </div>
    </div>
  );
}
