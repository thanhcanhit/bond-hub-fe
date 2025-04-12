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
import { useDebounce } from "@/hooks/useDebounce";
import { searchUser } from "@/actions/user.action";
import { searchMessages } from "@/actions/message.action";
import { getFriendsList } from "@/actions/friend.action";
import { isEmail, isPhoneNumber } from "@/utils/helpers";
import { useAuthStore } from "@/stores/authStore";

type Friend = {
  id: string;
  fullName: string;
  profilePictureUrl: string;
};

// Danh sách bạn bè sẽ được lấy từ API

// Type for messages
type Message = {
  id: string;
  sender: {
    id: string;
    fullName: string;
    profilePictureUrl: string;
  };
  content: string;
  date: string;
  highlighted?: boolean;
};

type UserSearchResult = {
  id: string;
  fullName: string;
  profilePictureUrl: string;
  phoneNumber: string;
  email?: string;
};

export default function SearchHeader() {
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [showResults, setShowResults] = useState<boolean>(false);
  const [showSuggestions, setShowSuggestions] = useState<boolean>(false);
  const [isSearchActive, setIsSearchActive] = useState<boolean>(false);
  const [filteredFriends, setFilteredFriends] = useState<Friend[]>([]);
  const [allFriends, setAllFriends] = useState<Friend[]>([]);
  const [filteredMessages, setFilteredMessages] = useState<Message[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [phoneSearchResult, setPhoneSearchResult] =
    useState<UserSearchResult | null>(null);
  const [isSearchingUser, setIsSearchingUser] = useState<boolean>(false);
  const [isLoadingFriends, setIsLoadingFriends] = useState<boolean>(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const { accessToken } = useAuthStore();

  // Lấy danh sách bạn bè khi component mount
  useEffect(() => {
    const fetchFriends = async () => {
      try {
        setIsLoadingFriends(true);
        const result = await getFriendsList(accessToken || undefined);
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
  }, [accessToken]);

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
      try {
        const result = await searchMessages(debouncedSearchQuery);
        if (result.success) {
          // Đánh dấu các tin nhắn có chứa từ khóa tìm kiếm
          const messages = result.messages.map((message: Message) => ({
            ...message,
            highlighted: true,
          }));
          setFilteredMessages(messages);
        } else {
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
                "https://i.pravatar.cc/150",
              phoneNumber: userData.phoneNumber || debouncedSearchQuery, // Nếu tìm bằng email, có thể không có phoneNumber
            });
          } else {
            setPhoneSearchResult(null);
          }
        } catch (error) {
          console.error("Error searching user:", error);
          setPhoneSearchResult(null);
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
  }, [debouncedSearchQuery, allFriends]);

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
    setIsSearchActive(false);
    setShowResults(false);
    setShowSuggestions(false);
    setSearchQuery("");
    // Dispatch a custom event to notify other components
    const event = new CustomEvent("searchActivated", {
      detail: { active: false },
    });
    document.dispatchEvent(event);
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
    <div className="w-[300px] p-4 relative border-r bg-white" ref={searchRef}>
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
                title="Lời mời kết bạn"
              >
                <UserPlus className="h-5 w-5" />
              </button>
              <button
                className="h-8 w-8 rounded-full hover:bg-gray-100 flex items-center justify-center"
                title="Tạo nhóm"
              >
                <Users className="h-5 w-5" />
              </button>
            </div>
          </>
        ) : (
          // Active search state - Full width input with close button
          <>
            <div className="relative flex-1 mr-2">
              <div className="flex items-center border border-gray-200 rounded-md px-2 h-8 w-full">
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
              className="h-8 w-8 rounded-full hover:bg-gray-100 flex items-center justify-center"
              title="Đóng"
            >
              <X className="h-5 w-5" />
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

      {/* Search Results Dropdown */}
      {isSearchActive && showResults && searchQuery && (
        <div className="absolute left-0 top-[60px] w-full bg-white border-t border-gray-200 shadow-lg z-50 overflow-hidden">
          {/* User search section */}
          {isSearchingUser && (
            <div className="border-b border-gray-100">
              <div className="p-3">
                <div className="text-sm font-medium mb-2">
                  Tìm bạn qua{" "}
                  {isEmail(debouncedSearchQuery) ? "email" : "số điện thoại"}:
                </div>

                {phoneSearchResult ? (
                  <div className="flex items-center py-2 px-1">
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
            <div className="p-3 border-b border-gray-100">
              <div className="text-sm font-medium mb-2">
                Tin nhắn ({filteredMessages.length})
              </div>

              {filteredMessages.map((message) => {
                // Tách nội dung tin nhắn để đánh dấu từ khóa tìm kiếm
                const content = message.content;
                const lowerContent = content.toLowerCase();
                const lowerQuery = debouncedSearchQuery.toLowerCase();
                const startIndex = lowerContent.indexOf(lowerQuery);

                const beforeText = content.substring(0, startIndex);
                const highlightedText = content.substring(
                  startIndex,
                  startIndex + debouncedSearchQuery.length,
                );
                const afterText = content.substring(
                  startIndex + debouncedSearchQuery.length,
                );

                return (
                  <div
                    key={message.id}
                    className="flex items-center py-2 hover:bg-gray-50 cursor-pointer px-1 rounded-md"
                  >
                    {message.sender.profilePictureUrl ? (
                      <div className="h-10 w-10 rounded-full overflow-hidden mr-3">
                        <Image
                          src={message.sender.profilePictureUrl}
                          alt={message.sender.fullName}
                          width={40}
                          height={40}
                          className="object-cover"
                        />
                      </div>
                    ) : (
                      <div className="h-10 w-10 rounded-full overflow-hidden mr-3 bg-blue-500 flex items-center justify-center text-white">
                        <span>{message.sender.fullName.charAt(0)}</span>
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="text-sm font-medium">
                        {message.sender.fullName}
                      </div>
                      <div className="text-xs text-gray-500 flex items-center flex-wrap">
                        <span>{beforeText}</span>
                        <span className="text-blue-500">{highlightedText}</span>
                        <span>{afterText}</span>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500">{message.date}</div>
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
                      >
                        <div className="flex items-center">
                          <div className="h-8 w-8 rounded-full overflow-hidden mr-2">
                            <Image
                              src={friend.profilePictureUrl}
                              alt={friend.fullName}
                              width={32}
                              height={32}
                              className="object-cover"
                            />
                          </div>
                          <span className="text-sm">{friend.fullName}</span>
                        </div>
                        <button className="h-6 w-6 rounded-full hover:bg-gray-200 flex items-center justify-center">
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
