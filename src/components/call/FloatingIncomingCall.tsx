"use client";

import { useState, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Phone, PhoneOff } from "lucide-react";
import { getUserInitials } from "@/utils/userUtils";
import { playCallRingtone, stopAudio } from "@/utils/audioUtils";
import { User } from "@/types/base";
import { fetchUserById } from "@/actions/user";
import { acceptCall, rejectCall } from "@/actions/call.action";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";

interface FloatingIncomingCallProps {
  callData: {
    callId: string;
    initiatorId: string;
    type: "AUDIO" | "VIDEO";
    roomId: string;
    isGroupCall: boolean;
  };
  onClose: () => void;
}

export default function FloatingIncomingCall({
  callData,
  onClose,
}: FloatingIncomingCallProps) {
  const router = useRouter();
  const [caller, setCaller] = useState<User | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const { callId, initiatorId, type, roomId } = callData;

  // Play call ringtone
  useEffect(() => {
    let audio: HTMLAudioElement | null = null;

    const setupAudio = () => {
      try {
        audio = playCallRingtone(0.7);
      } catch (error) {
        console.error("[INCOMING_CALL] Error playing ringtone:", error);
      }
    };

    // Set up audio with a small delay to ensure component is fully mounted
    const timeoutId = setTimeout(() => {
      setupAudio();
    }, 100);

    return () => {
      // Clear the timeout if component unmounts before timeout completes
      clearTimeout(timeoutId);

      if (audio) {
        try {
          stopAudio(audio);
        } catch (error) {
          console.error("[INCOMING_CALL] Error stopping audio:", error);
        }
      }
    };
  }, []);

  // Fetch caller information
  useEffect(() => {
    const getCaller = async () => {
      if (!initiatorId) return;

      try {
        const userData = await fetchUserById(initiatorId);
        if (userData) {
          setCaller(userData);
        }
      } catch (error) {
        console.error("Error fetching caller information:", error);
      }
    };

    getCaller();
  }, [initiatorId]);

  // Handle accepting the call
  const handleAccept = async () => {
    console.log(
      `[INCOMING_CALL] Accepting call: callId=${callId}, roomId=${roomId}, isProcessing=${isProcessing}`,
    );

    if (!callId || !roomId) {
      console.error(
        "[INCOMING_CALL] Cannot accept call: Missing callId or roomId",
      );
      return;
    }

    if (isProcessing) {
      console.log(
        "[INCOMING_CALL] Already processing call acceptance, ignoring duplicate click",
      );
      return;
    }

    setIsProcessing(true);
    console.log("[INCOMING_CALL] Set isProcessing to true");

    try {
      // Get token for API call
      const token = useAuthStore.getState().accessToken;
      console.log(
        `[INCOMING_CALL] Got token from auth store: ${token ? "Token exists" : "No token"}`,
      );

      if (!token) {
        console.error(
          "[INCOMING_CALL] Cannot accept call: No authentication token",
        );
        toast.error("Bạn cần đăng nhập để chấp nhận cuộc gọi");
        onClose();
        return;
      }

      // Make the API call first to ensure the backend knows the call is accepted
      console.log(`[INCOMING_CALL] Calling acceptCall with callId=${callId}`);
      const result = await acceptCall(callId, token);
      console.log("[INCOMING_CALL] Call acceptance result:", result);

      if (result.success) {
        // Use the call URL from the API response if available, otherwise determine it locally
        const callUrl =
          result.callUrl ||
          (type === "VIDEO" ? `/video-call/${roomId}` : `/call/${roomId}`);

        // Ensure the URL is absolute and properly formatted
        const absoluteCallUrl = callUrl.startsWith("/")
          ? `${window.location.origin}${callUrl}`
          : callUrl;

        console.log(
          `[INCOMING_CALL] Redirecting to call page: ${absoluteCallUrl}`,
        );

        // First, store the call URL in sessionStorage as a backup
        try {
          sessionStorage.setItem("pendingCallRedirect", absoluteCallUrl);
          console.log(
            "[INCOMING_CALL] Stored call URL in sessionStorage as backup",
          );

          // Also store timestamp to track how long it takes to navigate
          sessionStorage.setItem("callAcceptedAt", new Date().toISOString());
          console.log(
            "[INCOMING_CALL] Stored acceptance timestamp in sessionStorage",
          );
        } catch (e) {
          console.error(
            "[INCOMING_CALL] Failed to store data in sessionStorage:",
            e,
          );
        }

        // Không cần phát sự kiện call:accepted vì backend không sử dụng
        // Backend sẽ phát sự kiện participantJoined khi người dùng tham gia phòng
        console.log(
          "[INCOMING_CALL] Call accepted successfully, backend will notify participants via participantJoined event",
        );

        // No need to dispatch custom events anymore
        // The backend will send call:participant:joined event via WebSocket
        // which will be handled by both the initiator and receiver
        console.log(
          "[INCOMING_CALL] Call accepted successfully, backend will notify all participants",
        );

        // Close the UI before navigation to prevent state updates after unmount
        onClose();

        // Use a short delay to ensure the event is processed before navigation
        setTimeout(() => {
          // First, try to check if there's already a call window open with the same URL
          // This can happen if the user clicked accept multiple times
          let existingWindow = false;
          try {
            if (window.opener && !window.opener.closed) {
              console.log(
                "[INCOMING_CALL] Detected opener window, checking if it's a call window",
              );
              existingWindow = true;
            }
          } catch (e) {
            console.error("[INCOMING_CALL] Error checking opener window:", e);
          }

          if (existingWindow) {
            console.log("[INCOMING_CALL] Using existing window for call");
            try {
              window.opener.focus();
              console.log("[INCOMING_CALL] Focused existing window");

              // Notify the opener window that the call has been accepted
              try {
                window.opener.postMessage(
                  {
                    type: "CALL_ACCEPTED",
                    callId,
                    roomId,
                    callType: type,
                    timestamp: new Date().toISOString(),
                  },
                  "*",
                );
                console.log("[INCOMING_CALL] Posted message to opener window");
              } catch (e) {
                console.error(
                  "[INCOMING_CALL] Error posting message to opener:",
                  e,
                );
              }

              // Close this window after a short delay
              setTimeout(() => {
                window.close();
              }, 500);

              return;
            } catch (e) {
              console.error(
                "[INCOMING_CALL] Error focusing existing window:",
                e,
              );
              // Fall through to opening a new window
            }
          }

          // Simplify the navigation approach - use direct window.location.href
          // This is more reliable than window.open which can be blocked by popup blockers
          console.log(
            `[INCOMING_CALL] Navigating directly to ${absoluteCallUrl}`,
          );

          // Add query parameters to help with debugging and identification
          // Không sử dụng tham số accepted=true vì backend không sử dụng
          // Chỉ thêm timestamp để tránh cache
          const queryChar = absoluteCallUrl.includes("?") ? "&" : "?";
          const uniqueUrl = `${absoluteCallUrl}${queryChar}t=${Date.now()}`;
          console.log(
            `[INCOMING_CALL] Using unique URL with timestamp: ${uniqueUrl}`,
          );

          // Log that we're about to navigate
          console.log("[INCOMING_CALL] Redirecting using window.location.href");

          // Use direct navigation - most reliable method
          window.location.href = uniqueUrl;
        }, 300);
      } else {
        console.error("[INCOMING_CALL] Failed to accept call:", result.message);
        toast.error(result.message || "Không thể kết nối cuộc gọi");

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

        onClose();
      }
    } catch (error) {
      console.error("[INCOMING_CALL] Error accepting call:", error);
      toast.error("Đã xảy ra lỗi khi kết nối cuộc gọi");

      // Still try to dispatch event to ensure cleanup
      try {
        window.dispatchEvent(
          new CustomEvent("call:ended", {
            detail: { callId },
          }),
        );
        console.log("[INCOMING_CALL] Dispatched call:ended event after error");
      } catch (e) {
        console.error("[INCOMING_CALL] Error dispatching call ended event:", e);
      }

      onClose();
    }
  };

  // Handle rejecting the call
  const handleReject = async () => {
    console.log(
      `[INCOMING_CALL] Rejecting call: callId=${callId}, isProcessing=${isProcessing}`,
    );

    if (!callId) {
      console.error("[INCOMING_CALL] Cannot reject call: Missing callId");
      return;
    }

    if (isProcessing) {
      console.log(
        "[INCOMING_CALL] Already processing call rejection, ignoring duplicate click",
      );
      return;
    }

    setIsProcessing(true);
    console.log("[INCOMING_CALL] Set isProcessing to true");

    try {
      // Get token for API call
      const token = useAuthStore.getState().accessToken;
      console.log(
        `[INCOMING_CALL] Got token from auth store: ${token ? "Token exists" : "No token"}`,
      );

      if (!token) {
        console.error(
          "[INCOMING_CALL] Cannot reject call: No authentication token",
        );
        toast.error("Bạn cần đăng nhập để từ chối cuộc gọi");
        onClose();
        return;
      }

      // First dispatch events to ensure the initiator is notified immediately
      // This helps ensure the UI updates even if the API call takes time
      console.log("[INCOMING_CALL] Dispatching call:rejected custom event");
      window.dispatchEvent(
        new CustomEvent("call:rejected", {
          detail: {
            callId,
            timestamp: new Date().toISOString(),
          },
        }),
      );

      // Also dispatch a call:ended event for backward compatibility
      console.log(
        "[INCOMING_CALL] Dispatching call:ended custom event for compatibility",
      );
      window.dispatchEvent(
        new CustomEvent("call:ended", {
          detail: {
            callId,
            timestamp: new Date().toISOString(),
          },
        }),
      );

      // Then make the API call
      console.log(`[INCOMING_CALL] Calling rejectCall with callId=${callId}`);
      const result = await rejectCall(callId, token);
      console.log("[INCOMING_CALL] Call rejected result:", result);

      // Store rejection timestamp in sessionStorage for debugging
      try {
        sessionStorage.setItem("callRejectedAt", new Date().toISOString());
        console.log(
          "[INCOMING_CALL] Stored rejection timestamp in sessionStorage",
        );
      } catch (e) {
        console.error(
          "[INCOMING_CALL] Failed to store rejection timestamp in sessionStorage:",
          e,
        );
      }

      // Close the UI immediately after dispatching events
      // Don't wait for the API call to complete
      console.log("[INCOMING_CALL] Closing incoming call UI");
      onClose();
    } catch (error) {
      console.error("[INCOMING_CALL] Error rejecting call:", error);
      toast.error("Đã xảy ra lỗi khi từ chối cuộc gọi");

      // Still try to dispatch events to ensure cleanup if they weren't dispatched earlier
      try {
        console.log(
          "[INCOMING_CALL] Dispatching fallback rejection events after error",
        );
        window.dispatchEvent(
          new CustomEvent("call:rejected", {
            detail: {
              callId,
              timestamp: new Date().toISOString(),
              isErrorFallback: true,
            },
          }),
        );
        window.dispatchEvent(
          new CustomEvent("call:ended", {
            detail: {
              callId,
              timestamp: new Date().toISOString(),
              isErrorFallback: true,
            },
          }),
        );
        console.log("[INCOMING_CALL] Fallback rejection events dispatched");
      } catch (e) {
        console.error(
          "[INCOMING_CALL] Error dispatching fallback rejection events:",
          e,
        );
      }

      console.log("[INCOMING_CALL] Closing incoming call UI after error");
      onClose();
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-white rounded-lg shadow-lg overflow-hidden w-72 border border-gray-200">
      <div className="bg-blue-500 p-2 text-white flex justify-between items-center">
        <h3 className="text-sm font-medium">
          {type === "VIDEO" ? "Cuộc gọi video đến" : "Cuộc gọi thoại đến"}
        </h3>
        <button
          onClick={handleReject}
          className="text-white hover:text-gray-200"
        >
          ×
        </button>
      </div>

      <div className="p-4 flex items-center">
        <Avatar className="h-12 w-12 mr-4">
          <AvatarImage
            src={caller?.userInfo?.profilePictureUrl || ""}
            alt={caller?.userInfo?.fullName || "Unknown"}
          />
          <AvatarFallback className="text-lg">
            {caller ? getUserInitials(caller) : "?"}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1">
          <p className="font-medium text-gray-900">
            {caller?.userInfo?.fullName || "Người dùng"}
          </p>
          <p className="text-sm text-gray-500">
            {type === "VIDEO" ? "Cuộc gọi video" : "Cuộc gọi thoại"}
          </p>
        </div>
      </div>

      <div className="flex border-t border-gray-200">
        <button
          onClick={handleReject}
          disabled={isProcessing}
          className="flex-1 py-3 bg-gray-100 text-red-500 hover:bg-gray-200 disabled:opacity-50 flex items-center justify-center"
        >
          <PhoneOff className="h-5 w-5 mr-2" />
          Từ chối
        </button>

        <button
          onClick={handleAccept}
          disabled={isProcessing}
          className="flex-1 py-3 bg-green-500 text-white hover:bg-green-600 disabled:opacity-50 flex items-center justify-center"
        >
          <Phone className="h-5 w-5 mr-2" />
          Trả lời
        </button>
      </div>
    </div>
  );
}
