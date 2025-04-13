"use client";

import { useEffect } from "react";
import { useSocketConnection } from "@/hooks/useSocketConnection";
import { useChatStore } from "@/stores/chatStore";
import { useConversationsStore } from "@/stores/conversationsStore";
import { useAuthStore } from "@/stores/authStore";
import { Message } from "@/types/base";

export default function ChatSocketHandler() {
  const socket = useSocketConnection(true);
  const currentUser = useAuthStore((state) => state.user);
  const { addMessage, updateMessage, selectedContact } = useChatStore();
  const { updateLastMessage, incrementUnread } = useConversationsStore();

  useEffect(() => {
    if (!socket || !currentUser) return;

    // Listen for new messages
    const handleNewMessage = (message: Message) => {
      console.log("New message received:", message);

      // Ensure sender has userInfo
      if (message.sender) {
        // If sender is current user, always use current user's userInfo
        if (message.senderId === currentUser.id) {
          message.sender = {
            ...currentUser,
            userInfo: currentUser.userInfo,
          };
        }
        // If sender is selected contact, always use selected contact's data
        else if (selectedContact && message.senderId === selectedContact.id) {
          message.sender = {
            ...selectedContact,
            userInfo: selectedContact.userInfo,
          };
        }
        // If sender doesn't have userInfo or has incomplete userInfo
        else if (
          !message.sender.userInfo ||
          !message.sender.userInfo.fullName
        ) {
          // Create a fallback userInfo
          message.sender.userInfo = {
            id: message.sender.id,
            fullName:
              message.sender.userInfo?.fullName ||
              message.sender.email ||
              message.sender.phoneNumber ||
              "Unknown",
            profilePictureUrl:
              message.sender.userInfo?.profilePictureUrl || null,
            statusMessage:
              message.sender.userInfo?.statusMessage || "No status",
            blockStrangers: message.sender.userInfo?.blockStrangers || false,
            createdAt: message.sender.userInfo?.createdAt || new Date(),
            updatedAt: message.sender.userInfo?.updatedAt || new Date(),
            userAuth: message.sender,
          };
        }
      }

      // If the message is from or to the selected contact, add it to the current chat
      if (
        selectedContact &&
        ((message.senderId === selectedContact.id &&
          message.receiverId === currentUser.id) ||
          (message.senderId === currentUser.id &&
            message.receiverId === selectedContact.id))
      ) {
        addMessage(message);
      }

      // Update the conversation list with the last message
      const contactId =
        message.senderId === currentUser.id
          ? message.receiverId
          : message.senderId;
      if (contactId) {
        updateLastMessage(contactId, message);

        // Increment unread count if message is not from current user and not from selected contact
        if (
          message.senderId !== currentUser.id &&
          message.senderId !== selectedContact?.id
        ) {
          incrementUnread(message.senderId);
        }
      }
    };

    // Listen for message updates (recalls, reactions, etc.)
    const handleMessageUpdated = (updatedMessage: Message) => {
      console.log("Message updated:", updatedMessage);
      updateMessage(updatedMessage.id, updatedMessage);

      // Update the conversation list with the updated message if it's the last message
      const contactId =
        updatedMessage.senderId === currentUser.id
          ? updatedMessage.receiverId
          : updatedMessage.senderId;
      if (contactId) {
        updateLastMessage(contactId, updatedMessage);
      }
    };

    // Register event listeners
    socket.on("newMessage", handleNewMessage);
    socket.on("messageUpdated", handleMessageUpdated);

    // Clean up event listeners on unmount
    return () => {
      socket.off("newMessage", handleNewMessage);
      socket.off("messageUpdated", handleMessageUpdated);
    };
  }, [
    socket,
    currentUser,
    selectedContact,
    addMessage,
    updateMessage,
    updateLastMessage,
    incrementUnread,
  ]);

  // This component doesn't render anything
  return null;
}
