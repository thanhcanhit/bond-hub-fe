"use client";

import { socket, callSocket, setupSocket, setupCallSocket } from "@/lib/socket";
import { toast } from "sonner";
import { useAuthStore } from "@/stores/authStore";

interface CallData {
  callId: string;
  initiatorId: string;
  type: "AUDIO" | "VIDEO";
  roomId: string;
  isGroupCall: boolean;
  groupId?: string;
}

let incomingCallHandler: ((callData: CallData) => void) | null = null;
let callAcceptedHandler:
  | ((data: {
      callId: string;
      roomId: string;
      callUrl?: string;
      acceptedAt?: string;
    }) => void)
  | null = null;
let callRejectedHandler: ((data: { callId: string }) => void) | null = null;
let callEndedHandler: ((data: { callId: string }) => void) | null = null;

/**
 * Initialize call socket event handlers
 */
export function initCallSocketHandlers() {
  console.log("Initializing call socket event handlers");

  // Ensure socket is connected by getting the token and setting up the socket
  const accessToken = useAuthStore.getState().accessToken;
  if (!accessToken) {
    console.error("Cannot initialize call handlers: No auth token available");
    return;
  }

  // Set up both the main socket and the dedicated call socket
  console.log("Setting up main socket with token for call handlers");
  setupSocket(accessToken);

  console.log("Setting up dedicated call socket");
  setupCallSocket(accessToken);

  // Track active calls to prevent duplicate notifications
  const activeCallIds = new Set<string>();

  // Add direct debug listeners for incoming calls on both sockets
  // This will help us determine if the events are being received at all
  socket.on("call:incoming", (data) => {
    console.log("🔔 DEBUG: Main socket received call:incoming event:", data);

    // Check if we're already handling this call
    if (activeCallIds.has(data.callId)) {
      console.log(
        `Call ${data.callId} is already being handled, ignoring duplicate event`,
      );
      return;
    }

    // Add to active calls
    activeCallIds.add(data.callId);

    // Handle the incoming call
    if (incomingCallHandler) {
      console.log(
        "Calling registered incomingCallHandler from direct listener",
      );
      incomingCallHandler(data);
    } else {
      console.warn("No incomingCallHandler registered for direct listener");
      showIncomingCallToast(data);
    }

    // Remove from active calls after a delay to prevent duplicate notifications
    setTimeout(() => {
      activeCallIds.delete(data.callId);
    }, 5000);
  });

  socket.on("incomingCall", (data) => {
    console.log(
      "🔔 DEBUG: Main socket received incomingCall event (legacy):",
      data,
    );

    // Check if we're already handling this call
    if (activeCallIds.has(data.callId)) {
      console.log(
        `Call ${data.callId} is already being handled, ignoring duplicate legacy event`,
      );
      return;
    }

    // Add to active calls
    activeCallIds.add(data.callId);

    // Handle the incoming call
    if (incomingCallHandler) {
      console.log(
        "Calling registered incomingCallHandler from direct legacy listener",
      );
      incomingCallHandler(data);
    } else {
      console.warn(
        "No incomingCallHandler registered for direct legacy listener",
      );
      showIncomingCallToast(data);
    }

    // Remove from active calls after a delay to prevent duplicate notifications
    setTimeout(() => {
      activeCallIds.delete(data.callId);
    }, 5000);
  });

  // Check if either socket is connected
  const mainSocketConnected = socket.connected;
  const callSocketConnected = callSocket && callSocket.connected;

  if (!mainSocketConnected && !callSocketConnected) {
    console.warn(
      "Neither main socket nor call socket is connected when initializing call handlers",
    );
    console.log("Will attempt to reconnect in 2 seconds...");

    // Try to reconnect after a short delay, but only once to prevent infinite loops
    // Use a more reliable approach with a flag to prevent multiple reconnection attempts
    if (!(window as any).__socketReconnectAttempted) {
      (window as any).__socketReconnectAttempted = true;

      setTimeout(() => {
        const token = useAuthStore.getState().accessToken;
        if (token) {
          console.log("Attempting to reconnect sockets...");
          setupSocket(token);
          setupCallSocket(token);

          // Register handlers again after reconnection attempt
          setTimeout(() => {
            const mainReconnected = socket.connected;
            const callReconnected = callSocket && callSocket.connected;

            if (mainReconnected || callReconnected) {
              console.log(
                "At least one socket reconnected, registering handlers again",
              );
              registerSocketEventHandlers();
            } else {
              console.warn(
                "Could not reconnect sockets after retry, will try again on next user action",
              );
            }

            // Reset the flag after a longer delay to allow future reconnection attempts
            setTimeout(() => {
              (window as any).__socketReconnectAttempted = false;
            }, 10000); // Wait 10 seconds before allowing another reconnection attempt
          }, 1000);
        }
      }, 2000);
    } else {
      console.log(
        "Reconnection already attempted recently, skipping to prevent loops",
      );
    }
  } else {
    if (mainSocketConnected) {
      console.log("Main socket is connected with ID:", socket.id);
    }
    if (callSocketConnected && callSocket) {
      console.log("Call socket is connected with ID:", callSocket.id);
    }
    registerSocketEventHandlers();
  }

  // Also listen for the custom event dispatched by the call socket
  if (typeof window !== "undefined") {
    // Create a handler function for the custom event
    const handleCustomCallEvent = (event: Event) => {
      const customEvent = event as CustomEvent;
      const callData = customEvent.detail as CallData;
      console.log("🔔 Received call:incoming custom event:", callData);

      // Check if we're already handling this call
      if (activeCallIds.has(callData.callId)) {
        console.log(
          `Call ${callData.callId} is already being handled, ignoring duplicate custom event`,
        );
        return;
      }

      // Add to active calls
      activeCallIds.add(callData.callId);

      if (incomingCallHandler) {
        console.log("Calling registered incomingCallHandler from custom event");
        incomingCallHandler(callData);
      } else {
        console.warn("No incomingCallHandler registered for custom event");
        showIncomingCallToast(callData);
      }

      // Remove from active calls after a delay to prevent duplicate notifications
      setTimeout(() => {
        activeCallIds.delete(callData.callId);
      }, 5000);
    };

    // Create a cleanup handler
    const handleCleanupEvent = () => {
      console.log(
        "Received call:cleanup event, removing call:incoming event listener",
      );
      window.removeEventListener("call:incoming", handleCustomCallEvent);
      window.removeEventListener("call:cleanup", handleCleanupEvent);
    };

    // Remove any existing listener first to prevent duplicates
    window.removeEventListener("call:incoming", handleCustomCallEvent);
    window.removeEventListener("call:cleanup", handleCleanupEvent);

    // Add the listeners
    window.addEventListener("call:incoming", handleCustomCallEvent);
    window.addEventListener("call:cleanup", handleCleanupEvent);
  }
}

/**
 * Show a toast notification for incoming calls when no handler is registered
 */
function showIncomingCallToast(data: CallData) {
  toast.info(
    `Bạn có cuộc gọi ${data.type === "VIDEO" ? "video" : "thoại"} đến`,
    {
      description: "Vui lòng làm mới trang để nhận cuộc gọi",
      duration: 5000,
      action: {
        label: "Mở",
        onClick: () => {
          // Open incoming call in a new window
          const { callId, initiatorId, type, roomId } = data;
          const incomingCallUrl = `/call/incoming/${callId}?initiatorId=${initiatorId}&type=${type}&roomId=${roomId}`;
          window.open(
            incomingCallUrl,
            "_blank",
            type === "VIDEO" ? "width=800,height=600" : "width=400,height=600",
          );
        },
      },
    },
  );
}

/**
 * Register socket event handlers for call-related events
 */
function registerSocketEventHandlers() {
  // Remove any existing listeners from main socket to prevent duplicates
  socket.off("call:incoming");
  socket.off("incomingCall"); // Also remove old event name for backward compatibility
  socket.off("call:accepted");
  socket.off("callAccepted"); // Also remove old event name for backward compatibility
  socket.off("call:rejected");
  socket.off("callRejected"); // Also remove old event name for backward compatibility
  socket.off("call:ended");
  socket.off("callEnded"); // Also remove old event name for backward compatibility

  // Remove any existing listeners from call socket if it exists
  if (callSocket) {
    callSocket.off("call:incoming");
    callSocket.off("incomingCall"); // Also remove old event name for backward compatibility
    callSocket.off("call:accepted");
    callSocket.off("callAccepted"); // Also remove old event name for backward compatibility
    callSocket.off("call:rejected");
    callSocket.off("callRejected"); // Also remove old event name for backward compatibility
    callSocket.off("call:ended");
    callSocket.off("callEnded"); // Also remove old event name for backward compatibility
  }

  console.log("Removed existing call socket event listeners from both sockets");

  // Handle incoming call - listen for both event names for backward compatibility
  const handleIncomingCall = (data: CallData) => {
    console.log("Received incoming call event:", data);

    if (incomingCallHandler) {
      console.log("Calling registered incomingCallHandler");
      incomingCallHandler(data);
    } else {
      console.warn("No incomingCallHandler registered, showing toast instead");
      showIncomingCallToast(data);
    }
  };

  // Listen for both event names on both sockets
  socket.on("call:incoming", handleIncomingCall);
  socket.on("incomingCall", handleIncomingCall); // For backward compatibility

  if (callSocket) {
    callSocket.on("call:incoming", handleIncomingCall);
    callSocket.on("incomingCall", handleIncomingCall); // For backward compatibility
  }

  // Handle call accepted - listen for both event names for backward compatibility
  const handleCallAccepted = (data: {
    callId: string;
    roomId: string;
    callUrl?: string;
    acceptedAt?: string;
  }) => {
    console.log("Call accepted event received:", data);

    // Add timestamp if not provided
    if (!data.acceptedAt) {
      data.acceptedAt = new Date().toISOString();
    }

    // Determine call URL if not provided
    if (!data.callUrl && data.roomId) {
      // Try to determine the call type from the event data
      // Default to audio call if we can't determine
      const callType = data.callType || "AUDIO";
      data.callUrl =
        callType === "VIDEO"
          ? `/video-call/${data.roomId}`
          : `/call/${data.roomId}`;
      console.log(`Generated callUrl: ${data.callUrl}`);
    }

    // Dispatch custom event with enhanced data
    console.log("Dispatching call:accepted custom event with enhanced data");
    window.dispatchEvent(new CustomEvent("call:accepted", { detail: data }));

    if (callAcceptedHandler) {
      console.log("Calling registered callAcceptedHandler");
      callAcceptedHandler(data);
    } else {
      console.warn("No callAcceptedHandler registered");
    }
  };

  // Listen for both event names on both sockets
  socket.on("call:accepted", handleCallAccepted);
  socket.on("callAccepted", handleCallAccepted); // For backward compatibility

  if (callSocket) {
    callSocket.on("call:accepted", handleCallAccepted);
    callSocket.on("callAccepted", handleCallAccepted); // For backward compatibility
  }

  // Handle call rejected - listen for both event names for backward compatibility
  const handleCallRejected = (data: { callId: string }) => {
    console.log("Call rejected event received:", data);

    // Dispatch custom event
    console.log("Dispatching call:rejected custom event");
    window.dispatchEvent(new CustomEvent("call:rejected", { detail: data }));

    if (callRejectedHandler) {
      console.log("Calling registered callRejectedHandler");
      callRejectedHandler(data);
    } else {
      console.warn("No callRejectedHandler registered, showing toast instead");
      toast.error("Cuộc gọi đã bị từ chối");
    }
  };

  // Listen for both event names on both sockets
  socket.on("call:rejected", handleCallRejected);
  socket.on("callRejected", handleCallRejected); // For backward compatibility

  if (callSocket) {
    callSocket.on("call:rejected", handleCallRejected);
    callSocket.on("callRejected", handleCallRejected); // For backward compatibility
  }

  // Handle call ended
  const handleCallEnded = (data: { callId: string }) => {
    console.log("Call ended event received:", data);

    // Dispatch custom event
    console.log("Dispatching call:ended custom event");
    window.dispatchEvent(new CustomEvent("call:ended", { detail: data }));

    if (callEndedHandler) {
      console.log("Calling registered callEndedHandler");
      callEndedHandler(data);
    } else {
      console.warn("No callEndedHandler registered");
    }
  };

  // Listen for both event names on both sockets
  socket.on("call:ended", handleCallEnded);
  socket.on("callEnded", handleCallEnded); // For backward compatibility

  if (callSocket) {
    callSocket.on("call:ended", handleCallEnded);
    callSocket.on("callEnded", handleCallEnded); // For backward compatibility
  }
}

/**
 * Register a handler for incoming calls
 * @param handler Function to handle incoming call data
 */
export function registerIncomingCallHandler(
  handler: (callData: CallData) => void,
) {
  incomingCallHandler = handler;
}

/**
 * Unregister the incoming call handler
 */
export function unregisterIncomingCallHandler() {
  incomingCallHandler = null;
}

/**
 * Register a handler for call accepted events
 * @param handler Function to handle call accepted data
 */
export function registerCallAcceptedHandler(
  handler: (data: {
    callId: string;
    roomId: string;
    callUrl?: string;
    acceptedAt?: string;
  }) => void,
) {
  callAcceptedHandler = handler;
}

/**
 * Unregister the call accepted handler
 */
export function unregisterCallAcceptedHandler() {
  callAcceptedHandler = null;
}

/**
 * Register a handler for call rejected events
 * @param handler Function to handle call rejected data
 */
export function registerCallRejectedHandler(
  handler: (data: { callId: string }) => void,
) {
  callRejectedHandler = handler;
}

/**
 * Unregister the call rejected handler
 */
export function unregisterCallRejectedHandler() {
  callRejectedHandler = null;
}

/**
 * Register a handler for call ended events
 * @param handler Function to handle call ended data
 */
export function registerCallEndedHandler(
  handler: (data: { callId: string }) => void,
) {
  callEndedHandler = handler;
}

/**
 * Unregister the call ended handler
 */
export function unregisterCallEndedHandler() {
  callEndedHandler = null;
}

/**
 * Clean up all call socket handlers
 */
export function cleanupCallSocketHandlers() {
  // Remove both old and new event names from main socket
  socket.off("call:incoming");
  socket.off("incomingCall");
  socket.off("call:accepted");
  socket.off("callAccepted");
  socket.off("call:rejected");
  socket.off("callRejected");
  socket.off("call:ended");
  socket.off("callEnded");

  // Remove both old and new event names from call socket if it exists
  if (callSocket) {
    callSocket.off("call:incoming");
    callSocket.off("incomingCall");
    callSocket.off("call:accepted");
    callSocket.off("callAccepted");
    callSocket.off("call:rejected");
    callSocket.off("callRejected");
    callSocket.off("call:ended");
    callSocket.off("callEnded");
  }

  // Remove custom event listener
  if (typeof window !== "undefined") {
    // We can't directly remove the anonymous function, so we need to create a no-op function
    // that will be used to remove all call:incoming event listeners
    window.removeEventListener("call:incoming", () => {});
    console.log("Attempted to remove call:incoming custom event listeners");

    // A more reliable approach is to create a new custom event to signal cleanup
    window.dispatchEvent(new CustomEvent("call:cleanup"));
    console.log("Dispatched call:cleanup event to signal handlers to clean up");
  }

  incomingCallHandler = null;
  callAcceptedHandler = null;
  callRejectedHandler = null;
  callEndedHandler = null;

  console.log("Cleaned up all call socket handlers from both sockets");
}

/**
 * Export the function to manually register socket event handlers
 * This can be called from components that need to ensure handlers are registered
 */
export function ensureCallSocketHandlersRegistered() {
  const accessToken = useAuthStore.getState().accessToken;
  if (!accessToken) {
    console.warn("Cannot ensure call handlers are registered: No auth token");
    return;
  }

  // Use a flag to prevent multiple simultaneous reconnection attempts
  if ((window as any).__ensureHandlersInProgress) {
    console.log(
      "Handler registration already in progress, skipping duplicate call",
    );
    return;
  }

  (window as any).__ensureHandlersInProgress = true;

  // Check if either socket is connected
  const mainSocketConnected = socket.connected;
  const callSocketConnected = callSocket && callSocket.connected;

  if (!mainSocketConnected || !callSocketConnected) {
    console.log(
      "At least one socket not connected, setting up sockets with token",
    );

    // Set up both sockets
    if (!mainSocketConnected) {
      setupSocket(accessToken);
    }

    if (!callSocketConnected) {
      setupCallSocket(accessToken);
    }

    // Wait a bit for the connections to establish
    setTimeout(() => {
      const mainReconnected = socket.connected;
      const callReconnected = callSocket && callSocket.connected;

      if (mainReconnected || callReconnected) {
        console.log("At least one socket connected, registering handlers");
        registerSocketEventHandlers();
      } else {
        console.warn("Sockets still not connected after setup attempt");
      }

      // Reset the flag
      (window as any).__ensureHandlersInProgress = false;
    }, 1000);
  } else {
    // Both sockets are already connected, just register handlers
    console.log("Both sockets already connected, registering handlers");
    registerSocketEventHandlers();

    // Reset the flag
    (window as any).__ensureHandlersInProgress = false;
  }
}
