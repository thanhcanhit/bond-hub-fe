"use client";
import { useEffect, useState } from "react";
import ContactList from "@/components/chat/ConverstationList";
import ChatArea from "@/components/chat/ChatArea";
import ContactInfo from "@/components/chat/ConverstationInfo";
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
  const { selectedContact, setSelectedContact } = useChatStore();
  const { loadConversations } = useConversationsStore();

  // Load conversations when component mounts
  useEffect(() => {
    if (currentUser?.id) {
      loadConversations(currentUser.id);
    }
  }, [currentUser?.id, loadConversations]);

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

  // Handle selecting a contact
  const handleSelectContact = async (contactId: string | null) => {
    console.log(`[ChatPage] Selecting contact: ${contactId}`);

    if (contactId) {
      // First, check if we already have this contact in our conversations store
      const existingConversation = useConversationsStore
        .getState()
        .conversations.find((conv) => conv.contact.id === contactId);

      if (existingConversation) {
        // Use the contact from the conversations store immediately
        // This will clear the current messages and set loading state
        setSelectedContact(existingConversation.contact);

        // Force reload messages from API when selecting a conversation
        // This ensures we get the latest messages, including any new ones
        const chatStore = useChatStore.getState();

        // Determine if this is a user or group conversation
        const conversationType = existingConversation.type || "USER";

        // Reload messages for this conversation
        setTimeout(() => {
          chatStore.reloadConversationMessages(contactId, conversationType);
        }, 0);

        // If this is a group conversation, we don't need to fetch user data
        // because groups don't have user data and all necessary information is already in the conversation
        if (existingConversation.type === "GROUP") {
          console.log(
            `[ChatPage] Group conversation selected, skipping user data fetch`,
          );
          return;
        }
      }

      try {
        // Only fetch user data for user conversations, not for groups
        // This avoids unnecessary API calls when selecting a group
        const result = await getUserDataById(contactId);
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
          const currentSelectedContact =
            useChatStore.getState().selectedContact;
          if (currentSelectedContact?.id === contactId) {
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
    } else {
      setSelectedContact(null);
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
        <ContactList onSelectContact={handleSelectContact} />
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <ChatArea
          currentUser={currentUser as User}
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
