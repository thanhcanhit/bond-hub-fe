"use client";
import { useMemo, useState, memo, useCallback } from "react";
import ContactItem from "./ContactItem";

type Friend = {
  id: string;
  fullName: string;
  profilePictureUrl: string;
  status: string;
};

type FriendsByLetter = {
  [key: string]: Friend[];
};

type ContactListProps = {
  friends: Friend[];
  title: string;
};

function ContactList({ friends, title }: ContactListProps) {
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
      if (sortOption === "name") {
        return a.fullName.localeCompare(b.fullName);
      } else if (sortOption === "status") {
        return a.status === "online" && b.status !== "online"
          ? -1
          : a.status !== "online" && b.status === "online"
            ? 1
            : a.fullName.localeCompare(b.fullName);
      }
      return 0;
    });
  }, [friends, searchQuery, sortOption]);

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
    <div className="flex-1 flex flex-col h-full">
      <div className="p-4 border-b bg-white flex items-center justify-end">
        <div className="flex items-center space-x-4">
          <select
            className="border rounded p-1 text-sm bg-white"
            value={sortOption}
            onChange={handleSortChange}
          >
            <option value="name">Name (A-Z)</option>
            <option value="status">Status</option>
          </select>
          <div className="flex items-center space-x-2">
            <span className="text-sm">All</span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 bg-white">
        <div className="relative w-full mb-4">
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
            placeholder="Search friends"
            className="w-full h-8 bg-gray-100 border border-gray-200 rounded-md pl-8 outline-none"
            value={searchQuery}
            onChange={handleSearchChange}
          />
        </div>

        {Object.keys(friendsByLetter)
          .sort()
          .map((letter) => (
            <div key={letter} className="mb-6">
              <div className="text-lg font-semibold mb-2 text-gray-700">
                {letter}
              </div>
              {friendsByLetter[letter].map((friend) => (
                <ContactItem
                  key={friend.id}
                  id={friend.id}
                  fullName={friend.fullName}
                  profilePictureUrl={friend.profilePictureUrl}
                  status={friend.status}
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
