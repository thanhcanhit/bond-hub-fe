"use client";

import { useState, useEffect, use } from "react";
import { useSearchParams } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Phone, PhoneOff } from "lucide-react";
import { getUserInitials } from "@/utils/userUtils";
import { playCallRingtone, stopAudio } from "@/utils/audioUtils";
import { User } from "@/types/base";
import { fetchUserById } from "@/actions/user";
import { toast } from "sonner";
import { useAuthStore } from "@/stores/authStore";
import { useCallStore } from "@/stores/callStore";

export default function IncomingCallPage({
  params,
}: {
  params: { id: string };
}) {
  // Unwrap params at the top level of the component
  const unwrappedParams = use(params as any) as { id: string };
  const callId = unwrappedParams.id;

  // Return the actual incoming call UI with the unwrapped callId
  return <IncomingCallContent callId={callId} />;
}

// Separate component for the actual incoming call UI
function IncomingCallContent({ callId }: { callId: string }) {
  const searchParams = useSearchParams();
  const initiatorId = searchParams.get("initiatorId");
  const roomId = searchParams.get("roomId");
  const callType = searchParams.get("type") as "AUDIO" | "VIDEO";

  const [caller, setCaller] = useState<User | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const { accessToken } = useAuthStore();

  // Play call ringtone
  useEffect(() => {
    console.log("Starting call ringtone");
    let audio: HTMLAudioElement | null = null;

    const setupAudio = () => {
      try {
        audio = playCallRingtone(0.7);

        // Add event listeners to debug audio issues
        if (audio) {
          audio.addEventListener("play", () => {
            console.log("Call ringtone started playing");
          });

          audio.addEventListener("error", (e) => {
            console.error("Error playing call ringtone:", e);
          });

          audio.addEventListener("pause", () => {
            console.log("Call ringtone paused");
          });
        }
      } catch (error) {
        console.error("Exception when trying to play ringtone:", error);
      }
    };

    // Set up audio with a small delay to ensure component is fully mounted
    const timeoutId = setTimeout(() => {
      setupAudio();
    }, 100);

    return () => {
      // Clear the timeout if component unmounts before timeout completes
      clearTimeout(timeoutId);

      console.log("Cleaning up call ringtone");
      if (audio) {
        try {
          stopAudio(audio);
        } catch (error) {
          console.error("Error stopping audio:", error);
        }
      }
    };
  }, []);

  // Fetch caller information
  useEffect(() => {
    const getCaller = async () => {
      console.log(
        `Call params - initiatorId: ${initiatorId}, callId: ${callId}, roomId: ${roomId}`,
      );

      if (!initiatorId) {
        console.warn(
          "No initiatorId provided, trying to get from call store or session storage",
        );

        // Try to get initiator ID from session storage
        const storedInitiatorId = sessionStorage.getItem("callInitiatorId");
        if (storedInitiatorId) {
          console.log(
            `Found initiator ID in session storage: ${storedInitiatorId}`,
          );

          // Use this ID instead
          try {
            if (accessToken) {
              const userData = await fetchUserById(
                storedInitiatorId,
                accessToken,
              );
              if (userData) {
                console.log(
                  "Successfully fetched caller data from session storage ID",
                );
                setCaller(userData);
                return;
              }
            }
          } catch (error) {
            console.error(
              "Error fetching caller from session storage ID:",
              error,
            );
          }
        }

        // If we still don't have a caller, try to get active call from store
        try {
          const callStore = useCallStore.getState();
          const activeCall = callStore.currentCall;

          if (activeCall) {
            console.log("Found active call in store:", activeCall);

            // Get the target ID from the active call (the person who is calling)
            const callTargetId = activeCall.targetId;
            if (callTargetId && accessToken) {
              console.log(`Fetching caller data for target: ${callTargetId}`);
              const userData = await fetchUserById(callTargetId, accessToken);

              if (userData) {
                console.log(
                  "Successfully fetched caller data from active call target",
                );
                setCaller(userData);
                return;
              }
            }
          }
        } catch (storeError) {
          console.error("Error getting active call from store:", storeError);
        }

        // If we still don't have a caller, create a default one
        console.warn("Could not determine caller, using default");
        setCaller({
          id: initiatorId || "unknown",
          email: null,
          phoneNumber: null,
          passwordHash: "",
          createdAt: new Date(),
          updatedAt: new Date(),
          userInfo: {
            id: initiatorId || "unknown",
            fullName: "Người gọi",
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
        });
        return;
      }

      // If we have an initiatorId, proceed with normal flow
      try {
        console.log(
          `Fetching caller data for initiatorId: ${initiatorId} with token: ${accessToken ? "exists" : "missing"}`,
        );

        if (!accessToken) {
          console.warn("Cannot fetch caller data: No access token available");
          // Create a placeholder user
          setCaller({
            id: initiatorId,
            email: null,
            phoneNumber: null,
            passwordHash: "",
            createdAt: new Date(),
            updatedAt: new Date(),
            userInfo: {
              id: initiatorId,
              fullName: "Người gọi",
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
          });
          return;
        }

        // Pass the token explicitly to fetchUserById
        const userData = await fetchUserById(initiatorId, accessToken);
        console.log("Caller data fetched:", userData);

        if (userData) {
          setCaller(userData);
        } else {
          console.warn("No user data returned for initiatorId:", initiatorId);
          // Create a placeholder user
          setCaller({
            id: initiatorId,
            email: null,
            phoneNumber: null,
            passwordHash: "",
            createdAt: new Date(),
            updatedAt: new Date(),
            userInfo: {
              id: initiatorId,
              fullName: "Người gọi",
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
          });
        }
      } catch (error) {
        console.error("Error fetching caller information:", error);
        // Create a placeholder user on error
        setCaller({
          id: initiatorId,
          email: null,
          phoneNumber: null,
          passwordHash: "",
          createdAt: new Date(),
          updatedAt: new Date(),
          userInfo: {
            id: initiatorId,
            fullName: "Người gọi",
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
        });
      }
    };

    getCaller();
  }, [initiatorId, accessToken, callId, roomId]);

  // Handle accepting the call
  const handleAccept = async () => {
    console.log(
      `Accepting call: callId=${callId}, roomId=${roomId}, isProcessing=${isProcessing}`,
    );

    if (!callId || !roomId) {
      console.error("Cannot accept call: Missing callId or roomId");
      return;
    }

    if (isProcessing) {
      console.log(
        "Already processing call acceptance, ignoring duplicate click",
      );
      return;
    }

    setIsProcessing(true);
    console.log("Set isProcessing to true");

    try {
      // Ensure we have a valid token
      if (!accessToken) {
        console.error("Cannot accept call: No access token available");
        toast.error("Không thể kết nối cuộc gọi: Bạn cần đăng nhập lại");
        setIsProcessing(false);
        return;
      }

      // Get current user ID from auth store
      const currentUserId = useAuthStore.getState().user?.id;
      console.log(
        `Current user ID from auth store: ${currentUserId || "unknown"}`,
      );

      if (!currentUserId) {
        console.error("Cannot accept call: No user ID available");
        toast.error(
          "Không thể kết nối cuộc gọi: Không tìm thấy thông tin người dùng",
        );
        setIsProcessing(false);
        return;
      }

      console.log(`Calling acceptCall with callId=${callId}`);

      // Define a type for our result to ensure consistency
      type CallAcceptResult = {
        success: boolean;
        roomId?: string;
        type?: string;
        callUrl?: string;
        acceptedAt?: string;
        message?: string;
      };

      // Initialize the result variable with a default value
      let directResult: CallAcceptResult = {
        success: false,
        message: "Not attempted yet",
      };

      // Try a direct API call to bypass the existing flow
      console.log("Attempting direct API call to accept the call");

      try {
        // Use the Server Action directly instead of API route
        console.log("Using acceptCall Server Action");
        const { acceptCall } = await import("@/actions/call.action");

        // Log detailed information about the call parameters
        console.log(`Current user ID: ${currentUserId || "unknown"}`);
        console.log(`Token available: ${accessToken ? "yes" : "no"}`);
        console.log(
          `Token first chars: ${accessToken ? accessToken.substring(0, 10) + "..." : "no token"}`,
        );
        console.log(
          `Calling acceptCall with parameters: callId=${callId}, initiatorId=${initiatorId || "null"}, roomId=${roomId || "null"}`,
        );

        // Pass all parameters including initiatorId and roomId
        // These are needed for the backend to properly identify the call
        console.log(
          `Passing initiatorId=${initiatorId} and roomId=${roomId} to acceptCall`,
        );
        const result = await acceptCall(
          callId,
          accessToken,
          initiatorId || undefined, // Pass initiatorId if available
          roomId || undefined, // Pass roomId if available
          currentUserId,
        );

        // Log the detailed result
        console.log("Call acceptance result:", result);

        // Convert the result to our standard format
        directResult = {
          success: result.success,
          message: result.message,
          roomId: result.roomId,
          type: result.type,
          callUrl: result.callUrl,
          acceptedAt: result.acceptedAt,
        };
      } catch (error) {
        console.error("Error in acceptCall method:", error);
        directResult = {
          success: false,
          message:
            error instanceof Error
              ? error.message
              : "Unknown error accepting call",
        };
      }

      console.log("Call acceptance result:", directResult);

      if (directResult.success) {
        // Call was accepted successfully
        console.log("Call accepted successfully, proceeding with navigation");

        // Determine the appropriate call URL
        const callUrl = `/call/${roomId}`;

        // Add timestamp to track when the navigation happened
        const timestamp = Date.now();

        // Add query parameters to help identify the call
        const queryParams = new URLSearchParams({
          callId: callId,
          targetId: initiatorId || "",
          type: callType || "AUDIO",
          direction: "incoming",
          t: timestamp.toString(), // Add timestamp to help with state tracking
          userId: currentUserId, // Add current user ID to help with authentication
          forceConnect: "true", // Force connect since we know the call has been accepted
        }).toString();

        // Ensure the URL is absolute and properly formatted with query parameters
        const absoluteCallUrl = callUrl.startsWith("/")
          ? `${window.location.origin}${callUrl}?${queryParams}`
          : `${callUrl}?${queryParams}`;

        console.log(`Redirecting to call page: ${absoluteCallUrl}`);

        // Store important information in sessionStorage
        try {
          // Store the call URL for redirect backup
          sessionStorage.setItem("pendingCallRedirect", absoluteCallUrl);
          console.log("Stored call URL in sessionStorage as backup");

          // Store the call ID for reference in the call page
          sessionStorage.setItem("currentCallId", callId);
          console.log(`Stored currentCallId=${callId} in sessionStorage`);

          // Store the timestamp when the call was accepted
          sessionStorage.setItem("callAcceptedAt", new Date().toISOString());
          console.log("Stored acceptance timestamp in sessionStorage");

          // Store the initiator ID if available
          if (initiatorId) {
            sessionStorage.setItem("callInitiatorId", initiatorId);
            console.log(
              `Stored callInitiatorId=${initiatorId} in sessionStorage`,
            );
          }

          // Store roomId for WebRTC connection if available
          if (roomId) {
            sessionStorage.setItem("callRoomId", roomId);
            console.log(`Stored callRoomId=${roomId} in sessionStorage`);
          }

          // Store current user ID
          sessionStorage.setItem("currentUserId", currentUserId);
          console.log(
            `Stored currentUserId=${currentUserId} in sessionStorage`,
          );

          // Store access token for API calls
          sessionStorage.setItem("callAccessToken", accessToken);
          console.log("Stored access token in sessionStorage for call page");

          // Store forceConnect flag to ensure WebRTC connects immediately
          sessionStorage.setItem("forceConnect", "true");
          console.log("Stored forceConnect flag in sessionStorage");
        } catch (e) {
          console.error("Failed to store call data in sessionStorage:", e);
        }

        // Dispatch a custom event to notify any open windows that the call has been accepted
        try {
          // This helps the caller's window know that the call has been accepted
          window.dispatchEvent(
            new CustomEvent("call:accepted", {
              detail: {
                callId,
                roomId,
                initiatorId: initiatorId || undefined,
                receiverId: currentUserId,
                timestamp: new Date().toISOString(),
              },
            }),
          );
          console.log("Dispatched call:accepted event to current window");

          // Also dispatch a participant joined event to ensure the UI updates
          window.dispatchEvent(
            new CustomEvent("call:participant:joined", {
              detail: {
                roomId: roomId,
                userId: currentUserId,
                timestamp: new Date().toISOString(),
              },
            }),
          );
          console.log(
            "Dispatched call:participant:joined event to current window",
          );

          // If there's an opener window (like if this was opened from a notification), notify it too
          if (window.opener) {
            try {
              window.opener.postMessage(
                {
                  type: "CALL_ACCEPTED",
                  callId,
                  roomId,
                  initiatorId: initiatorId || undefined,
                  receiverId: currentUserId,
                  callType: callType || "AUDIO",
                  timestamp: new Date().toISOString(),
                },
                "*",
              );
              console.log("Posted CALL_ACCEPTED message to opener window");
            } catch (e) {
              console.error("Error posting message to opener:", e);
            }
          }

          // Try to broadcast the acceptance to all open windows using BroadcastChannel
          try {
            const callChannel = new BroadcastChannel("call_events");
            callChannel.postMessage({
              type: "CALL_ACCEPTED",
              callId,
              roomId,
              initiatorId: initiatorId || undefined,
              receiverId: currentUserId,
              callType: callType || "AUDIO",
              timestamp: new Date().toISOString(),
            });
            console.log("Broadcast CALL_ACCEPTED message to all windows");
            callChannel.close();
          } catch (broadcastError) {
            console.error(
              "Error broadcasting call acceptance:",
              broadcastError,
            );
            // Continue anyway, this is just an additional notification mechanism
          }
        } catch (eventError) {
          console.error("Error dispatching call:accepted event:", eventError);
          // Continue with navigation anyway
        }

        // Add a small delay to ensure events are processed
        setTimeout(() => {
          // Use window.location for more reliable navigation
          console.log(
            `Navigating to ${absoluteCallUrl} using window.location.href`,
          );
          window.location.href = absoluteCallUrl;
        }, 100);
      } else {
        // Call acceptance failed
        console.error("Failed to accept call");

        // Get error message from result if available
        let errorMessage = "Không thể kết nối cuộc gọi";
        if (directResult && directResult.message) {
          errorMessage = `Không thể kết nối cuộc gọi: ${directResult.message}`;
          console.error(`Error message from server: ${directResult.message}`);
        }

        // Show a more prominent error message to the user
        toast.error(errorMessage, {
          duration: 5000, // Show for 5 seconds
          position: "top-center",
        });

        // Reset processing state to allow the user to try again or close the window
        setIsProcessing(false);

        // Log detailed information about the call state
        console.log("Call acceptance failed. Debug information:");
        console.log(`Call ID: ${callId}`);
        console.log(`Room ID: ${roomId || "null"}`);
        console.log(`Initiator ID: ${initiatorId || "null"}`);
        console.log(`Call type: ${callType || "null"}`);
        console.log(`Has access token: ${!!accessToken}`);
        console.log(`Current user ID: ${currentUserId}`);

        // Try to get more information from the call store
        try {
          const callStore = useCallStore.getState();
          console.log("Call store state:", {
            isInCall: callStore.isInCall,
            currentCall: callStore.currentCall,
            isLoading: callStore.isLoading,
            error: callStore.error,
          });
        } catch (storeError) {
          console.error("Error getting call store state:", storeError);
        }

        // Try to get the active call to see if there's any conflict
        try {
          const { getActiveCall } = await import("@/actions/call.action");
          console.log("Checking for active calls that might be conflicting...");
          const activeCallResult = await getActiveCall(accessToken);
          console.log("Active call check result:", activeCallResult);
        } catch (activeCallError) {
          console.error("Error checking active call:", activeCallError);
        }

        // Dispatch call ended event to clean up on the initiator side
        try {
          window.dispatchEvent(
            new CustomEvent("call:ended", {
              detail: { callId },
            }),
          );
          console.log(
            "[INCOMING_CALL] Dispatched call:ended event after failure",
          );
        } catch (e) {
          console.error(
            "[INCOMING_CALL] Error dispatching call:ended event:",
            e,
          );
        }

        // IMPORTANT: We do NOT navigate to the call page when the API call fails
        // This prevents the issue where users are redirected to the call page
        // even though they're not properly joined to the call
      }
    } catch (error) {
      console.error("Error accepting call:", error);

      // Create a more detailed error message
      let errorMessage = "Đã xảy ra lỗi khi kết nối cuộc gọi";
      if (error instanceof Error) {
        errorMessage = `Đã xảy ra lỗi: ${error.message}`;
        console.error(`Error name: ${error.name}, message: ${error.message}`);
      }

      toast.error(errorMessage);

      // Don't close the window so we can debug the issue
      setIsProcessing(false);

      // Log detailed error information
      if (error instanceof Error) {
        console.log("Error details:", {
          name: error.name,
          message: error.message,
          stack: error.stack,
        });
      } else {
        console.log("Unknown error type:", error);
      }

      // Log network status
      console.log("Network status:", {
        online: typeof navigator !== "undefined" ? navigator.onLine : "unknown",
        url: typeof window !== "undefined" ? window.location.href : "unknown",
      });

      // Try to get more information from the call store
      try {
        const callStore = useCallStore.getState();
        console.log("Call store state after error:", {
          isInCall: callStore.isInCall,
          currentCall: callStore.currentCall,
          isLoading: callStore.isLoading,
          error: callStore.error,
        });
      } catch (storeError) {
        console.error("Error getting call store state:", storeError);
      }

      // Dispatch call ended event to clean up on the initiator side
      try {
        window.dispatchEvent(
          new CustomEvent("call:ended", {
            detail: { callId },
          }),
        );
        console.log("[INCOMING_CALL] Dispatched call:ended event after error");
      } catch (e) {
        console.error("[INCOMING_CALL] Error dispatching call:ended event:", e);
      }

      // Try to call the API directly to see if there's a connection issue
      try {
        if (accessToken) {
          console.log(
            "Attempting direct API call to diagnose connection issues...",
          );
          const apiUrl =
            process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

          // Make a simple GET request to check connectivity
          fetch(`${apiUrl}/api/v1/health`, {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${accessToken}`,
            },
          })
            .then((response) => {
              console.log("Health check response:", {
                status: response.status,
                ok: response.ok,
              });
              return response.text();
            })
            .then((text) => {
              console.log("Health check response text:", text);
            })
            .catch((healthError) => {
              console.error("Health check failed:", healthError);
            });
        }
      } catch (apiError) {
        console.error("Error making direct API call:", apiError);
      }

      // IMPORTANT: We do NOT navigate to the call page when there's an error
      // This prevents the issue where users are redirected to the call page
      // even though they're not properly joined to the call
    }
  };

  // Handle rejecting the call
  const handleReject = async () => {
    console.log(
      `Rejecting call: callId=${callId}, isProcessing=${isProcessing}`,
    );

    if (!callId) {
      console.error("Cannot reject call: Missing callId");
      return;
    }

    if (isProcessing) {
      console.log(
        "Already processing call rejection, ignoring duplicate click",
      );
      return;
    }

    setIsProcessing(true);
    console.log("Set isProcessing to true");

    try {
      console.log(`Calling rejectCall with callId=${callId}`);

      // Use the call store to reject the call
      const success = await useCallStore.getState().rejectIncomingCall(callId);

      if (success) {
        console.log("Call rejected successfully");
      } else {
        console.error("Failed to reject call");
      }

      window.close();
    } catch (error) {
      console.error("Error rejecting call:", error);
      toast.error("Đã xảy ra lỗi khi từ chối cuộc gọi");
      window.close();
    }
  };

  return (
    <div className="fixed inset-0 bg-white flex flex-col items-center justify-center">
      <div className="bg-white rounded-lg overflow-hidden w-full max-w-md shadow-xl">
        <div className="bg-blue-500 p-4 text-center text-white">
          <h2 className="text-xl font-semibold">
            {callType === "VIDEO" ? "Cuộc gọi video đến" : "Cuộc gọi thoại đến"}
          </h2>
        </div>

        <div className="p-8 flex flex-col items-center">
          <Avatar className="h-32 w-32 mb-6">
            <AvatarImage
              src={caller?.userInfo?.profilePictureUrl || ""}
              alt={caller?.userInfo?.fullName || "Unknown"}
            />
            <AvatarFallback className="text-4xl">
              {caller ? getUserInitials(caller) : "?"}
            </AvatarFallback>
          </Avatar>

          <h3 className="text-2xl font-bold mb-2">
            {caller?.userInfo?.fullName || "Người dùng"}
          </h3>

          <p className="text-gray-500 mb-8">
            {callType === "VIDEO" ? "Cuộc gọi video" : "Cuộc gọi thoại"}
          </p>

          <div className="flex gap-8">
            <button
              onClick={handleReject}
              disabled={isProcessing}
              className="w-16 h-16 rounded-full bg-red-600 flex items-center justify-center disabled:opacity-70"
              aria-label="Từ chối cuộc gọi"
            >
              <PhoneOff className="text-white h-7 w-7" />
            </button>

            <button
              onClick={handleAccept}
              disabled={isProcessing}
              className="w-16 h-16 rounded-full bg-green-600 flex items-center justify-center disabled:opacity-70"
              aria-label="Chấp nhận cuộc gọi"
            >
              <Phone className="text-white h-7 w-7" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
