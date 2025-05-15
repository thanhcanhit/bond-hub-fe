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
export function getCachedUserData(
  userId: string,
  allowExpired: boolean = false,
): User | null {
  // If we allow expired data, just check if it exists
  if (allowExpired && userDataCache[userId]) {
    console.log(`[USER_CACHE] Returning expired cache data for user ${userId}`);
    return userDataCache[userId].user;
  }

  // Otherwise check if it's valid
  if (isCacheValid(userId)) {
    console.log(`[USER_CACHE] Returning valid cache data for user ${userId}`);
    return userDataCache[userId].user;
  }

  // If we get here, either the data doesn't exist or it's expired and we don't allow expired
  if (userDataCache[userId]) {
    console.log(
      `[USER_CACHE] Cache data for user ${userId} exists but is expired`,
    );
  } else {
    console.log(`[USER_CACHE] No cache data exists for user ${userId}`);
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
