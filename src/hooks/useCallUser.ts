import { useState, useEffect } from "react";

interface UserInfo {
  fullName?: string;
  profilePictureUrl?: string;
}

interface User {
  id: string;
  userInfo?: UserInfo;
}

interface UseCallUserProps {
  userId: string;
  targetId?: string | null;
  callId?: string | null;
  isOutgoing?: boolean;
}

/**
 * Custom hook for fetching and managing user data for calls
 */
export function useCallUser({
  userId,
  targetId,
  callId,
  isOutgoing = false,
}: UseCallUserProps): User | null {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        console.log(`[useCallUser] Fetching user data for userId: ${userId}`);

        // Import required modules
        const { getUserDataById } = await import("@/actions/user.action");
        const { getActiveCall } = await import("@/actions/call.action");
        const { useAuthStore } = await import("@/stores/authStore");

        // Try to get token from auth store first
        let token = useAuthStore.getState().accessToken;
        let myUserId = useAuthStore.getState().user?.id;

        // If no token in auth store, try to get from session storage (for incoming calls)
        if (!token) {
          const storedToken = sessionStorage.getItem("callAccessToken");
          if (storedToken) {
            console.log("[useCallUser] Using token from sessionStorage");
            token = storedToken;
          }
        }

        // If no user ID in auth store, try to get from session storage
        if (!myUserId) {
          const storedUserId = sessionStorage.getItem("currentUserId");
          if (storedUserId) {
            console.log(
              `[useCallUser] Using user ID from sessionStorage: ${storedUserId}`,
            );
            myUserId = storedUserId;
          }
        }

        console.log(`[useCallUser] Current user ID: ${myUserId || "unknown"}`);
        console.log(`[useCallUser] Room/Call ID: ${userId}`);
        console.log(`[useCallUser] Has token: ${!!token}`);
        console.log(`[useCallUser] Target ID: ${targetId}`);
        console.log(`[useCallUser] Call ID: ${callId}`);
        console.log(`[useCallUser] Is outgoing: ${isOutgoing}`);

        // Check URL parameters for user ID
        const urlParams = new URLSearchParams(window.location.search);
        const urlUserId = urlParams.get("userId");
        if (urlUserId && !myUserId) {
          console.log(
            `[useCallUser] Found user ID in URL parameters: ${urlUserId}`,
          );
          myUserId = urlUserId;
        }

        // First, try to get the active call to determine the correct user information
        if (token) {
          console.log(
            "[useCallUser] Checking active call to find correct user information",
          );
          const activeCallResult = await getActiveCall(token);

          if (activeCallResult.success && activeCallResult.activeCall) {
            const activeCall = activeCallResult.activeCall;
            console.log("[useCallUser] Active call found:", activeCall);

            // Determine who is the other party in the call
            let otherUserId;

            if (activeCall.initiatorId === myUserId) {
              // I am the initiator, so the other party is the receiver
              otherUserId = activeCall.receiverId;
              console.log(
                `[useCallUser] I am the initiator, other party is: ${otherUserId}`,
              );
            } else {
              // I am the receiver, so the other party is the initiator
              otherUserId = activeCall.initiatorId;
              console.log(
                `[useCallUser] I am the receiver, other party is: ${otherUserId}`,
              );
            }

            if (otherUserId) {
              console.log(
                `[useCallUser] Fetching user data for other party: ${otherUserId}`,
              );
              const otherUserResult = await getUserDataById(otherUserId, token);

              if (otherUserResult.success && otherUserResult.user) {
                console.log(
                  "[useCallUser] Successfully fetched other party's data:",
                  otherUserResult.user,
                );
                setUser(otherUserResult.user);
                document.title = `Cuộc gọi với ${otherUserResult.user.userInfo?.fullName || "Người dùng"}`;

                // Store the call ID for future reference
                if (activeCall.id && !callId) {
                  console.log(
                    `[useCallUser] Storing call ID in session storage: ${activeCall.id}`,
                  );
                  sessionStorage.setItem("currentCallId", activeCall.id);
                }

                return;
              }
            }
          } else {
            console.log(
              "[useCallUser] No active call found or error getting active call",
            );
          }
        }

        // If we couldn't get the other party from active call, try using targetId from URL
        if (targetId) {
          console.log(`[useCallUser] Using targetId: ${targetId}`);
          const targetResult = await getUserDataById(targetId);

          if (targetResult.success && targetResult.user) {
            console.log(
              "[useCallUser] Successfully fetched target user data:",
              targetResult.user,
            );
            setUser(targetResult.user);
            document.title = `Cuộc gọi với ${targetResult.user.userInfo?.fullName || "Người dùng"}`;
            return;
          }
        }

        // If all else fails, try using the room ID (userId) directly
        if (userId && userId !== myUserId) {
          console.log(`[useCallUser] Using room ID as user ID: ${userId}`);
          const roomUserResult = await getUserDataById(userId);

          if (roomUserResult.success && roomUserResult.user) {
            console.log(
              "[useCallUser] Successfully fetched user data from room ID:",
              roomUserResult.user,
            );
            setUser(roomUserResult.user);
            document.title = `Cuộc gọi với ${roomUserResult.user.userInfo?.fullName || "Người dùng"}`;
            return;
          }
        }

        // If we still don't have user data, set a default
        console.log(
          "[useCallUser] Could not determine other party, using default user",
        );
        setUser({
          id: targetId || userId || "unknown",
          userInfo: {
            fullName: "Người dùng",
          },
        });
      } catch (error) {
        console.error("[useCallUser] Error fetching user data:", error);

        // Set a default user object to prevent UI errors
        setUser({
          id: targetId || userId || "unknown",
          userInfo: {
            fullName: "Người dùng",
          },
        });
      }
    };

    fetchUserData();
  }, [userId, targetId, callId, isOutgoing]);

  return user;
}
