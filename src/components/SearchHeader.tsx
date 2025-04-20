"use client";
import {
  Search,
  UserPlus,
  Users,
  X,
  MoreHorizontal,
  Clock,
  Bell,
  SmilePlus,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useDebounce } from "@/hooks/useDebounce";
import { searchUser, getUserDataById } from "@/actions/user.action";
import { searchMessagesGlobal } from "@/actions/message.action";
import { getFriendsList } from "@/actions/friend.action";
import { isEmail, isPhoneNumber } from "@/utils/helpers";
import { useAuthStore } from "@/stores/authStore";
import { useChatStore } from "@/stores/chatStore";
import { User, Message } from "@/types/base";
import { toast } from "sonner";

import ProfileDialog from "./profile/ProfileDialog";
import QRCodeDialog from "./QRCodeDialog";
import { cn } from "@/lib/utils";
import CreateGroupDialog from "./group/CreateGroupDialog";

// Extended Message type with search context
interface MessageWithContext extends Message {
  _searchContext?: {
    userId: string;
  };
}

// Sử dụng type đơn giản hóa cho Friend
type Friend = {
  id: string;
  fullName: string;
  profilePictureUrl: string;
  phoneNumber?: string;
  email?: string;
};

// Type cho kết quả tìm kiếm tin nhắn
interface SearchResultMessage {
  id: string;
  sender: {
    id: string;
    fullName: string;
    profilePictureUrl: string;
  };
  content: string;
  conversationName?: string;
  date: string;
  highlighted?: boolean;
  _searchContext?: {
    userId: string;
  };
}

// Type đơn giản hóa cho kết quả tìm kiếm người dùng
type UserSearchResult = {
  id: string;
  fullName: string;
  profilePictureUrl: string;
  phoneNumber: string;
  email?: string;
};

export default function SearchHeader({ className }: { className?: string }) {
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [showResults, setShowResults] = useState<boolean>(false);
  const [showSuggestions, setShowSuggestions] = useState<boolean>(false);
  const [isSearchActive, setIsSearchActive] = useState<boolean>(false);
  const [filteredFriends, setFilteredFriends] = useState<Friend[]>([]);
  const [allFriends, setAllFriends] = useState<Friend[]>([]);
  const [filteredMessages, setFilteredMessages] = useState<
    SearchResultMessage[]
  >([]);
  // State lưu thông tin người gửi đã được lấy từ API
  const [senderDetails, setSenderDetails] = useState<{ [key: string]: User }>(
    {},
  );

  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [phoneSearchResult, setPhoneSearchResult] =
    useState<UserSearchResult | null>(null);
  const [isSearchingUser, setIsSearchingUser] = useState<boolean>(false);
  const [isLoadingFriends, setIsLoadingFriends] = useState<boolean>(false);
  const [showProfileDialog, setShowProfileDialog] = useState<boolean>(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isAddFriendMode, setIsAddFriendMode] = useState<boolean>(false);
  const [showQRCodeDialog, setShowQRCodeDialog] = useState<boolean>(false);
  const [showCreateGroupDialog, setShowCreateGroupDialog] =
    useState<boolean>(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const { accessToken, user: currentUser } = useAuthStore();
  const { openChat } = useChatStore();
  const router = useRouter();

  // Lấy danh sách bạn bè khi component mount và người dùng đã đăng nhập
  useEffect(() => {
    const fetchFriends = async () => {
      // Kiểm tra xem người dùng đã đăng nhập hay chưa
      if (!accessToken || !currentUser) {
        setAllFriends([]);
        return;
      }

      try {
        setIsLoadingFriends(true);
        const result = await getFriendsList(accessToken);
        if (result.success && result.friends) {
          setAllFriends(result.friends);
        } else {
          console.error("Failed to fetch friends:", result.error);
        }
      } catch (error) {
        console.error("Error fetching friends:", error);
      } finally {
        setIsLoadingFriends(false);
      }
    };

    fetchFriends();
  }, [accessToken, currentUser]);

  // Effect để lấy thông tin người gửi từ API khi có kết quả tìm kiếm
  useEffect(() => {
    // Nếu không có tin nhắn hoặc không có token, không làm gì
    if (filteredMessages.length === 0 || !accessToken || !currentUser) {
      return;
    }

    // Lấy danh sách ID người gửi để lấy thông tin
    // Loại bỏ các ID không hợp lệ ngay từ đầu
    const senderIds = filteredMessages
      .filter((msg) => {
        // Kiểm tra ID hợp lệ và không phải ID hệ thống
        return (
          msg.sender &&
          msg.sender.id &&
          msg.sender.id.trim() !== "" &&
          msg.sender.id !== "system" &&
          msg.sender.id !== "unknown" &&
          msg.sender.id !== "loading"
        );
      })
      .map((msg) => msg.sender.id)
      // Lọc các ID trùng lặp
      .filter((id, index, self) => self.indexOf(id) === index);

    // Nếu không có ID hợp lệ nào, không làm gì
    if (senderIds.length === 0) {
      return;
    }

    // Lấy thông tin người gửi từ API
    const fetchSenderDetails = async () => {
      for (const senderId of senderIds) {
        // Kiểm tra xem đã có thông tin người gửi trong state chưa
        if (!senderDetails[senderId]) {
          try {
            // Gọi API với ID đã được kiểm tra
            const result = await getUserDataById(senderId);

            if (result.success && result.user) {
              // Cập nhật thông tin người gửi vào state
              setSenderDetails((prev) => ({
                ...prev,
                [senderId]: result.user,
              }));
            }
          } catch (error) {
            console.error(`Error fetching user data for ${senderId}:`, error);
            // Không làm gì khi có lỗi, để tránh gọi lại API
          }
        }
      }
    };

    fetchSenderDetails();
  }, [filteredMessages, accessToken, currentUser, senderDetails]);

  // Handle click outside to close search results and suggestions
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        searchRef.current &&
        !searchRef.current.contains(event.target as Node)
      ) {
        setShowResults(false);
        setShowSuggestions(false);
        setIsSearchActive(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Search function
  useEffect(() => {
    if (!debouncedSearchQuery) {
      setFilteredFriends([]);
      setFilteredMessages([]);
      setPhoneSearchResult(null);
      setIsSearchingUser(false);
      return;
    }

    // Kiểm tra xem có phải số điện thoại hoặc email không
    const isPhone = isPhoneNumber(debouncedSearchQuery);
    const isEmailValue = isEmail(debouncedSearchQuery);
    const isSearchingUser = isPhone || isEmailValue;
    setIsSearchingUser(isSearchingUser);

    // Tìm kiếm tin nhắn dựa trên từ khóa
    const searchForMessages = async () => {
      // Kiểm tra xem người dùng đã đăng nhập hay chưa
      if (!accessToken || !currentUser) {
        setFilteredMessages([]);
        return;
      }

      try {
        console.log("Searching messages with query:", debouncedSearchQuery);
        // Hiển thị trạng thái đang tìm kiếm
        setFilteredMessages([
          {
            id: "loading",
            content: "Đang tìm kiếm tin nhắn...",
            sender: {
              id: "system",
              fullName: "Hệ thống",
              profilePictureUrl: "/images/default-avatar.png",
            },
            date: new Date().toLocaleDateString(),
            highlighted: false,
          },
        ]);

        // Lấy danh sách ID của tất cả bạn bè để tìm kiếm tin nhắn
        const friendIds = allFriends.map((friend) => friend.id);

        // Nếu không có bạn bè nào, không cần tìm kiếm
        if (friendIds.length === 0) {
          setFilteredMessages([]);
          return;
        }

        // Truyền token và danh sách ID bạn bè vào hàm searchMessagesGlobal
        const result = await searchMessagesGlobal(
          debouncedSearchQuery,
          friendIds,
        );

        if (result.success && result.messages && result.messages.length > 0) {
          console.log("Found messages:", result.messages.length);
          // Chuyển đổi từ Message từ API sang SearchResultMessage trong component
          const messages: SearchResultMessage[] = result.messages.map(
            (message: MessageWithContext) => {
              try {
                // Xử lý nội dung tin nhắn
                let messageContent = "";
                if (typeof message.content === "string") {
                  messageContent = message.content;
                } else if (
                  message.content &&
                  typeof message.content === "object"
                ) {
                  // Kiểm tra nếu content là object và có thuộc tính text
                  messageContent = message.content.text || "";
                }

                // Sử dụng messageContent để hiển thị nội dung tin nhắn

                // Xử lý thông tin người gửi dựa trên dữ liệu trả về từ API
                // Dữ liệu trả về có dạng: sender: { id, email, phoneNumber, ... }

                // Lấy thông tin về cuộc trò chuyện
                let conversationInfo = "";
                if (message._searchContext && message._searchContext.userId) {
                  // Tìm tên người dùng từ danh sách bạn bè
                  const friend = allFriends.find(
                    (f) => f.id === message._searchContext?.userId,
                  );
                  if (friend) {
                    conversationInfo = friend.fullName;
                  }
                }

                // Lưu thông tin người gửi từ API response
                return {
                  id: message.id,
                  content: messageContent,
                  conversationName: conversationInfo,
                  sender: {
                    id: message.sender.id,
                    fullName: message.sender.email
                      ? message.sender.email.split("@")[0]
                      : "Người dùng",
                    profilePictureUrl: "/images/default-avatar.png",
                  },
                  date:
                    typeof message.createdAt === "string"
                      ? message.createdAt
                      : new Date().toISOString(),
                  highlighted: true,
                  _searchContext: message._searchContext,
                };
              } catch (mapError) {
                console.error("Error mapping message:", mapError, message);
                // Trả về một tin nhắn mặc định nếu có lỗi khi chuyển đổi
                return {
                  id: message.id || "unknown-id",
                  content: "Không thể hiển thị nội dung tin nhắn",
                  sender: {
                    id: "unknown",
                    fullName: "Người dùng",
                    profilePictureUrl: "/images/default-avatar.png",
                  },
                  date: new Date().toLocaleDateString(),
                  highlighted: true,
                };
              }
            },
          );

          // Lọc bỏ các tin nhắn không hợp lệ
          const validMessages = messages.filter(
            (msg) => msg.id !== "unknown-id",
          );
          setFilteredMessages(validMessages);
        } else {
          console.log("No messages found or API returned error");
          // Hiển thị thông báo không tìm thấy kết quả
          setFilteredMessages([]);
        }
      } catch (error) {
        console.error("Error searching messages:", error);
        setFilteredMessages([]);
      }
    };

    // Gọi hàm tìm kiếm tin nhắn
    searchForMessages();

    if (isSearchingUser) {
      // Nếu là số điện thoại hoặc email hợp lệ, gọi API tìm kiếm
      const searchUserByValue = async () => {
        // Kiểm tra xem người dùng đã đăng nhập hay chưa
        if (!accessToken || !currentUser) {
          setPhoneSearchResult(null);
          return;
        }

        try {
          // Gọi API tìm kiếm người dùng bằng số điện thoại hoặc email
          const result = await searchUser(debouncedSearchQuery);

          if (result.success && result.user) {
            // API trả về dữ liệu người dùng trực tiếp, không phải trong trường user
            const userData = result.user;
            setPhoneSearchResult({
              id: userData.id,
              fullName: userData.userInfo?.fullName || "Người dùng",
              profilePictureUrl:
                userData.userInfo?.profilePictureUrl ||
                "/images/default-avatar.png",
              phoneNumber: userData.phoneNumber || debouncedSearchQuery, // Nếu tìm bằng email, có thể không có phoneNumber
            });
          } else {
            setPhoneSearchResult(null);
          }
        } catch (error) {
          // Xử lý lỗi 404 (không tìm thấy) và các lỗi khác
          console.log("Error searching user:", error);
          // Không hiển thị lỗi, chỉ đặt kết quả tìm kiếm là null
          setPhoneSearchResult(null);
          // Không hiển thị toast lỗi, để UI hiển thị "Không tìm thấy người dùng"
        }
      };

      // Gọi hàm tìm kiếm
      searchUserByValue();
    } else {
      // Tìm kiếm bạn bè dựa trên tên
      // Lọc danh sách bạn bè từ API
      const filtered = allFriends.filter((friend) =>
        friend.fullName
          .toLowerCase()
          .includes(debouncedSearchQuery.toLowerCase()),
      );
      setFilteredFriends(filtered);
      setPhoneSearchResult(null);
    }
  }, [
    debouncedSearchQuery,
    allFriends,
    isAddFriendMode,
    accessToken,
    currentUser,
  ]);

  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    if (e.target.value) {
      setShowResults(true);
      setShowSuggestions(false);
    } else {
      setShowResults(false);
      setShowSuggestions(true);
    }
  };

  // Handle search activation
  const activateSearch = () => {
    setIsSearchActive(true);
    setShowSuggestions(true);
    // Dispatch a custom event to notify other components
    const event = new CustomEvent("searchActivated", {
      detail: { active: true },
    });
    document.dispatchEvent(event);
  };

  // Handle search deactivation
  const deactivateSearch = () => {
    console.log("Deactivating search");
    setIsSearchActive(false);
    setShowResults(false);
    setShowSuggestions(false);
    setSearchQuery("");
    setIsAddFriendMode(false);
    // Dispatch a custom event to notify other components
    const event = new CustomEvent("searchActivated", {
      detail: { active: false },
    });
    document.dispatchEvent(event);
  };

  // Handle add friend mode
  const activateAddFriendMode = () => {
    // Thay vì focus vào input, hiển thị dialog QR code
    setShowQRCodeDialog(true);
  };

  // Handle user profile click
  const handleUserClick = async (user: UserSearchResult) => {
    try {
      // Fetch complete user data using getUserDataById
      const result = await getUserDataById(user.id);

      if (result.success && result.user) {
        // Use the complete user data from the API
        setSelectedUser(result.user);
      } else {
        // Fallback to simplified user object if API call fails
        console.error("Failed to fetch complete user data:", result.error);
        // Chuyển đổi từ UserSearchResult sang User
        // Sử dụng type assertion để tránh lỗi TypeScript
        const userForProfile = {
          id: user.id,
          userInfo: {
            fullName: user.fullName,
            profilePictureUrl: user.profilePictureUrl,
          },
          email: user.email,
          phoneNumber: user.phoneNumber,
        } as unknown as User;

        setSelectedUser(userForProfile);
      }

      // Show the profile dialog
      setShowProfileDialog(true);
    } catch (error) {
      console.error("Error fetching user data:", error);
      toast.error("Không thể tải thông tin người dùng");
    }
  };

  // Handle search submission
  const handleSearchSubmit = () => {
    if (searchQuery.trim() && !recentSearches.includes(searchQuery)) {
      setRecentSearches((prev) => [searchQuery, ...prev.slice(0, 4)]);
    }
  };

  // Handle selecting a recent search
  const handleSelectRecentSearch = (search: string) => {
    setSearchQuery(search);
    setShowSuggestions(false);
    setShowResults(true);
  };

  // Clear search
  const clearSearch = () => {
    setSearchQuery("");
  };

  // Group friends by first letter for alphabetical display
  const groupFriendsByLetter = () => {
    const groups: { [key: string]: Friend[] } = {};

    const friendsToGroup = searchQuery ? filteredFriends : allFriends;

    friendsToGroup.forEach((friend) => {
      const firstLetter = friend.fullName.charAt(0).toUpperCase();
      if (!groups[firstLetter]) {
        groups[firstLetter] = [];
      }
      groups[firstLetter].push(friend);
    });

    return groups;
  };

  const friendsByLetter = groupFriendsByLetter();

  return (
    <div
      className={cn(`w-[300px] p-4 relative border-r bg-white`, className)}
      ref={searchRef}
    >
      {/* Header with search input and buttons */}
      <div className="flex items-center justify-between w-full">
        {!isSearchActive ? (
          // Normal state - Search input with buttons
          <>
            <div className="relative w-[200px]">
              <div
                className="flex items-center border border-gray-200 rounded-md px-2 h-8 w-full cursor-pointer"
                onClick={activateSearch}
              >
                <Search className="h-4 w-4 text-gray-500" />
                <div className="border-0 h-8 bg-transparent outline-none w-full text-xs ml-2 py-0 text-gray-400 flex items-center">
                  Tìm kiếm
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                className="h-8 w-8 rounded-full hover:bg-gray-100 flex items-center justify-center"
                title="Tìm kiếm và kết bạn"
                onClick={activateAddFriendMode}
              >
                <UserPlus className="h-5 w-5" />
              </button>
              <button
                className="h-8 w-8 rounded-full hover:bg-gray-100 flex items-center justify-center"
                title="Tạo nhóm"
                onClick={() => setShowCreateGroupDialog(true)}
              >
                <Users className="h-5 w-5" />
              </button>
            </div>
          </>
        ) : (
          // Active search state - Full width input with close button
          <>
            <div className="relative flex-1 mr-2">
              <div className="flex items-center border border-gray-200 rounded-md px-2 h-8 w-full bg-gray-50">
                <Search className="h-4 w-4 text-gray-500" />
                <input
                  placeholder="Tìm kiếm"
                  className="border-0 h-8 bg-transparent outline-none w-full text-xs placeholder:text-[0.8125rem] ml-2 py-0"
                  value={searchQuery}
                  onChange={handleSearchChange}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleSearchSubmit();
                    }
                  }}
                />
                {searchQuery && (
                  <button onClick={clearSearch} className="flex-shrink-0">
                    <X className="h-4 w-4 text-gray-500" />
                  </button>
                )}
              </div>
            </div>

            <button
              onClick={deactivateSearch}
              className="h-8 px-3 rounded-md bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-sm font-medium"
              title="Đóng"
            >
              Đóng
            </button>
          </>
        )}
      </div>

      {/* Search Suggestions Dropdown - Positioned absolutely relative to the parent */}
      {isSearchActive && showSuggestions && (
        <div className="absolute left-0 top-[60px] w-full bg-white border-t border-gray-200 shadow-lg z-50">
          <div className="p-3 border-b border-gray-100">
            <div className="text-sm font-medium mb-2">Tìm gần đây</div>
            {recentSearches.length > 0 ? (
              <div className="space-y-2">
                {recentSearches.map((search, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between hover:bg-gray-50 p-2 rounded-md cursor-pointer"
                    onClick={() => handleSelectRecentSearch(search)}
                  >
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 text-gray-400 mr-2" />
                      <span className="text-sm">{search}</span>
                    </div>
                    <button
                      className="h-6 w-6 rounded-full hover:bg-gray-200 flex items-center justify-center"
                      onClick={(e) => {
                        e.stopPropagation();
                        setRecentSearches((prev) =>
                          prev.filter((_, i) => i !== index),
                        );
                      }}
                    >
                      <X className="h-3 w-3 text-gray-400" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-gray-500 py-2">
                Không có tìm kiếm nào gần đây
              </div>
            )}
          </div>

          <div className="p-3">
            <div className="text-sm font-medium mb-2">Lọc tin nhắn</div>
            <div className="flex space-x-2">
              <div className="bg-gray-100 rounded-full px-3 py-1 flex items-center cursor-pointer hover:bg-gray-200">
                <Bell className="h-4 w-4 text-gray-600 mr-1" />
                <span className="text-sm">Nhắc bạn</span>
              </div>
              <div className="bg-gray-100 rounded-full px-3 py-1 flex items-center cursor-pointer hover:bg-gray-200">
                <SmilePlus className="h-4 w-4 text-gray-600 mr-1" />
                <span className="text-sm">Biểu cảm</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Profile Dialog */}
      {showProfileDialog && selectedUser && (
        <ProfileDialog
          isOpen={showProfileDialog}
          onOpenChange={(open) => setShowProfileDialog(open)}
          user={selectedUser}
          isOwnProfile={selectedUser?.id === currentUser?.id}
          onChat={() => {
            // Xử lý khi nhấn nút nhắn tin
            setShowProfileDialog(false);
          }}
          onCall={() => {
            // Xử lý khi nhấn nút gọi điện
            setShowProfileDialog(false);
            toast.info("Tính năng gọi điện đang được phát triển");
          }}
        />
      )}

      {/* QR Code Dialog */}
      {currentUser && (
        <QRCodeDialog
          isOpen={showQRCodeDialog}
          onClose={() => setShowQRCodeDialog(false)}
          userId={currentUser.id}
        />
      )}

      {/* Create Group Dialog */}
      <CreateGroupDialog
        isOpen={showCreateGroupDialog}
        onOpenChange={setShowCreateGroupDialog}
      />

      {/* Search Results Dropdown */}
      {isSearchActive && showResults && searchQuery && (
        <div className="absolute left-0 top-[60px] w-full bg-white border-t border-gray-200 shadow-lg z-50 overflow-hidden">
          {/* Tab navigation */}
          <div className="flex border-b border-gray-200 bg-white">
            <button className="px-4 py-2 text-[13px] font-semibold text-blue-600 border-b-2 border-blue-600">
              Tất cả
            </button>
            <button className="px-4 py-2 text-[13px] font-semibold text-gray-500 hover:text-gray-700">
              Liên hệ
            </button>
            <button className="px-4 py-2 text-[13px] font-semibold text-gray-500 hover:text-gray-700">
              Tin nhắn
            </button>
            <button className="px-4 py-2 text-[13px] font-semibold text-gray-500 hover:text-gray-700">
              File
            </button>
          </div>

          {/* User search section */}
          {isSearchingUser && (
            <div className="border-b border-gray-100">
              <div className="p-3">
                <div className="text-sm font-medium mb-2">
                  Tìm bạn qua{" "}
                  {isEmail(debouncedSearchQuery) ? "email" : "số điện thoại"}:
                </div>

                {phoneSearchResult ? (
                  <div
                    className="flex items-center py-2 px-1 hover:bg-gray-50 cursor-pointer rounded-md"
                    onClick={() => handleUserClick(phoneSearchResult)}
                  >
                    <div className="flex items-center w-full">
                      <div className="h-10 w-10 rounded-full overflow-hidden mr-3">
                        <Image
                          src={phoneSearchResult.profilePictureUrl}
                          alt={phoneSearchResult.fullName}
                          width={40}
                          height={40}
                          className="object-cover"
                        />
                      </div>
                      <div>
                        <div className="text-sm font-medium">
                          {phoneSearchResult.fullName}
                        </div>
                        <div className="text-xs text-gray-500">
                          {isEmail(debouncedSearchQuery)
                            ? "Email"
                            : "Số điện thoại"}
                          :{" "}
                          <span className="text-blue-500">
                            {isEmail(debouncedSearchQuery)
                              ? phoneSearchResult.email || debouncedSearchQuery
                              : phoneSearchResult.phoneNumber}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-gray-500 py-2">
                    Không tìm thấy người dùng nào với{" "}
                    {isEmail(debouncedSearchQuery) ? "email" : "số điện thoại"}{" "}
                    này
                  </div>
                )}
              </div>
            </div>
          )}

          {filteredMessages.length > 0 && (
            <div className="border-b border-gray-100">
              <div className="text-sm font-medium p-3">
                Tin nhắn{" "}
                {filteredMessages.length > 20
                  ? "(20+)"
                  : `(${filteredMessages.length})`}
              </div>

              {filteredMessages.map((message) => {
                // Nếu là tin nhắn đang tải, hiển thị trạng thái đang tải
                if (message.id === "loading") {
                  return (
                    <div
                      key="loading"
                      className="flex items-center py-2 px-1 rounded-md"
                    >
                      <div className="flex-1 text-center">
                        <div className="animate-pulse flex space-x-4 items-center">
                          <div className="rounded-full bg-gray-200 h-10 w-10"></div>
                          <div className="flex-1 space-y-2 py-1">
                            <div className="h-2 bg-gray-200 rounded w-3/4"></div>
                            <div className="h-2 bg-gray-200 rounded w-1/2"></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                }

                // Xử lý hiển thị tin nhắn bình thường
                const content = message.content;
                const lowerContent = content.toLowerCase();
                const lowerQuery = debouncedSearchQuery.toLowerCase();
                const startIndex = lowerContent.indexOf(lowerQuery);

                // Tách nội dung để đánh dấu từ khóa
                const beforeText =
                  startIndex >= 0 ? content.substring(0, startIndex) : "";
                const highlightedText =
                  startIndex >= 0
                    ? content.substring(
                        startIndex,
                        startIndex + debouncedSearchQuery.length,
                      )
                    : "";
                const afterText =
                  startIndex >= 0
                    ? content.substring(
                        startIndex + debouncedSearchQuery.length,
                      )
                    : content;

                // Tính thời gian hiển thị
                const messageDate = new Date(message.date);
                const now = new Date();
                const diffInMs = now.getTime() - messageDate.getTime();
                const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
                const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));

                let timeDisplay = message.date;
                if (diffInMinutes < 60) {
                  timeDisplay = `${diffInMinutes} phút`;
                } else if (diffInHours < 24) {
                  timeDisplay = `${diffInHours} giờ`;
                } else if (diffInHours < 48) {
                  timeDisplay = "1 ngày";
                } else {
                  const diffInDays = Math.floor(diffInHours / 24);
                  timeDisplay = `${diffInDays} ngày`;
                }

                return (
                  <div
                    key={message.id}
                    className="flex py-3 hover:bg-gray-50 cursor-pointer px-3 border-b border-gray-100"
                    onClick={async (e) => {
                      e.preventDefault();
                      e.stopPropagation();

                      // Lưu ID người dùng trước khi đóng giao diện tìm kiếm
                      let userIdToOpen = null;

                      // Get the correct user ID to open the chat
                      // If the search context has a userId, use that (this is the conversation partner ID)
                      const contextUserId = message._searchContext?.userId;

                      if (contextUserId) {
                        userIdToOpen = contextUserId;
                      } else {
                        // Fallback: If no context userId, check if sender is not the current user
                        const senderId = message.sender.id;
                        if (senderId && senderId !== currentUser?.id) {
                          userIdToOpen = senderId;
                        }
                      }

                      if (userIdToOpen) {
                        try {
                          // Lưu ID vào biến tạm thời
                          const idToOpen = userIdToOpen;

                          // Gọi openChat trước khi đóng giao diện tìm kiếm
                          // Điều này đảm bảo rằng chúng ta đã bắt đầu quá trình mở chat
                          // trước khi component có thể bị unmount
                          const success = await openChat(idToOpen, "USER");

                          // Sau đó mới đóng giao diện tìm kiếm
                          deactivateSearch();

                          if (success) {
                            // Chuyển hướng đến trang chat
                            toast.success("Mở cuộc trò chuyện thành công");
                            router.push("/dashboard/chat");
                          } else {
                            toast.error("Không thể mở cuộc trò chuyện này");
                          }
                        } catch (error) {
                          console.error("Error opening chat:", error);
                          toast.error("Có lỗi xảy ra khi mở cuộc trò chuyện");
                          // Vẫn đóng giao diện tìm kiếm nếu có lỗi
                          deactivateSearch();
                        }
                      } else {
                        toast.error("Không thể mở cuộc trò chuyện này");
                      }
                    }}
                  >
                    <div className="h-10 w-10 rounded-full overflow-hidden mr-3 flex-shrink-0">
                      {senderDetails[message.sender.id]?.userInfo
                        ?.profilePictureUrl &&
                      typeof senderDetails[message.sender.id]?.userInfo
                        ?.profilePictureUrl === "string" &&
                      senderDetails[
                        message.sender.id
                      ]?.userInfo?.profilePictureUrl?.trim() !== "" ? (
                        <Image
                          src={
                            senderDetails[message.sender.id]?.userInfo
                              ?.profilePictureUrl ||
                            "/images/default-avatar.png"
                          }
                          alt={
                            senderDetails[message.sender.id]?.userInfo
                              ?.fullName || "Người dùng"
                          }
                          width={40}
                          height={40}
                          className="object-cover"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center text-white">
                          <span>
                            {(
                              senderDetails[message.sender.id]?.userInfo
                                ?.fullName || "Người dùng"
                            ).charAt(0)}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <div className="flex flex-col">
                        <div className="flex justify-between items-start">
                          <div className="text-sm font-medium">
                            {senderDetails[message.sender.id]?.userInfo
                              ?.fullName || "Người dùng"}
                          </div>
                          <div className="text-xs text-gray-500 ml-2 flex-shrink-0">
                            {timeDisplay}
                          </div>
                        </div>
                        <div className="text-sm text-gray-700 truncate">
                          {startIndex >= 0 ? (
                            <span>
                              <span className="font-medium">
                                {senderDetails[message.sender.id]?.userInfo
                                  ?.fullName || "Người dùng"}
                                :{" "}
                              </span>
                              {beforeText}
                              <span className="text-blue-500 font-medium">
                                {highlightedText}
                              </span>
                              {afterText}
                            </span>
                          ) : (
                            <span>
                              <span className="font-medium">
                                {senderDetails[message.sender.id]?.userInfo
                                  ?.fullName || "Người dùng"}
                                :{" "}
                              </span>
                              {content}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {isLoadingFriends ? (
            <div className="p-4 text-center">
              <div className="animate-spin h-6 w-6 border-2 border-blue-500 rounded-full border-t-transparent mx-auto mb-2"></div>
              <p className="text-sm text-gray-500">
                Đang tải danh sách bạn bè...
              </p>
            </div>
          ) : (
            filteredFriends.length > 0 && (
              <div className="p-2 border-b border-gray-100">
                <div className="flex justify-between items-center">
                  <div className="text-sm font-medium">
                    Bạn bè ({filteredFriends.length})
                  </div>
                  <div className="flex items-center">
                    <button className="text-xs text-blue-500 hover:underline mr-1">
                      Tất cả
                    </button>
                    <MoreHorizontal className="h-4 w-4 text-gray-400" />
                  </div>
                </div>
              </div>
            )
          )}

          {filteredFriends.length > 0 && (
            <div className="max-h-[400px] overflow-y-auto no-scrollbar">
              <div className="px-3 py-2 border-b border-gray-100">
                <div className="text-xs text-gray-500">Tên (A-Z)</div>
              </div>

              {/* Alphabetical sections */}
              {Object.keys(friendsByLetter)
                .sort()
                .map((letter) => (
                  <div key={letter}>
                    {/* Letter header */}
                    <div className="px-3 py-1 bg-gray-50 text-xs font-medium text-gray-500">
                      {letter}
                    </div>

                    {/* Friends list */}
                    {friendsByLetter[letter].map((friend) => (
                      <div
                        key={friend.id}
                        className="flex items-center justify-between py-2 hover:bg-gray-50 cursor-pointer px-3"
                        onClick={() =>
                          handleUserClick({
                            id: friend.id,
                            fullName: friend.fullName,
                            profilePictureUrl: friend.profilePictureUrl,
                            phoneNumber: friend.phoneNumber || "", // Sử dụng số điện thoại từ friend nếu có
                            email: friend.email || "", // Sử dụng email từ friend nếu có
                          })
                        }
                      >
                        <div className="flex items-center">
                          <div className="h-8 w-8 rounded-full overflow-hidden mr-2">
                            <Image
                              src={
                                friend.profilePictureUrl &&
                                typeof friend.profilePictureUrl === "string" &&
                                friend.profilePictureUrl?.trim() !== ""
                                  ? friend.profilePictureUrl
                                  : "/images/default-avatar.png"
                              }
                              alt={friend.fullName}
                              width={32}
                              height={32}
                              className="object-cover"
                            />
                          </div>
                          <span className="text-sm">{friend.fullName}</span>
                        </div>
                        <button
                          className="h-6 w-6 rounded-full hover:bg-gray-200 flex items-center justify-center"
                          onClick={(e) => {
                            e.stopPropagation();
                            // Thêm xử lý menu nếu cần
                          }}
                        >
                          <MoreHorizontal className="h-4 w-4 text-gray-400" />
                        </button>
                      </div>
                    ))}
                  </div>
                ))}
            </div>
          )}

          {/* No results message - only show when no messages and no friends match */}
          {searchQuery &&
            filteredMessages.length === 0 &&
            filteredFriends.length === 0 && (
              <div className="p-4 text-center">
                <div className="flex justify-center mb-4">
                  <div className="relative w-24 h-24">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-16 h-16 rounded-full border-2 border-blue-200 flex items-center justify-center">
                        <Search className="h-8 w-8 text-blue-300" />
                      </div>
                    </div>
                  </div>
                </div>
                <p className="text-gray-500 text-sm">Không tìm thấy kết quả</p>
                <p className="text-gray-500 text-xs mt-1">
                  Vui lòng thử lại với từ khóa khác.
                </p>
              </div>
            )}
        </div>
      )}
    </div>
  );
}
