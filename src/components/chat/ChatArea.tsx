"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Message, User, UserInfo, GroupMember } from "@/types/base";
import ChatHeader from "./ChatHeader";
import GroupChatHeader from "./GroupChatHeader";
import MessageItem from "./MessageItem";
import MessageInput from "./MessageInput";
import MessageDetailDialog from "./MessageDetailDialog";
import ChatMessagesDropZone from "./ChatMessagesDropZone";
import TypingIndicator from "./TypingIndicator";
import { formatMessageDate } from "@/utils/dateUtils";
import { useChatStore } from "@/stores/chatStore";
import { useConversationsStore } from "@/stores/conversationsStore";
import { useNotificationStore } from "@/stores/notificationStore";
import { getUserDataById } from "@/actions/user.action";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface ChatAreaProps {
  currentUser: User;
  onToggleInfo: () => void;
  onBackToList?: () => void;
}

export default function ChatArea({
  currentUser,
  onToggleInfo,
  onBackToList,
}: ChatAreaProps) {
  const {
    messages,
    selectedContact,
    selectedGroup,
    currentChatType,
    replyingTo,
    selectedMessage,
    isDialogOpen,
    searchText,
    searchResults,
    isSearching,
    isLoading,
    isLoadingOlder,
    hasMoreMessages,
    clearSearch,
    setReplyingTo,
    setSelectedMessage,
    setIsDialogOpen,
    sendMessage,
    loadOlderMessages,
  } = useChatStore();

  const { updateLastMessage, conversations } = useConversationsStore();
  // Tạm thời bỏ qua markAsRead để tránh vòng lặp vô hạn
  // const { markAsRead, updateLastMessage, conversations } = useConversationsStore();
  const { resetUnread } = useNotificationStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const [isTyping, setIsTyping] = useState(false);

  // Keep track of previous messages to detect what changed
  const prevMessagesRef = useRef<Message[]>([]);

  // Use a ref to track the last message count to avoid unnecessary scrolling
  const lastMessageCountRef = useRef<number>(0);
  // Use a ref to track the last conversation ID
  const lastConversationIdRef = useRef<string | null>(null);
  // Use a ref to track if we've already scrolled for this conversation
  const hasScrolledForConversationRef = useRef<boolean>(false);

  // Function to scroll to bottom - extracted to avoid creating in render
  const scrollToBottom = useCallback((behavior: ScrollBehavior = "auto") => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior });
    }
  }, []);

  useEffect(() => {
    // Skip if no messages or no selected conversation
    if (!messages.length || (!selectedContact && !selectedGroup)) {
      prevMessagesRef.current = [];
      return;
    }

    const conversationId =
      currentChatType === "USER" ? selectedContact?.id : selectedGroup?.id;

    console.log(
      `[ChatArea] Messages updated for ${currentChatType}: ${conversationId}, count: ${messages.length}`,
    );

    // Only scroll to bottom when a new message is added, not when reactions change
    const shouldScrollToBottom = () => {
      // If message count changed, it's a new message
      if (prevMessagesRef.current.length !== messages.length) {
        return true;
      }

      // If the last message ID changed, it's a new message
      if (messages.length > 0 && prevMessagesRef.current.length > 0) {
        const lastMessageId = messages[messages.length - 1].id;
        const prevLastMessageId =
          prevMessagesRef.current[prevMessagesRef.current.length - 1].id;
        return lastMessageId !== prevLastMessageId;
      }

      return false;
    };

    // Only scroll if it's a new message, not a reaction update
    if (shouldScrollToBottom()) {
      console.log(`[ChatArea] Scrolling to bottom for new message`);
      // Use requestAnimationFrame for smoother scrolling
      requestAnimationFrame(() => {
        // Use smooth behavior for new messages
        scrollToBottom("smooth");
      });
    }

    // Update last message in conversations list when messages change
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      // Make sure we're updating the correct conversation
      const currentState = useChatStore.getState();

      if (
        currentChatType === "USER" &&
        currentState.currentChatType === "USER" &&
        currentState.selectedContact?.id === selectedContact?.id
      ) {
        updateLastMessage(selectedContact!.id, lastMessage);
      } else if (
        currentChatType === "GROUP" &&
        currentState.currentChatType === "GROUP" &&
        currentState.selectedGroup?.id === selectedGroup?.id
      ) {
        // For groups, we need to update the conversation differently
        const conversationsStore = useConversationsStore.getState();
        conversationsStore.updateConversation(selectedGroup!.id, {
          lastMessage: lastMessage,
          lastActivity: new Date(lastMessage.createdAt),
        });
      }
    }

    // Update the previous messages reference - use a shallow copy to avoid excessive memory usage
    prevMessagesRef.current = messages.slice();
  }, [
    messages,
    selectedContact,
    selectedGroup,
    currentChatType,
    updateLastMessage,
    messagesEndRef,
    scrollToBottom,
  ]);

  // Effect for scrolling when messages change
  useEffect(() => {
    // Skip if no messages or no selected conversation
    if (!messages.length || (!selectedContact && !selectedGroup)) {
      return;
    }

    const conversationId =
      currentChatType === "USER" ? selectedContact?.id : selectedGroup?.id;

    if (!conversationId) return;

    // Check if conversation changed
    const conversationChanged =
      lastConversationIdRef.current !== conversationId;

    // Check if message count changed
    const messageCountChanged = lastMessageCountRef.current !== messages.length;

    // If conversation changed, reset the scroll flag
    if (conversationChanged) {
      hasScrolledForConversationRef.current = false;
      lastConversationIdRef.current = conversationId;
    }

    // Scroll in these cases:
    // 1. New conversation and we haven't scrolled yet
    // 2. Same conversation but message count changed
    if (
      (conversationChanged && !hasScrolledForConversationRef.current) ||
      (!conversationChanged && messageCountChanged)
    ) {
      // Only log if we're actually going to scroll
      console.log(
        `[ChatArea] Scrolling to bottom for ${currentChatType}: ${conversationId}`,
        `(conversation changed: ${conversationChanged}, messages changed: ${messageCountChanged})`,
      );

      // Use requestAnimationFrame instead of setTimeout for smoother scrolling
      // This ensures the scroll happens after the browser has finished rendering
      requestAnimationFrame(() => {
        // Use auto behavior for initial load (instant scroll)
        scrollToBottom("auto");
      });

      // Update refs
      hasScrolledForConversationRef.current = true;
      lastMessageCountRef.current = messages.length;
    }
  }, [
    selectedContact?.id,
    selectedGroup?.id,
    currentChatType,
    messages.length,
    scrollToBottom,
    selectedContact,
    selectedGroup,
  ]);

  // Handle scroll event to load older messages
  useEffect(() => {
    const chatContainer = chatContainerRef.current;
    if (!chatContainer || (!selectedContact && !selectedGroup)) return;

    const conversationId =
      currentChatType === "USER" ? selectedContact?.id : selectedGroup?.id;

    console.log(
      `[ChatArea] Setting up scroll handler for ${currentChatType}: ${conversationId}`,
    );

    const handleScroll = () => {
      // Check if user has scrolled near the top (within 50px from top)
      if (chatContainer.scrollTop < 50 && !isLoadingOlder && hasMoreMessages) {
        console.log(
          `[ChatArea] Near top of scroll, loading older messages for ${currentChatType}: ${conversationId}`,
        );

        // Save current scroll position and height
        const scrollHeight = chatContainer.scrollHeight;
        const scrollPosition = chatContainer.scrollTop;

        // Store the current conversation ID to verify it doesn't change during loading
        const currentConversationId = conversationId;

        // Load older messages
        loadOlderMessages().then((success) => {
          if (!success) {
            console.log(
              `[ChatArea] Failed to load older messages or no more messages`,
            );
            return;
          }

          // After loading, restore relative scroll position
          // Use requestAnimationFrame for smoother scrolling
          requestAnimationFrame(() => {
            // Verify the conversation hasn't changed during loading
            const currentState = useChatStore.getState();
            const currentId =
              currentState.currentChatType === "USER"
                ? currentState.selectedContact?.id
                : currentState.selectedGroup?.id;

            if (currentId !== currentConversationId) {
              console.log(
                `[ChatArea] Conversation changed during loading, skipping scroll adjustment`,
              );
              return;
            }

            if (chatContainerRef.current) {
              // Calculate new scroll position based on height difference
              const newScrollHeight = chatContainerRef.current.scrollHeight;
              const heightDifference = newScrollHeight - scrollHeight;
              // Use scrollTo with behavior: 'instant' for more reliable positioning
              chatContainerRef.current.scrollTo({
                top: scrollPosition + heightDifference,
                behavior: "auto",
              });
              console.log(
                `[ChatArea] Adjusted scroll position after loading older messages`,
              );
            }
          });
        });
      }
    };

    chatContainer.addEventListener("scroll", handleScroll);
    return () => {
      chatContainer.removeEventListener("scroll", handleScroll);
    };
  }, [
    isLoadingOlder,
    hasMoreMessages,
    loadOlderMessages,
    selectedContact,
    selectedGroup,
    currentChatType,
  ]);

  // Fetch complete user data when viewing a conversation
  useEffect(() => {
    // Handle user conversations
    if (currentChatType === "USER" && selectedContact?.id) {
      console.log(
        `[ChatArea] Selected contact changed to: ${selectedContact.id}`,
      );

      // Tạm thời bỏ qua logic đánh dấu đã đọc để tránh vòng lặp vô hạn
      // TODO: Cần sửa lại logic markAsRead trong conversationsStore

      // Reset global unread count
      resetUnread();

      // Fetch complete user data to ensure we have userInfo
      const fetchCompleteUserData = async () => {
        try {
          // Check if we already have complete user data in conversations store
          const existingConversation = conversations.find(
            (conv) =>
              conv.type === "USER" && conv.contact.id === selectedContact.id,
          );

          // If we already have complete user data, use it instead of making an API call
          if (existingConversation?.contact?.userInfo?.fullName) {
            console.log(
              `[ChatArea] Using existing user data for ${selectedContact.id} from conversations store`,
            );
            const { setSelectedContact } = useChatStore.getState();
            setSelectedContact(
              existingConversation.contact as User & { userInfo: UserInfo },
            );
            return;
          }

          // Otherwise, fetch from API
          const result = await getUserDataById(selectedContact.id);
          if (result.success && result.user) {
            // Get the current selected contact to make sure it hasn't changed
            const currentSelectedContact =
              useChatStore.getState().selectedContact;

            // Only update if the selected contact is still the same
            if (currentSelectedContact?.id === selectedContact.id) {
              // Update the selected contact with complete user data
              const { setSelectedContact } = useChatStore.getState();
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
              setSelectedContact(user as User & { userInfo: UserInfo });
            } else {
              console.log(
                `[ChatArea] Selected contact changed while fetching data, skipping update`,
              );
            }
          }
        } catch (error) {
          console.error("Error fetching complete user data:", error);
        }
      };

      fetchCompleteUserData();
    }
    // Handle group conversations
    else if (currentChatType === "GROUP" && selectedGroup?.id) {
      console.log(`[ChatArea] Selected group changed to: ${selectedGroup.id}`);

      // Tạm thời bỏ qua logic đánh dấu đã đọc để tránh vòng lặp vô hạn
      // TODO: Cần sửa lại logic markAsRead trong conversationsStore

      // Reset global unread count
      resetUnread();

      // No need to fetch user data for group members - we already have this information
      // in the group object from the conversations store
    }
  }, [
    selectedContact?.id,
    selectedGroup?.id,
    currentChatType,
    resetUnread,
    conversations,
  ]);

  // Track typing status from conversationsStore
  // Use a ref to track the subscription
  const typingSubscriptionRef = useRef<(() => void) | null>(null);
  // Use a ref to track the current typing status to avoid unnecessary state updates
  const currentTypingStatusRef = useRef<boolean>(false);
  // Use a ref to track the current conversation ID to avoid unnecessary re-subscriptions
  const typingConversationIdRef = useRef<string | null>(null);

  // Function to update typing status - extracted to avoid creating in render
  // Optimized to prevent infinite update loops
  const updateTypingStatus = useCallback(
    (newStatus: boolean) => {
      // Only update state if status has changed
      if (currentTypingStatusRef.current !== newStatus) {
        // Update the ref first
        currentTypingStatusRef.current = newStatus;

        // Then update the state
        setIsTyping(newStatus);

        // Scroll to bottom when typing status changes to true
        if (newStatus) {
          // Use setTimeout with 0 delay to ensure this happens after state updates
          setTimeout(() => {
            scrollToBottom("smooth");
          }, 0);
        }
      }
    },
    [scrollToBottom],
  );

  // Effect for typing indicator - optimized to prevent infinite updates
  useEffect(() => {
    // Skip if no selected conversation
    if ((!selectedContact && !selectedGroup) || !currentChatType) {
      updateTypingStatus(false);
      return;
    }

    const conversationId =
      currentChatType === "USER" ? selectedContact?.id : selectedGroup?.id;

    if (!conversationId) {
      updateTypingStatus(false);
      return;
    }

    // If the conversation hasn't changed, don't re-subscribe
    if (typingConversationIdRef.current === conversationId) {
      return;
    }

    console.log(
      `[ChatArea] Setting up typing indicator for ${currentChatType}: ${conversationId}`,
    );

    // Update the current conversation ID
    typingConversationIdRef.current = conversationId;

    // Clean up previous subscription if it exists
    if (typingSubscriptionRef.current) {
      typingSubscriptionRef.current();
      typingSubscriptionRef.current = null;
    }

    // Check initial typing status - use a local variable to avoid closure issues
    let initialTypingStatus = false;
    if (currentChatType === "USER") {
      const conversation = conversations.find(
        (conv) =>
          conv.type === "USER" && conv.contact.id === selectedContact?.id,
      );
      initialTypingStatus = !!conversation?.isTyping;
    } else {
      const conversation = conversations.find(
        (conv) => conv.type === "GROUP" && conv.group?.id === selectedGroup?.id,
      );
      initialTypingStatus = !!conversation?.isTyping;
    }

    // Update initial typing status
    updateTypingStatus(initialTypingStatus);

    // Create a stable reference to the conversation type and ID
    const stableType = currentChatType;
    const stableId = conversationId;

    // Use a local variable to track the last typing status to avoid unnecessary updates
    let lastTypingStatus = initialTypingStatus;

    // Subscribe to changes
    const unsubscribe = useConversationsStore.subscribe((state) => {
      // Skip processing if component is unmounted or conversation changed
      if (typingConversationIdRef.current !== stableId) {
        return;
      }

      // Get the current state to make sure the conversation hasn't changed
      const currentState = useChatStore.getState();
      const currentId =
        currentState.currentChatType === "USER"
          ? currentState.selectedContact?.id
          : currentState.selectedGroup?.id;

      if (
        !currentId ||
        currentId !== stableId ||
        currentState.currentChatType !== stableType
      ) {
        // If conversation has changed, don't update typing status
        return;
      }

      // Find the updated conversation
      let updatedConversation;
      if (stableType === "USER") {
        updatedConversation = state.conversations.find(
          (conv) => conv.type === "USER" && conv.contact.id === stableId,
        );
      } else {
        updatedConversation = state.conversations.find(
          (conv) => conv.type === "GROUP" && conv.group?.id === stableId,
        );
      }

      // Get the new typing status
      const newTypingStatus = !!updatedConversation?.isTyping;

      // Only update if the status has changed
      if (newTypingStatus !== lastTypingStatus) {
        lastTypingStatus = newTypingStatus;
        // Use requestAnimationFrame to batch updates and avoid React render cycles
        requestAnimationFrame(() => {
          // Double-check that the conversation hasn't changed before updating
          if (typingConversationIdRef.current === stableId) {
            updateTypingStatus(newTypingStatus);
          }
        });
      }
    });

    // Store the unsubscribe function in the ref
    typingSubscriptionRef.current = unsubscribe;

    return () => {
      // Clean up subscription when unmounting or changing conversation
      if (typingSubscriptionRef.current) {
        typingSubscriptionRef.current();
        typingSubscriptionRef.current = null;
      }
      // Reset typing status
      updateTypingStatus(false);
      // Reset current conversation ID
      typingConversationIdRef.current = null;
    };
  }, [
    selectedContact?.id,
    selectedGroup?.id,
    currentChatType,
    conversations,
    updateTypingStatus,
    selectedContact,
    selectedGroup,
  ]);

  const handleReply = (message: Message) => {
    setReplyingTo(message);
  };

  const handleMessageClick = (message: Message) => {
    // Chỉ mở dialog khi tin nhắn có media
    if (
      message.content.media?.length ||
      message.content.image ||
      message.content.video
    ) {
      setSelectedMessage(message);
      setIsDialogOpen(true);
    } else if (message.content.text) {
      // Nếu chỉ có text thì hiển thị toast
    }
  };

  const handleCancelReply = () => {
    setReplyingTo(null);
  };

  const handleSendMessage = (text: string, files?: File[]) => {
    sendMessage(text, files, currentUser);
  };

  // Group messages by date
  const groupMessagesByDate = () => {
    const groups: { date: string; messages: Message[] }[] = [];
    let currentDate = "";
    let currentGroup: Message[] = [];

    messages.forEach((message) => {
      // Use our utility function to format the date
      const messageDate = formatMessageDate(message.createdAt);

      if (messageDate !== currentDate) {
        if (currentGroup.length > 0) {
          groups.push({ date: currentDate, messages: currentGroup });
        }
        currentDate = messageDate;
        currentGroup = [message];
      } else {
        currentGroup.push(message);
      }
    });

    if (currentGroup.length > 0) {
      groups.push({ date: currentDate, messages: currentGroup });
    }

    return groups;
  };

  // Group messages by sender (to avoid showing avatar for consecutive messages)
  const processMessagesForDisplay = (messages: Message[]) => {
    if (!messages || !Array.isArray(messages)) {
      console.error(
        "Invalid messages array in processMessagesForDisplay",
        messages,
      );
      return [];
    }

    return messages
      .map((message, index, array) => {
        // Ensure message is valid
        if (!message) {
          console.error("Invalid message in processMessagesForDisplay");
          return {
            message: {} as Message,
            isCurrentUser: false,
            showAvatar: false,
            userInfo: undefined,
          };
        }

        // Safely check if current user exists
        const isCurrentUser = currentUser?.id
          ? message.senderId === currentUser.id
          : false;
        const prevMessage = index > 0 ? array[index - 1] : null;
        const showAvatar =
          !prevMessage || prevMessage.senderId !== message.senderId;

        // Ensure we have userInfo for the sender
        let userInfo = message.sender?.userInfo;

        // For group messages, try to find sender info from the group members
        if (currentChatType === "GROUP" && !isCurrentUser) {
          // Ưu tiên sử dụng thông tin từ message.sender nếu đã có
          if (!userInfo || !userInfo.fullName) {
            // Tìm thông tin nhóm từ conversationsStore
            const groupConversation = conversations?.find(
              (conv) =>
                conv?.type === "GROUP" &&
                (conv?.group?.id === message.groupId ||
                  (selectedGroup && conv?.group?.id === selectedGroup.id)),
            );

            // Tìm thông tin người gửi từ danh sách thành viên nhóm
            // Ưu tiên tìm theo userId vì đó là ID thực của người dùng
            let memberInfo = null;

            // 1. Tìm trong API response của conversation
            if (groupConversation?.group) {
              // API response có thể có trường members khác với Group interface
              // Định nghĩa interface cho member từ API response
              interface ApiGroupMember {
                id: string;
                userId: string;
                fullName: string;
                profilePictureUrl?: string | null;
                role: string;
              }

              const apiMembers = (
                groupConversation.group as { members?: ApiGroupMember[] }
              ).members;
              if (apiMembers && Array.isArray(apiMembers)) {
                const member = apiMembers.find(
                  (m: ApiGroupMember) => m.userId === message.senderId,
                );

                if (member) {
                  memberInfo = {
                    id: member.userId,
                    fullName: member.fullName,
                    profilePictureUrl: member.profilePictureUrl,
                    role: member.role,
                  };
                }
              }
            }

            // 2. Nếu không tìm thấy, thử tìm trong memberUsers
            if (!memberInfo && groupConversation?.group?.memberUsers) {
              const memberUser = groupConversation.group.memberUsers.find(
                (m) => m.id === message.senderId,
              );

              if (memberUser) {
                memberInfo = memberUser;
              }
            }

            // 3. Nếu vẫn không tìm thấy, thử tìm trong selectedGroup
            if (!memberInfo && selectedGroup) {
              // Tìm trong members
              if (selectedGroup.members) {
                const member = selectedGroup.members.find(
                  (m: GroupMember) => m.userId === message.senderId,
                );

                if (member) {
                  // Lấy thông tin từ user object của member
                  memberInfo = {
                    id: member.userId,
                    fullName: member.user?.userInfo?.fullName || "Unknown",
                    profilePictureUrl: member.user?.userInfo?.profilePictureUrl,
                    role: member.role,
                  };
                }
              }

              // Tìm trong memberUsers
              if (!memberInfo && selectedGroup.memberUsers) {
                const memberUser = selectedGroup.memberUsers.find(
                  (m) => m.id === message.senderId,
                );

                if (memberUser) {
                  memberInfo = memberUser;
                }
              }
            }

            // Nếu tìm thấy thông tin thành viên, tạo userInfo
            if (memberInfo) {
              userInfo = {
                id: memberInfo.id,
                fullName: memberInfo.fullName || "Unknown",
                profilePictureUrl: memberInfo.profilePictureUrl,
                createdAt: new Date(),
                updatedAt: new Date(),
                blockStrangers: false,
                userAuth: { id: memberInfo.id } as User,
              };

              // Cập nhật thông tin người gửi vào message để đảm bảo tính nhất quán
              if (message.sender) {
                message.sender.userInfo = userInfo;
              } else {
                message.sender = {
                  id: memberInfo.id,
                  userInfo: userInfo,
                } as User;
              }
            }
          }
        }

        // Fallback to selected contact info for direct messages
        if (
          !userInfo &&
          currentChatType === "USER" &&
          selectedContact?.userInfo
        ) {
          userInfo = selectedContact.userInfo;
        }

        // Ensure userInfo is never null (only undefined is allowed by the type)
        if (userInfo === null) {
          userInfo = undefined;
        }

        return { message, isCurrentUser, showAvatar, userInfo };
      })
      .filter((item) => item.message && item.message.id); // Filter out invalid messages
  };

  const messageGroups = groupMessagesByDate();

  // Process messages or search results for display
  const renderMessageContent = () => {
    // If we're searching, display search results
    if (searchText && searchResults.length > 0) {
      return (
        <>
          <div className="mb-4">
            <div className="sticky top-0 bg-blue-50 p-2 rounded-md flex justify-between items-center mb-4 z-10">
              <div className="text-sm text-blue-700">
                Kết quả tìm kiếm: {searchResults.length} tin nhắn
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-blue-700 hover:bg-blue-100"
                onClick={clearSearch}
              >
                <X className="h-4 w-4 mr-1" />
                Đóng
              </Button>
            </div>

            {processMessagesForDisplay(searchResults).map(
              ({ message, isCurrentUser, showAvatar, userInfo }) => (
                <MessageItem
                  key={message.id}
                  message={message}
                  isCurrentUser={isCurrentUser}
                  showAvatar={showAvatar}
                  onReply={handleReply}
                  onMessageClick={handleMessageClick}
                  highlight={searchText}
                  userInfo={userInfo}
                  isGroupMessage={currentChatType === "GROUP"}
                />
              ),
            )}
          </div>

          {/* Typing indicator at the bottom */}
          {isTyping && (
            <div className="mb-2">
              {currentChatType === "USER" && selectedContact ? (
                <TypingIndicator
                  contact={selectedContact}
                  isTyping={isTyping}
                />
              ) : currentChatType === "GROUP" && selectedGroup ? (
                <TypingIndicator
                  group={selectedGroup}
                  isTyping={isTyping}
                  typingUsers={
                    conversations.find(
                      (c) =>
                        c.type === "GROUP" && c.group?.id === selectedGroup.id,
                    )?.typingUsers
                  }
                />
              ) : null}
            </div>
          )}
        </>
      );
    }

    // Otherwise show normal messages grouped by date
    return (
      <>
        {messageGroups.length > 0 ? (
          messageGroups.map((group, groupIndex) => (
            <div key={groupIndex} className="mb-4">
              <div className="flex justify-center mb-4">
                <div className="bg-white px-3 py-1 rounded-full text-xs text-gray-500 shadow-sm">
                  {group.date}
                </div>
              </div>

              {processMessagesForDisplay(group.messages).map(
                ({ message, isCurrentUser, showAvatar, userInfo }) => (
                  <MessageItem
                    key={message.id}
                    message={message}
                    isCurrentUser={isCurrentUser}
                    showAvatar={showAvatar}
                    onReply={handleReply}
                    onMessageClick={handleMessageClick}
                    userInfo={userInfo}
                    isGroupMessage={currentChatType === "GROUP"}
                  />
                ),
              )}
            </div>
          ))
        ) : (
          <div className="h-full flex items-center justify-center">
            <p className="text-gray-500">
              Chưa có tin nhắn nào. Hãy bắt đầu cuộc trò chuyện!
            </p>
          </div>
        )}

        {/* Typing indicator at the bottom */}
        {isTyping && (
          <div className="mb-2">
            {currentChatType === "USER" && selectedContact ? (
              <TypingIndicator contact={selectedContact} isTyping={isTyping} />
            ) : currentChatType === "GROUP" && selectedGroup ? (
              <TypingIndicator
                group={selectedGroup}
                isTyping={isTyping}
                typingUsers={
                  conversations.find(
                    (c) =>
                      c.type === "GROUP" && c.group?.id === selectedGroup.id,
                  )?.typingUsers
                }
              />
            ) : null}
          </div>
        )}
      </>
    );
  };

  // Kiểm tra xem nhóm có còn tồn tại không khi selectedGroup thay đổi hoặc danh sách cuộc trò chuyện thay đổi
  // Optimized to prevent infinite update loops
  useEffect(() => {
    // Skip if no group selected
    if (currentChatType !== "GROUP" || !selectedGroup || !selectedGroup.id) {
      return;
    }

    // Store the current group ID to avoid closure issues
    const currentGroupId = selectedGroup.id;

    // Use setTimeout to ensure this check happens after other state updates
    const checkGroupExistence = setTimeout(() => {
      // Get the latest conversations state
      const currentConversations =
        useConversationsStore.getState().conversations;

      // Check if the group still exists
      const groupExists = currentConversations.some(
        (conv) => conv.type === "GROUP" && conv.group?.id === currentGroupId,
      );

      // If group doesn't exist, close the chat
      if (!groupExists) {
        console.log(
          `[ChatArea] Group ${currentGroupId} no longer exists in conversations, closing chat`,
        );
        // Get the current chat state to ensure we're still looking at the same group
        const currentChatState = useChatStore.getState();
        if (currentChatState.selectedGroup?.id === currentGroupId) {
          useChatStore.getState().setSelectedGroup(null);
        }
      }
    }, 100); // Small delay to avoid race conditions

    // Clean up the timeout
    return () => clearTimeout(checkGroupExistence);
  }, [
    currentChatType,
    selectedGroup?.id,
    // Remove conversations and conversations.length from dependencies to prevent excessive re-renders
  ]);

  // Check if current user is valid - this helps prevent errors when auth state changes
  const isUserValid = !!currentUser?.id;

  // If user is not valid, show a message instead of the chat
  if (!isUserValid) {
    return (
      <div className="flex flex-col h-full w-full items-center justify-center bg-gray-50">
        <div className="text-center p-4">
          <p className="text-gray-500 mb-2">
            Phiên đăng nhập của bạn đã hết hạn.
          </p>
          <p className="text-gray-500">Vui lòng đăng nhập lại để tiếp tục.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full">
      {currentChatType === "USER" ? (
        <ChatHeader
          contact={selectedContact}
          onToggleInfo={onToggleInfo}
          onBackToList={onBackToList}
        />
      ) : (
        <GroupChatHeader
          group={selectedGroup}
          onToggleInfo={onToggleInfo}
          onBackToList={onBackToList}
        />
      )}

      <ChatMessagesDropZone
        onFileDrop={(files) => handleSendMessage("", files)}
      >
        <div
          ref={chatContainerRef}
          className="overflow-y-auto overflow-x-hidden bg-gray-50 p-4 custom-scrollbar h-full"
        >
          {selectedContact || selectedGroup ? (
            isLoading ? (
              <div className="h-full flex items-center justify-center">
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 border-4 border-t-blue-500 border-b-blue-300 border-l-blue-300 border-r-blue-300 rounded-full animate-spin mb-2"></div>
                  <p className="text-gray-500">Đang tải tin nhắn...</p>
                </div>
              </div>
            ) : (
              <>
                {isLoadingOlder && (
                  <div className="flex justify-center mb-4">
                    <div className="flex items-center text-xs text-gray-500">
                      <div className="w-4 h-4 border-2 border-t-blue-500 border-b-blue-300 border-l-blue-300 border-r-blue-300 rounded-full animate-spin mr-2"></div>
                      Đang tải tin nhắn cũ hơn...
                    </div>
                  </div>
                )}
                {renderMessageContent()}
              </>
            )
          ) : (
            <div className="h-full flex items-center justify-center">
              <p className="text-gray-500">
                Chọn một liên hệ hoặc nhóm để bắt đầu trò chuyện
              </p>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </ChatMessagesDropZone>

      <MessageInput
        onSendMessage={handleSendMessage}
        disabled={(!selectedContact && !selectedGroup) || isSearching}
        replyingTo={replyingTo}
        onCancelReply={handleCancelReply}
      />

      {/* Dialog hiển thị chi tiết tin nhắn */}
      <MessageDetailDialog
        message={selectedMessage}
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        userInfo={
          selectedMessage?.sender?.userInfo ||
          (currentChatType === "USER" ? selectedContact?.userInfo : undefined)
        }
      />
    </div>
  );
}
