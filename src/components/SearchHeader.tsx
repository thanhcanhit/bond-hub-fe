"use client";
import { Search, UserPlus, Users, X, File } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { useDebounce } from "@/hooks/useDebounce";

type SearchCategory = "all" | "contacts" | "messages" | "files";

type ContactResult = {
  id: string;
  fullName: string;
  phoneNumber?: string;
  profilePictureUrl: string;
};

type MessageResult = {
  id: string;
  content: string;
  sender: {
    id: string;
    fullName: string;
    profilePictureUrl: string;
  };
  timestamp: string;
};

type FileResult = {
  id: string;
  name: string;
  type: string;
  size: string;
  uploadedBy: string;
  timestamp: string;
};

type SearchResult = {
  contacts: ContactResult[];
  messages: MessageResult[];
  files: FileResult[];
};

// Mock data for recent searches
const recentSearches = [
  { id: "1", text: "Nhắc bạn" },
  { id: "2", text: "Biểu cảm" },
];

// Mock data for search results
const mockContacts: ContactResult[] = [
  {
    id: "1",
    fullName: "Mẹ",
    phoneNumber: "0933660560",
    profilePictureUrl: "https://i.pravatar.cc/150?img=1",
  },
];

export default function SearchHeader() {
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [activeCategory, setActiveCategory] = useState<SearchCategory>("all");
  const [showResults, setShowResults] = useState<boolean>(false);
  const [searchResults, setSearchResults] = useState<SearchResult>({
    contacts: [],
    messages: [],
    files: [],
  });
  const searchRef = useRef<HTMLDivElement>(null);
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // Handle click outside to close search results
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        searchRef.current &&
        !searchRef.current.contains(event.target as Node)
      ) {
        setShowResults(false);
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
      // In a real app, this would be an API call
      // For now, we'll just filter the mock data
      const filteredContacts = mockContacts.filter(
        (contact) =>
          contact.fullName
            .toLowerCase()
            .includes(debouncedSearchQuery.toLowerCase()) ||
          (contact.phoneNumber &&
            contact.phoneNumber.includes(debouncedSearchQuery)),
      );

      setSearchResults({
        contacts: filteredContacts,
        messages: [], // Would be populated from API
        files: [], // Would be populated from API
      });
    } else {
      setSearchResults({
        contacts: [],
        messages: [],
        files: [],
      });
    }
  }, [debouncedSearchQuery]);

  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setShowResults(true);
  };

  // Clear search
  const clearSearch = () => {
    setSearchQuery("");
    setShowResults(false);
  };

  // Handle category change
  const handleCategoryChange = (category: SearchCategory) => {
    setActiveCategory(category);
  };

  // Check if there are any results
  const hasResults =
    searchResults.contacts.length > 0 ||
    searchResults.messages.length > 0 ||
    searchResults.files.length > 0;

  // Get results based on active category
  const getFilteredResults = () => {
    switch (activeCategory) {
      case "contacts":
        return { ...searchResults, messages: [], files: [] };
      case "messages":
        return { ...searchResults, contacts: [], files: [] };
      case "files":
        return { ...searchResults, contacts: [], messages: [] };
      default:
        return searchResults;
    }
  };

  const filteredResults = getFilteredResults();

  return (
    <div
      className="w-[300px] p-4 flex items-center justify-between border-r bg-white"
      ref={searchRef}
    >
      <div className="relative w-[200px]">
        <div className="flex items-center border border-gray-200 rounded-md px-2 h-8 w-full">
          <Search className="h-4 w-4 text-gray-500" />
          <input
            placeholder="Tìm kiếm"
            className="border-0 h-8 bg-transparent outline-none w-full placeholder:text-[0.8125rem] ml-2 py-0"
            value={searchQuery}
            onChange={handleSearchChange}
            onFocus={() => setShowResults(true)}
          />
          {searchQuery && (
            <button onClick={clearSearch} className="flex-shrink-0">
              <X className="h-4 w-4 text-gray-500" />
            </button>
          )}
        </div>

        {/* Search Results Dropdown */}
        {showResults && (
          <div className="absolute left-0 top-full mt-1 w-[300px] bg-white border border-gray-200 shadow-lg z-50 overflow-hidden">
            {/* Category Tabs */}
            {searchQuery && (
              <div className="flex border-b border-gray-200">
                <button
                  className={`flex-1 py-2 text-xs font-medium ${activeCategory === "all" ? "text-blue-500 border-b-2 border-blue-500" : "text-gray-500"}`}
                  onClick={() => handleCategoryChange("all")}
                >
                  Tất cả
                </button>
                <button
                  className={`flex-1 py-2 text-xs font-medium ${activeCategory === "contacts" ? "text-blue-500 border-b-2 border-blue-500" : "text-gray-500"}`}
                  onClick={() => handleCategoryChange("contacts")}
                >
                  Liên hệ
                </button>
                <button
                  className={`flex-1 py-2 text-xs font-medium ${activeCategory === "messages" ? "text-blue-500 border-b-2 border-blue-500" : "text-gray-500"}`}
                  onClick={() => handleCategoryChange("messages")}
                >
                  Tin nhắn
                </button>
                <button
                  className={`flex-1 py-2 text-xs font-medium ${activeCategory === "files" ? "text-blue-500 border-b-2 border-blue-500" : "text-gray-500"}`}
                  onClick={() => handleCategoryChange("files")}
                >
                  File
                </button>
              </div>
            )}

            <div className="max-h-[400px] overflow-y-auto no-scrollbar">
              {/* Recent Searches */}
              {!searchQuery && (
                <div>
                  <div className="px-3 py-2 border-b border-gray-100">
                    <h3 className="text-sm font-medium">Tìm gần đây</h3>
                  </div>
                  <div>
                    {recentSearches.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center py-2 hover:bg-gray-50 cursor-pointer px-3"
                      >
                        <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center mr-2">
                          <Search className="h-4 w-4 text-gray-500" />
                        </div>
                        <span className="text-sm">{item.text}</span>
                      </div>
                    ))}
                    <div className="px-3 py-2 border-t border-gray-100">
                      <p className="text-sm text-gray-500">
                        Không có tìm kiếm nào gần đây
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Search Results */}
              {searchQuery && (
                <div>
                  {/* No Results */}
                  {!hasResults && (
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
                      <p className="text-gray-500 text-sm">
                        Không tìm thấy kết quả
                      </p>
                      <p className="text-gray-500 text-xs mt-1">
                        Vui lòng thử lại từ khóa khác hoặc sử dụng ứng dụng Zalo
                        trên điện thoại để tìm tin nhắn trước ngày 11/04/2025.
                      </p>
                    </div>
                  )}

                  {/* Contact Results */}
                  {filteredResults.contacts.length > 0 && (
                    <div>
                      {activeCategory === "all" && (
                        <div className="px-3 py-2 border-b border-gray-100">
                          <h3 className="text-sm font-medium">
                            Tìm bạn qua số điện thoại
                          </h3>
                        </div>
                      )}
                      {filteredResults.contacts.map((contact) => (
                        <div
                          key={contact.id}
                          className="flex items-center py-2 hover:bg-gray-50 cursor-pointer px-3"
                        >
                          <div className="h-8 w-8 rounded-full overflow-hidden mr-2">
                            <Image
                              src={contact.profilePictureUrl}
                              alt={contact.fullName}
                              width={32}
                              height={32}
                              className="object-cover"
                            />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-sm font-medium">
                              {contact.fullName}
                            </span>
                            {contact.phoneNumber && (
                              <span className="text-xs text-gray-500">
                                Số điện thoại: {contact.phoneNumber}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                      <div className="px-3 py-2 text-xs text-gray-500 border-t border-gray-100">
                        <p>
                          Sử dụng ứng dụng Zalo trên điện thoại để tìm tin nhắn
                          trước ngày 11/04/2025.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Message Results */}
                  {filteredResults.messages.length > 0 && (
                    <div>
                      {activeCategory === "all" && (
                        <div className="px-3 py-2 border-b border-gray-100">
                          <h3 className="text-sm font-medium">Tin nhắn</h3>
                        </div>
                      )}
                      {filteredResults.messages.map((message) => (
                        <div
                          key={message.id}
                          className="flex items-center py-2 hover:bg-gray-50 cursor-pointer px-3"
                        >
                          <div className="h-8 w-8 rounded-full overflow-hidden mr-2">
                            <Image
                              src={message.sender.profilePictureUrl}
                              alt={message.sender.fullName}
                              width={32}
                              height={32}
                              className="object-cover"
                            />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-sm font-medium">
                              {message.sender.fullName}
                            </span>
                            <span className="text-xs text-gray-500 truncate max-w-[200px]">
                              {message.content}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* File Results */}
                  {filteredResults.files.length > 0 && (
                    <div>
                      {activeCategory === "all" && (
                        <div className="px-3 py-2 border-b border-gray-100">
                          <h3 className="text-sm font-medium">File</h3>
                        </div>
                      )}
                      {filteredResults.files.map((file) => (
                        <div
                          key={file.id}
                          className="flex items-center py-2 hover:bg-gray-50 cursor-pointer px-3"
                        >
                          <div className="h-8 w-8 bg-gray-100 flex items-center justify-center rounded-md mr-2">
                            <File className="h-4 w-4 text-gray-500" />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-sm font-medium">
                              {file.name}
                            </span>
                            <span className="text-xs text-gray-500">
                              {file.size} • {file.timestamp}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
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
    </div>
  );
}
