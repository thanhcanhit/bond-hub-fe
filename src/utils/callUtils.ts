"use client";

/**
 * Initiate a call to a user
 * @param userId ID of the user to call
 * @param type Type of call (AUDIO or VIDEO)
 */
export function callUser(userId: string, type: "AUDIO" | "VIDEO") {
  if (typeof window === "undefined") return;

  // Call the global function exposed by CallManager
  if (typeof (window as any).initiateUserCall === "function") {
    (window as any).initiateUserCall(userId, type);
  } else {
    console.error(
      "initiateUserCall function not available. Make sure CallManager is loaded.",
    );
  }
}

/**
 * Initiate a call to a group
 * @param groupId ID of the group to call
 * @param type Type of call (AUDIO or VIDEO)
 */
export function callGroup(groupId: string, type: "AUDIO" | "VIDEO") {
  if (typeof window === "undefined") return;

  // Call the global function exposed by CallManager
  if (typeof (window as any).initiateGroupCall === "function") {
    (window as any).initiateGroupCall(groupId, type);
  } else {
    console.error(
      "initiateGroupCall function not available. Make sure CallManager is loaded.",
    );
  }
}
