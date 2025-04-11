"use client";
import { useMemo, useState, memo, useCallback } from "react";
import ContactItem from "./ContactItem";

type Friend = {
  id: string;
  fullName: string;
  profilePictureUrl: string;
};

type FriendsByLetter = {
  [key: string]: Friend[];
};

type ContactListProps = {
  friends: Friend[];
};

function ContactList({ friends }: ContactListProps) {
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sortOption, setSortOption] = useState<string>("name");

  // Memoize the search input handler
  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearchQuery(e.target.value);
    },
    [],
  );

  // Memoize the sort option handler
  const handleSortChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setSortOption(e.target.value);
    },
    [],
  );

  // Filter and sort friends
  const filteredAndSortedFriends = useMemo(() => {
    // Filter by search query
    const filtered = searchQuery
      ? friends.filter((friend) =>
          friend.fullName.toLowerCase().includes(searchQuery.toLowerCase()),
        )
      : friends;

    // Sort by selected option
    return [...filtered].sort((a, b) => {
      // Always sort by name since we removed status
      return a.fullName.localeCompare(b.fullName);
    });
  }, [friends, searchQuery]);

  // Group friends by first letter
  const friendsByLetter = useMemo(() => {
    const result: FriendsByLetter = {};
    filteredAndSortedFriends.forEach((friend) => {
      const firstLetter = friend.fullName.charAt(0).toUpperCase();
      if (!result[firstLetter]) {
        result[firstLetter] = [];
      }
      result[firstLetter].push(friend);
    });
    return result;
  }, [filteredAndSortedFriends]);

  return (
    <div className="h-full w-full bg-white rounded-md shadow-sm overflow-hidden flex flex-col no-scrollbar">
      <div className="p-4 flex items-center justify-between">
        <div className="relative w-full">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500"
          >
            <circle cx="11" cy="11" r="8"></circle>
            <path d="m21 21-4.3-4.3"></path>
          </svg>
          <input
            type="text"
            placeholder="Tìm bạn"
            className="w-full h-8 bg-white border border-gray-200/50 rounded-md pl-8 outline-none text-sm focus:border-blue-300/50 transition-colors"
            value={searchQuery}
            onChange={handleSearchChange}
          />
        </div>

        <div className="flex items-center ml-4 space-x-2">
          <div className="relative">
            <select
              className="appearance-none bg-white border border-gray-200 rounded-md px-3 py-1 pr-8 text-sm cursor-pointer outline-none"
              value={sortOption}
              onChange={handleSortChange}
            >
              <option value="name">Tên (A-Z)</option>
              <option value="status">Trạng thái</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
              <svg
                className="fill-current h-4 w-4"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
              >
                <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
              </svg>
            </div>
          </div>

          <div className="relative">
            <select className="appearance-none bg-white border border-gray-200 rounded-md px-3 py-1 pr-8 text-sm cursor-pointer outline-none">
              <option>Tất cả</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
              <svg
                className="fill-current h-4 w-4"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
              >
                <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 no-scrollbar">
        {Object.keys(friendsByLetter)
          .sort()
          .map((letter) => (
            <div key={letter} className="mb-6">
              <div className="text-base font-semibold mb-2 text-gray-700">
                {letter}
              </div>
              {friendsByLetter[letter].map((friend) => (
                <ContactItem
                  key={friend.id}
                  id={friend.id}
                  fullName={friend.fullName}
                  profilePictureUrl={friend.profilePictureUrl}
                />
              ))}
            </div>
          ))}
      </div>
    </div>
  );
}

// Export memoized component to prevent unnecessary re-renders
export default memo(ContactList);
