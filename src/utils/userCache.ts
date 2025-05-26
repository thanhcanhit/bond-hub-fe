import { User, UserInfo } from "@/types/base";

// Create a cache for user data to avoid redundant API calls
const userDataCache: Record<string, { user: User; timestamp: number }> = {};
const userInfoCache: Record<string, { userInfo: UserInfo; timestamp: number }> =
  {};

// Cache expiration time in milliseconds (10 minutes for better performance)
const CACHE_EXPIRATION = 10 * 60 * 1000;

// Function to check if cached data is still valid
export function isCacheValid(userId: string): boolean {
  if (!userDataCache[userId]) return false;

  const now = Date.now();
  const cacheTime = userDataCache[userId].timestamp;

  return now - cacheTime < CACHE_EXPIRATION;
}

// Function to check if cached userInfo is still valid
export function isUserInfoCacheValid(userId: string): boolean {
  if (!userInfoCache[userId]) return false;

  const now = Date.now();
  const cacheTime = userInfoCache[userId].timestamp;

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

  return null;
}

// Function to get userInfo from cache
export function getCachedUserInfo(
  userId: string,
  allowExpired: boolean = true, // Allow expired for better UX
): UserInfo | null {
  if (allowExpired && userInfoCache[userId]) {
    return userInfoCache[userId].userInfo;
  }

  if (isUserInfoCacheValid(userId)) {
    return userInfoCache[userId].userInfo;
  }

  return null;
}

// Function to store user data in cache
export function cacheUserData(userId: string, user: User): void {
  userDataCache[userId] = {
    user,
    timestamp: Date.now(),
  };

  // Also cache userInfo if available
  if (user.userInfo) {
    cacheUserInfo(userId, user.userInfo);
  }
}

// Function to store userInfo in cache
export function cacheUserInfo(userId: string, userInfo: UserInfo): void {
  userInfoCache[userId] = {
    userInfo,
    timestamp: Date.now(),
  };
}

// Function to remove user data from cache
export function removeCachedUserData(userId: string): void {
  if (userDataCache[userId]) {
    delete userDataCache[userId];
  }
  if (userInfoCache[userId]) {
    delete userInfoCache[userId];
  }
}

// Function to cache user info from group members
export function cacheUserInfoFromGroupMembers(
  memberUsers: Array<{
    id: string;
    fullName: string;
    profilePictureUrl?: string | null;
  }>,
): void {
  memberUsers.forEach((member) => {
    if (member.id && member.fullName) {
      cacheUserInfo(member.id, {
        id: member.id,
        fullName: member.fullName,
        profilePictureUrl: member.profilePictureUrl || null,
        statusMessage: "",
        blockStrangers: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        userAuth: { id: member.id } as User,
      });
    }
  });
}

// Function to clear the entire cache
export function clearUserCache(): void {
  Object.keys(userDataCache).forEach((key) => {
    delete userDataCache[key];
  });
}
