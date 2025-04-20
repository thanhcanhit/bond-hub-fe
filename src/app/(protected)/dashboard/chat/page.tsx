"use client";
import { useEffect, useState, useRef } from "react";
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
  const {
    selectedContact,
    selectedGroup,
    currentChatType,
    setSelectedContact,
    setSelectedGroup,
  } = useChatStore();
  const { loadConversations } = useConversationsStore();

  // Use a ref to track if conversations have been loaded
  const conversationsLoadedRef = useRef(false);

  // Load conversations when component mounts
  useEffect(() => {
    if (currentUser?.id && !conversationsLoadedRef.current) {
      console.log(
        `[ChatPage] Loading conversations for user ${currentUser.id}`,
      );
      loadConversations(currentUser.id);
      conversationsLoadedRef.current = true;
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

    // Clear any selected group when selecting a contact
    setSelectedGroup(null);

    if (contactId) {
      // Check if this contact is already selected to prevent infinite loops
      const currentSelectedContact = useChatStore.getState().selectedContact;
      if (currentSelectedContact?.id === contactId) {
        console.log(
          `[ChatPage] Contact ${contactId} is already selected, skipping`,
        );
        return;
      }

      // First, check if we already have this contact in our conversations store
      const existingConversation = useConversationsStore
        .getState()
        .conversations.find(
          (conv) => conv.type === "USER" && conv.contact.id === contactId,
        );

      // Set a flag to track if we've already set the contact
      let contactSet = false;

      if (existingConversation) {
        // Use the contact from the conversations store immediately
        // This will clear the current messages and set loading state
        setSelectedContact(existingConversation.contact);
        contactSet = true;

        // Force reload messages from API when selecting a conversation
        // This ensures we get the latest messages, including any new ones
        const chatStore = useChatStore.getState();

        // Reload messages for this conversation
        setTimeout(() => {
          chatStore.reloadConversationMessages(contactId, "USER");
        }, 0);
      }

      // Only fetch additional user data if we don't have it in the conversation store
      // or if we want to update with the latest data
      if (!contactSet) {
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
    } else {
      setSelectedContact(null);
    }
  };

  // Handle selecting a group
  const handleSelectGroup = async (groupId: string | null) => {
    console.log(`[ChatPage] Selecting group: ${groupId}`);

    // Clear any selected contact when selecting a group
    setSelectedContact(null);

    if (groupId) {
      // Check if we already have this group in our conversations store
      const existingConversation = useConversationsStore
        .getState()
        .conversations.find(
          (conv) => conv.type === "GROUP" && conv.group?.id === groupId,
        );

      if (existingConversation && existingConversation.group) {
        // Check if this group is already selected to prevent infinite loops
        const currentSelectedGroup = useChatStore.getState().selectedGroup;
        if (currentSelectedGroup?.id === groupId) {
          console.log(
            `[ChatPage] Group ${groupId} is already selected, skipping`,
          );
          return;
        }

        // Set the selected group
        setSelectedGroup({
          id: existingConversation.group.id,
          name: existingConversation.group.name,
          creatorId:
            existingConversation.group.memberUsers?.find(
              (m) => m.role === "LEADER",
            )?.id || "",
          avatarUrl: existingConversation.group.avatarUrl || null,
          createdAt: existingConversation.group.createdAt || new Date(),
          // Store the memberUsers array directly for UI display purposes
          memberUsers: existingConversation.group.memberUsers || [],
          // Empty members array as it's required by the type but not used in UI
          members: [],
          messages: [], // This will be loaded separately
        });

        // Force reload messages from API
        const chatStore = useChatStore.getState();
        setTimeout(() => {
          chatStore.reloadConversationMessages(groupId, "GROUP");
        }, 0);
      }
    } else {
      setSelectedGroup(null);
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
        <ContactList
          onSelectContact={handleSelectContact}
          onSelectGroup={handleSelectGroup}
        />
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <ChatArea
          currentUser={currentUser as User}
          onToggleInfo={toggleContactInfo}
        />
      </div>

      {/* Right Sidebar - Contact/Group Info */}
      {showContactInfo && (
        <div className="w-[340px] bg-white border-l flex flex-col overflow-hidden transition-all duration-300">
          <ContactInfo
            contact={
              currentChatType === "USER"
                ? (selectedContact as (User & { userInfo: UserInfo }) | null)
                : undefined
            }
            group={currentChatType === "GROUP" ? selectedGroup : undefined}
            onClose={() => setShowContactInfo(false)}
          />
        </div>
      )}
    </div>
  );
}
