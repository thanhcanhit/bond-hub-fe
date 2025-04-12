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

type Friend = {
  id: string;
  fullName: string;
  profilePictureUrl: string;
};

// Mock data for friends
const mockFriends: Friend[] = [
  {
    id: "1",
    fullName: "Trần Đình Kiên",
    profilePictureUrl: "https://i.pravatar.cc/150?img=1",
  },
  {
    id: "2",
    fullName: "Trần Thị B",
    profilePictureUrl: "https://i.pravatar.cc/150?img=2",
  },
];

export default function SearchHeader() {
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [showResults, setShowResults] = useState<boolean>(false);
  const [showSuggestions, setShowSuggestions] = useState<boolean>(false);
  const [isSearchActive, setIsSearchActive] = useState<boolean>(false);
  const [filteredFriends, setFilteredFriends] = useState<Friend[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const searchRef = useRef<HTMLDivElement>(null);
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

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
    if (debouncedSearchQuery) {
      // Filter friends based on search query
      const filtered = mockFriends.filter((friend) =>
        friend.fullName
          .toLowerCase()
          .includes(debouncedSearchQuery.toLowerCase()),
      );
      setFilteredFriends(filtered);
    } else {
      setFilteredFriends([]);
    }
  }, [debouncedSearchQuery]);

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

    const friendsToGroup = searchQuery ? filteredFriends : mockFriends;

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
                <div className="border-0 h-8 bg-transparent outline-none w-full text-[0.8125rem] ml-2 py-0 text-gray-400 flex items-center">
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
                  className="border-0 h-8 bg-transparent outline-none w-full placeholder:text-[0.8125rem] ml-2 py-0"
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
          <div className="flex justify-between items-center p-2 border-b border-gray-100">
            <div className="text-sm font-medium">
              Bạn bè ({mockFriends.length})
            </div>
            <div className="flex items-center">
              <div className="flex items-center border border-gray-200 rounded-md px-2 h-8 bg-gray-50">
                <Search className="h-4 w-4 text-gray-500" />
                <input
                  placeholder="Tìm bạn"
                  className="border-0 h-8 bg-transparent outline-none w-[150px] placeholder:text-[0.8125rem] ml-2 py-0"
                  value={searchQuery}
                  onChange={handleSearchChange}
                  autoFocus
                />
                {searchQuery && (
                  <button onClick={clearSearch} className="flex-shrink-0">
                    <X className="h-4 w-4 text-gray-500" />
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="max-h-[400px] overflow-y-auto no-scrollbar">
            <div className="flex justify-between items-center px-3 py-2 border-b border-gray-100">
              <div className="text-xs text-gray-500">Tên (A-Z)</div>
              <div className="flex items-center">
                <button className="text-xs text-blue-500 hover:underline mr-1">
                  Tất cả
                </button>
                <MoreHorizontal className="h-4 w-4 text-gray-400" />
              </div>
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

            {/* No results message */}
            {searchQuery && Object.keys(friendsByLetter).length === 0 && (
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
        </div>
      )}
    </div>
  );
}
