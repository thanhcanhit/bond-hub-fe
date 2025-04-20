"use client";
import { useSearchParams } from "next/navigation";
import { useEffect, useState, useRef } from "react";
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
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);

  // Get state from stores
  const currentUser = useAuthStore((state) => state.user);
  const {
    selectedContact,
    selectedGroup,
    setSelectedGroup,
    currentChatType,
    setSelectedContact,
  } = useChatStore();
  const { loadConversations } = useConversationsStore();

  // Get URL search params
  const searchParams = useSearchParams();
  const groupIdParam = searchParams.get("groupId");
  const userIdParam = searchParams.get("userId");

  // Use a ref to track if conversations have been loaded
  const conversationsLoadedRef = useRef(false);

  // Load conversations when component mounts
  useEffect(() => {
    if (currentUser?.id && !conversationsLoadedRef.current) {
      console.log(
        `[ChatPage] Loading conversations for user ${currentUser.id}`,
      );
      loadConversations(currentUser.id);
      // The API now returns both user and group conversations
      conversationsLoadedRef.current = true;
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

  // Track if a chat is currently open
  const isChatOpen = selectedContact !== null || selectedGroup !== null;

  // Handle window resize for responsive layout
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;

      // Set device type flags
      setIsMobile(width < 768);
      setIsTablet(width >= 768 && width < 1024);

      // Show conversation list if no chat is open or screen is large enough
      // Hide conversation list on small screens when a chat is open
      setIsTabContentVisible(!isChatOpen || width >= 768);

      // Hide contact info on smaller screens
      if (width < 1024) {
        setShowContactInfo(false);
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [isChatOpen]);

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
      // Clear any selected group when selecting a contact
      setSelectedGroup(null);

      // Check if this contact is already selected to prevent infinite loops
      const currentSelectedContact = useChatStore.getState().selectedContact;
      if (currentSelectedContact?.id === id) {
        console.log(`[ChatPage] Contact ${id} is already selected, skipping`);
        return;
      }

      // First, check if we already have this contact in our conversations store
      const existingConversation = conversationsStore.conversations.find(
        (conv) => conv.type === "USER" && conv.contact.id === id,
      );

      // Set a flag to track if we've already set the contact
      let contactSet = false;

      if (existingConversation) {
        // Use the contact from the conversations store immediately
        // This will clear the current messages and set loading state
        setSelectedContact(existingConversation.contact);
        contactSet = true;

        // Reload messages for this conversation
        setTimeout(() => {
          chatStore.reloadConversationMessages(id, "USER");
        }, 0);
      }

      // Only fetch additional user data if we don't have it in the conversation store
      // or if we want to update with the latest data
      if (!contactSet) {
        try {
          // Only fetch user data for user conversations, not for groups
          // This avoids unnecessary API calls when selecting a group
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
            const currentSelectedContact =
              useChatStore.getState().selectedContact;
            if (currentSelectedContact?.id === id) {
              setSelectedContact(user as User & { userInfo: UserInfo });
              contactSet = true;
            }
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
        }
      }

      // If we couldn't set the contact from either source, set it to null
      if (!contactSet) {
        setSelectedContact(null);
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

  // Note: Group selection is handled by handleSelectContact with type="GROUP"

  // Toggle contact info sidebar
  const toggleContactInfo = () => {
    setShowContactInfo((prev) => !prev);
  };

  // Function to go back to conversation list on mobile
  const handleBackToList = () => {
    setIsTabContentVisible(true);
  };

  return (
    <div className="flex h-full w-full bg-gray-100 overflow-hidden">
      {/* Left Sidebar - Contact List */}
      <div
        className={`w-full md:w-[340px] bg-white border-r flex flex-col overflow-hidden ${isTabContentVisible ? "flex" : "hidden"}`}
      >
        <ContactList
          onSelectContact={(contactId) => {
            handleSelectContact(contactId, "USER");
            // Hide conversation list on mobile when selecting a chat
            if (isMobile) {
              setIsTabContentVisible(false);
            }
          }}
          onSelectGroup={(groupId) => {
            handleSelectContact(groupId, "GROUP");
            // Hide conversation list on mobile when selecting a chat
            if (isMobile) {
              setIsTabContentVisible(false);
            }
          }}
        />
      </div>

      {/* Main Content Area - Contains Chat and Info Panel */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Main Chat Area */}
        <div
          className={`
            ${isTabContentVisible && isMobile ? "hidden" : "flex"}
            flex-col overflow-hidden transition-all duration-300
            ${!isMobile && !isTablet && showContactInfo ? "w-[calc(100%-340px)]" : "w-full"}
          `}
        >
          <ChatArea
            currentUser={currentUser as User}
            onToggleInfo={toggleContactInfo}
            onBackToList={handleBackToList}
          />
        </div>

        {/* Right Sidebar - Contact/Group Info */}
        {/* On larger screens, it's a sidebar. On smaller screens, it overlays the chat area */}
        <div
          className={`
            ${isMobile || isTablet ? "absolute right-0 top-0 bottom-0 z-30" : "absolute right-0 top-0 bottom-0"}
            w-[340px] border-l bg-white flex flex-col overflow-hidden
            transition-all duration-300 transform
            ${showContactInfo ? "translate-x-0 opacity-100" : "translate-x-full opacity-0 pointer-events-none"}
          `}
        >
          {/* Semi-transparent backdrop for mobile overlay mode */}
          {(isMobile || isTablet) && (
            <div
              className={`fixed inset-0 bg-black/20 z-20 transition-opacity duration-300 ${showContactInfo ? "opacity-100" : "opacity-0 pointer-events-none"}`}
              onClick={() => setShowContactInfo(false)}
            />
          )}

          <div className="h-full relative z-30">
            {currentChatType === "USER" ? (
              <ContactInfo
                contact={
                  selectedContact as (User & { userInfo: UserInfo }) | null
                }
                onClose={() => setShowContactInfo(false)}
                isOverlay={isMobile || isTablet}
              />
            ) : (
              <GroupInfo
                group={selectedGroup}
                onClose={() => setShowContactInfo(false)}
                isOverlay={isMobile || isTablet}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
