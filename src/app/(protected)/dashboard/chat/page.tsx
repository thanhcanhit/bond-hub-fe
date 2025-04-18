"use client";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import ContactList from "@/components/chat/ConverstationList";
import ChatArea from "@/components/chat/ChatArea";
import ContactInfo from "@/components/chat/ConverstationInfo";
import GroupInfo from "@/components/chat/GroupInfo";
// import ChatSocketHandler from "@/components/chat/ChatSocketHandler";
import { User, UserInfo } from "@/types/base";
import { useAuthStore } from "@/stores/authStore";
import { useChatStore } from "@/stores/chatStore";
import { useConversationsStore } from "@/stores/conversationsStore";
import { getUserDataById } from "@/actions/user.action";

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

  // Handle selecting a contact or group
  const handleSelectContact = async (
    id: string | null,
    type: "USER" | "GROUP",
  ) => {
    console.log(`[ChatPage] Selecting ${type}: ${id}`);

    if (!id) {
      setSelectedContact(null);
      return;
    }

    const chatStore = useChatStore.getState();
    const conversationsStore = useConversationsStore.getState();

    if (type === "USER") {
      // Handle user conversation
      // First, check if we already have this contact in our conversations store
      const existingConversation = conversationsStore.conversations.find(
        (conv) => conv.type === "USER" && conv.contact.id === id,
      );

      if (existingConversation) {
        // Use the contact from the conversations store immediately
        // This will clear the current messages and set loading state
        setSelectedContact(existingConversation.contact);

        // Reload messages for this conversation
        setTimeout(() => {
          chatStore.reloadConversationMessages(id, "USER");
        }, 0);
      }

      try {
        // Always fetch the latest user data to ensure we have the most up-to-date info
        const result = await getUserDataById(id);
        if (result.success && result.user) {
          // Ensure userInfo exists
          const user = result.user;
          if (!user.userInfo) {
            user.userInfo = {
              id: user.id,
              fullName: user.email || user.phoneNumber || "Unknown",
              profilePictureUrl: null,
              statusMessage: "No status",
              blockStrangers: false,
              createdAt: new Date(),
              updatedAt: new Date(),
              userAuth: user,
            };
          }

          // Only update the contact if it's still the selected one
          const currentSelectedContact = chatStore.selectedContact;
          if (currentSelectedContact?.id === id) {
            setSelectedContact(user as User & { userInfo: UserInfo });
          }
        } else if (!existingConversation) {
          // Only set to null if we don't have an existing conversation
          setSelectedContact(null);
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
        // If we already set a contact from the conversation store, don't reset to null
        if (!existingConversation) {
          setSelectedContact(null);
        }
      }
    } else if (type === "GROUP") {
      // Handle group conversation
      // Use openChat which will handle fetching group data and setting up the conversation
      try {
        await chatStore.openChat(id, "GROUP");
      } catch (error) {
        console.error("Error opening group chat:", error);
      }
    }
  };

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
        <ContactList onSelectConversation={handleSelectContact} />
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
