"use server";

import { User } from "@/types/base";
import { getUserDataById } from "./user.action";

/**
 * Fetch user by ID - server action wrapper
 * @param userId User ID to fetch
 * @param token Optional access token to use for the request
 * @returns User object or null
 */
export async function fetchUserById(
  userId: string,
  token?: string,
): Promise<User | null> {
  try {
    console.log(
      `Fetching user by ID: ${userId} with token: ${token ? "provided" : "not provided"}`,
    );

    // Create a custom axios instance with the token if provided
    let result;

    if (token) {
      // If token is provided, use it to create a custom axios instance
      const customAxiosInstance = {
        get: async (url: string) => {
          const apiUrl =
            process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
          const fullUrl = `${apiUrl}/api/v1${url}`;

          console.log(`Making authenticated request to: ${fullUrl}`);

          const response = await fetch(fullUrl, {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          });

          if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
          }

          return { data: await response.json() };
        },
      };

      // Use a modified version of getUserDataById that accepts a custom axios instance
      result = await getUserDataByIdWithCustomAxios(
        userId,
        customAxiosInstance,
      );
    } else {
      // Use the standard getUserDataById function
      result = await getUserDataById(userId);
    }

    if (result.success && result.user) {
      return result.user;
    }

    // If user not found, create a placeholder user
    console.log(`Creating placeholder user for ID ${userId}`);
    return {
      id: userId,
      email: null,
      phoneNumber: null,
      passwordHash: "",
      createdAt: new Date(),
      updatedAt: new Date(),
      userInfo: {
        id: userId,
        fullName: "Người dùng không xác định",
        profilePictureUrl: null,
        statusMessage: "",
        blockStrangers: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        userAuth: null as unknown as User,
      },
      refreshTokens: [],
      qrCodes: [],
      posts: [],
      stories: [],
      groupMembers: [],
      cloudFiles: [],
      pinnedItems: [],
      sentFriends: [],
      receivedFriends: [],
      contacts: [],
      contactOf: [],
      settings: [],
      postReactions: [],
      hiddenPosts: [],
      addedBy: [],
      notifications: [],
      sentMessages: [],
      receivedMessages: [],
      comments: [],
    };
  } catch (error) {
    console.error("Error fetching user by ID:", error);

    // Return a placeholder user instead of null
    return {
      id: userId,
      email: null,
      phoneNumber: null,
      passwordHash: "",
      createdAt: new Date(),
      updatedAt: new Date(),
      userInfo: {
        id: userId,
        fullName: "Người dùng không xác định",
        profilePictureUrl: null,
        statusMessage: "",
        blockStrangers: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        userAuth: null as unknown as User,
      },
      refreshTokens: [],
      qrCodes: [],
      posts: [],
      stories: [],
      groupMembers: [],
      cloudFiles: [],
      pinnedItems: [],
      sentFriends: [],
      receivedFriends: [],
      contacts: [],
      contactOf: [],
      settings: [],
      postReactions: [],
      hiddenPosts: [],
      addedBy: [],
      notifications: [],
      sentMessages: [],
      receivedMessages: [],
      comments: [],
    };
  }
}

/**
 * Helper function to get user data with a custom axios instance
 */
async function getUserDataByIdWithCustomAxios(
  userId: string,
  axiosInstance: any,
) {
  try {
    // Kiểm tra id hợp lệ
    if (!userId || typeof userId !== "string" || userId.trim() === "") {
      console.error("Invalid user ID provided:", userId);
      return {
        success: false,
        error: "Invalid user ID",
      };
    }

    console.log(`Fetching user data for ID: ${userId} with custom axios`);
    const response = await axiosInstance.get(`/users/${userId}`);
    const user: User = response.data;

    return { success: true, user };
  } catch (error) {
    console.error(
      `Get user by ID failed for ID ${userId} with custom axios:`,
      error,
    );
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
