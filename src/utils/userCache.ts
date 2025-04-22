import { User } from "@/types/base";

// Create a cache for user data to avoid redundant API calls
const userDataCache: Record<string, { user: User; timestamp: number }> = {};

// Cache expiration time in milliseconds (5 minutes)
const CACHE_EXPIRATION = 5 * 60 * 1000;

// Function to check if cached data is still valid
export function isCacheValid(userId: string): boolean {
  if (!userDataCache[userId]) return false;

  const now = Date.now();
  const cacheTime = userDataCache[userId].timestamp;

  return now - cacheTime < CACHE_EXPIRATION;
}

// Function to get user data from cache
export function getCachedUserData(userId: string): User | null {
  if (isCacheValid(userId)) {
    return userDataCache[userId].user;
  }
  return null;
}

// Function to store user data in cache
export function cacheUserData(userId: string, user: User): void {
  userDataCache[userId] = {
    user,
    timestamp: Date.now(),
  };
}

// Function to remove user data from cache
export function removeCachedUserData(userId: string): void {
  if (userDataCache[userId]) {
    delete userDataCache[userId];
  }
}

// Function to clear the entire cache
export function clearUserCache(): void {
  Object.keys(userDataCache).forEach((key) => {
    delete userDataCache[key];
  });
}
