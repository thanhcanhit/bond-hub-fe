"use client";

import { useAuthStore } from "@/stores/authStore";

/**
 * Get the authentication token from the auth store
 * @returns The access token or null if not available
 */
export function getAuthToken(): string | null {
  try {
    // For client components
    return useAuthStore.getState().accessToken;
  } catch (error) {
    console.error("Error getting auth token from store:", error);

    // No fallback for server components in this implementation
    return null;
  }
}

/**
 * Get the refresh token from the auth store
 * @returns The refresh token or null if not available
 */
export function getRefreshToken(): string | null {
  try {
    return useAuthStore.getState().refreshToken;
  } catch (error) {
    console.error("Error getting refresh token:", error);

    // No fallback for server components in this implementation
    return null;
  }
}

/**
 * Get the device ID from the auth store
 * @returns The device ID or null if not available
 */
export function getDeviceId(): string | null {
  try {
    return useAuthStore.getState().deviceId;
  } catch (error) {
    console.error("Error getting device ID:", error);

    // No fallback for server components in this implementation
    return null;
  }
}
