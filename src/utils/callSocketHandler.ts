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
// Không sử dụng callAcceptedHandler vì backend không hỗ trợ sự kiện call:accepted
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

    // Just log the issue, don't try to reconnect
    console.log("Proceeding with handler registration anyway");
    registerSocketEventHandlers();
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
  // Không xử lý sự kiện call:accepted vì backend không hỗ trợ
  socket.off("call:rejected");
  socket.off("callRejected"); // Also remove old event name for backward compatibility
  socket.off("call:ended");
  socket.off("callEnded"); // Also remove old event name for backward compatibility
  socket.off("call:participant:joined"); // Add this to handle participant joined events

  // Remove any existing listeners from call socket if it exists
  if (callSocket) {
    callSocket.off("call:incoming");
    callSocket.off("incomingCall"); // Also remove old event name for backward compatibility
    // Không xử lý sự kiện call:accepted vì backend không hỗ trợ
    callSocket.off("call:rejected");
    callSocket.off("callRejected"); // Also remove old event name for backward compatibility
    callSocket.off("call:ended");
    callSocket.off("callEnded"); // Also remove old event name for backward compatibility
    callSocket.off("call:participant:joined"); // Add this to handle participant joined events
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

  // Không xử lý sự kiện call:accepted vì backend không hỗ trợ
  // Thay vào đó, sẽ sử dụng sự kiện call:participant:joined từ backend

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

  // Handle participant joined event - this is sent when a user joins a call
  const handleParticipantJoined = (data: {
    callId: string;
    userId: string;
    roomId: string;
  }) => {
    console.log("Call participant joined event received:", data);

    // Dispatch the participant joined event directly
    console.log("Dispatching call:participant:joined custom event");
    window.dispatchEvent(
      new CustomEvent("call:participant:joined", {
        detail: data,
      }),
    );

    // No need to convert to call:accepted anymore
    // Just log that we received and dispatched the event
    console.log(
      `User ${data.userId} joined call ${data.callId} in room ${data.roomId}`,
    );
  };

  // Listen for participant joined event on both sockets
  socket.on("call:participant:joined", handleParticipantJoined);

  if (callSocket) {
    callSocket.on("call:participant:joined", handleParticipantJoined);
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

// Không sử dụng registerCallAcceptedHandler và unregisterCallAcceptedHandler
// vì backend không hỗ trợ sự kiện call:accepted

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
  socket.off("call:participant:joined");

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
    callSocket.off("call:participant:joined");
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

  // Register handlers regardless of socket connection status
  console.log("Registering socket event handlers");
  registerSocketEventHandlers();

  // Reset the flag
  (window as any).__ensureHandlersInProgress = false;
}
