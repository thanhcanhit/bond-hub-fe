import { toast } from "sonner";

export interface CallEventHandlersProps {
  roomId: string;
  callId?: string | null;
  targetId?: string | null;
  setCallStatus: (
    status: "waiting" | "connecting" | "connected" | "rejected" | "ended",
  ) => void;
  callStatus: "waiting" | "connecting" | "connected" | "rejected" | "ended";
  initWebRTC: (forceConnect?: boolean) => Promise<void>;
  webrtcInitialized: boolean;
}

/**
 * Set up event handlers for call events
 */
export function setupCallEventHandlers({
  roomId,
  callId,
  targetId,
  setCallStatus,
  callStatus,
  initWebRTC,
  webrtcInitialized,
}: CallEventHandlersProps): () => void {
  // Handler for message events from other windows
  const handleMessage = (event: MessageEvent) => {
    if (!event.data || typeof event.data !== "object") return;

    console.log(
      "[CALL_EVENTS] Received message from another window:",
      event.data,
    );

    if (event.data.type === "CALL_ACCEPTED") {
      console.log("[CALL_EVENTS] Received CALL_ACCEPTED message");

      // If we're in waiting state, change to connecting
      if (callStatus === "waiting") {
        console.log(
          "[CALL_EVENTS] Changing call status from waiting to connecting due to CALL_ACCEPTED message",
        );
        setCallStatus("connecting");

        // Dispatch an event to notify that a participant has joined
        try {
          window.dispatchEvent(
            new CustomEvent("call:participant:joined", {
              detail: {
                roomId: roomId,
                userId: targetId,
                callId: callId,
                timestamp: new Date().toISOString(),
                accepted: true,
              },
            }),
          );
          console.log(
            "[CALL_EVENTS] Dispatched call:participant:joined event after CALL_ACCEPTED message",
          );

          // Also try to notify via BroadcastChannel
          try {
            const callChannel = new BroadcastChannel("call_events");
            callChannel.postMessage({
              type: "CALL_PARTICIPANT_JOINED",
              roomId: roomId,
              userId: targetId,
              callId: callId,
              timestamp: new Date().toISOString(),
            });
            console.log(
              "[CALL_EVENTS] Sent CALL_PARTICIPANT_JOINED message via BroadcastChannel",
            );
            callChannel.close();
          } catch (channelError) {
            console.error(
              "[CALL_EVENTS] Error sending message via BroadcastChannel:",
              channelError,
            );
          }
        } catch (eventError) {
          console.error("[CALL_EVENTS] Error dispatching event:", eventError);
        }

        // Initialize WebRTC connection if not already initialized
        setTimeout(() => {
          console.log(
            "[CALL_EVENTS] Initializing WebRTC after CALL_ACCEPTED message",
          );
          initWebRTC(true) // Force connect since we know the call has been accepted
            .catch((error) => {
              console.error("[CALL_EVENTS] Error initializing WebRTC:", error);
            });
        }, 300); // Reduced delay for faster connection
      }
    } else if (
      event.data.type === "CALL_CONNECTED" ||
      event.data.type === "CALL_PARTICIPANT_JOINED"
    ) {
      console.log(`[CALL_EVENTS] Received ${event.data.type} message`);

      // If we're in waiting or connecting state, change to connected
      if (callStatus === "waiting" || callStatus === "connecting") {
        console.log(
          `[CALL_EVENTS] Changing call status to connected due to ${event.data.type} message`,
        );
        setCallStatus("connected");

        // Notify the user
        toast.success("Kết nối cuộc gọi thành công");

        // Initialize WebRTC if not already initialized
        if (!webrtcInitialized) {
          console.log(
            `[CALL_EVENTS] Initializing WebRTC after ${event.data.type} message`,
          );
          setTimeout(() => {
            initWebRTC(true) // Force connect
              .catch((error) => {
                console.error(
                  `[CALL_EVENTS] Error initializing WebRTC after ${event.data.type} message:`,
                  error,
                );
              });
          }, 300);
        }
      }
    }
  };

  // Handler for call accepted events
  const handleCallAccepted = (event: Event) => {
    const customEvent = event as CustomEvent;
    console.log(
      "[CALL_EVENTS] Received call:accepted event:",
      customEvent.detail,
    );

    // If we're in waiting state, change to connecting
    if (callStatus === "waiting") {
      console.log(
        "[CALL_EVENTS] Changing call status from waiting to connecting due to call:accepted event",
      );
      setCallStatus("connecting");

      // Dispatch an event to notify that a participant has joined
      try {
        window.dispatchEvent(
          new CustomEvent("call:participant:joined", {
            detail: {
              roomId: roomId,
              userId: targetId,
              callId: callId,
              timestamp: new Date().toISOString(),
              accepted: true,
            },
          }),
        );
        console.log(
          "[CALL_EVENTS] Dispatched call:participant:joined event after call:accepted event",
        );

        // Also try to notify via BroadcastChannel
        try {
          const callChannel = new BroadcastChannel("call_events");
          callChannel.postMessage({
            type: "CALL_PARTICIPANT_JOINED",
            roomId: roomId,
            userId: targetId,
            callId: callId,
            timestamp: new Date().toISOString(),
          });
          console.log(
            "[CALL_EVENTS] Sent CALL_PARTICIPANT_JOINED message via BroadcastChannel",
          );
          callChannel.close();
        } catch (channelError) {
          console.error(
            "[CALL_EVENTS] Error sending message via BroadcastChannel:",
            channelError,
          );
        }
      } catch (eventError) {
        console.error("[CALL_EVENTS] Error dispatching event:", eventError);
      }

      // Initialize WebRTC connection if not already initialized
      setTimeout(() => {
        console.log(
          "[CALL_EVENTS] Initializing WebRTC after call:accepted event",
        );
        initWebRTC(true) // Force connect since we know the call has been accepted
          .catch((error) => {
            console.error(
              "[CALL_EVENTS] Error initializing WebRTC after call:accepted event:",
              error,
            );
          });
      }, 300); // Reduced delay for faster connection
    }
  };

  // Handler for WebRTC room joined events
  const handleRoomJoined = (event: Event) => {
    const customEvent = event as CustomEvent;
    console.log(
      "[CALL_EVENTS] Received webrtc:roomJoined event:",
      customEvent.detail,
    );

    // If we're in waiting state, change to connecting
    if (callStatus === "waiting") {
      console.log(
        "[CALL_EVENTS] Changing call status from waiting to connecting due to webrtc:roomJoined event",
      );
      setCallStatus("connecting");

      // Initialize WebRTC if not already initialized
      if (!webrtcInitialized) {
        console.log(
          "[CALL_EVENTS] Initializing WebRTC after room joined event",
        );
        setTimeout(() => {
          initWebRTC(true) // Force connect since we know the room has been joined
            .catch((error) => {
              console.error(
                "[CALL_EVENTS] Error initializing WebRTC after room joined event:",
                error,
              );
            });
        }, 300); // Reduced delay for faster connection
      }
    }
    // If we're in connecting state, change to connected
    else if (callStatus === "connecting") {
      console.log(
        "[CALL_EVENTS] Changing call status from connecting to connected due to webrtc:roomJoined event",
      );
      setCallStatus("connected");

      // Notify the user
      toast.success("Kết nối cuộc gọi thành công");

      // Also try to notify via BroadcastChannel
      try {
        const callChannel = new BroadcastChannel("call_events");
        callChannel.postMessage({
          type: "CALL_CONNECTED",
          roomId: roomId,
          timestamp: new Date().toISOString(),
        });
        console.log(
          "[CALL_EVENTS] Sent CALL_CONNECTED message via BroadcastChannel",
        );
        callChannel.close();
      } catch (channelError) {
        console.error(
          "[CALL_EVENTS] Error sending message via BroadcastChannel:",
          channelError,
        );
      }
    }
  };

  // Handler for RTP capabilities received events
  const handleRtpCapabilitiesReceived = (event: Event) => {
    const customEvent = event as CustomEvent;
    console.log(
      "[CALL_EVENTS] Received webrtc:rtpCapabilitiesReceived event:",
      customEvent.detail,
    );

    // If we're in waiting state, change to connecting
    if (callStatus === "waiting") {
      console.log(
        "[CALL_EVENTS] Changing call status from waiting to connecting due to webrtc:rtpCapabilitiesReceived event",
      );
      setCallStatus("connecting");

      // Initialize WebRTC if not already initialized
      if (!webrtcInitialized) {
        console.log(
          "[CALL_EVENTS] Initializing WebRTC after RTP capabilities received event",
        );
        setTimeout(() => {
          initWebRTC(true) // Force connect since we know RTP capabilities have been received
            .catch((error) => {
              console.error(
                "[CALL_EVENTS] Error initializing WebRTC after RTP capabilities received:",
                error,
              );
            });
        }, 500);
      }
    }
  };

  // Handler for participant joined events
  const handleParticipantJoined = (event: Event) => {
    const customEvent = event as CustomEvent;
    const data = customEvent.detail;

    console.log(
      `[CALL_EVENTS] Received call:participant:joined event with data:`,
      data,
    );

    // Check if this event is for our room
    if (data.roomId && data.roomId !== roomId) {
      console.log(
        `[CALL_EVENTS] Ignoring participant joined event for different room: ${data.roomId}`,
      );
      return;
    }

    // If we're in waiting state, change to connecting first
    if (callStatus === "waiting") {
      console.log(
        `[CALL_EVENTS] Changing call status from waiting to connecting after participant joined`,
      );
      setCallStatus("connecting");

      // Initialize WebRTC if not already initialized
      if (!webrtcInitialized) {
        console.log(
          "[CALL_EVENTS] Initializing WebRTC after participant joined event",
        );
        setTimeout(() => {
          initWebRTC(true) // Force connect since we know a participant has joined
            .catch((error) => {
              console.error(
                "[CALL_EVENTS] Error initializing WebRTC after participant joined:",
                error,
              );
            });
        }, 300); // Reduced delay for faster connection
      }
    }
    // If we're in connecting state, change to connected
    else if (callStatus === "connecting") {
      console.log(
        `[CALL_EVENTS] Changing call status from connecting to connected after participant joined`,
      );
      setCallStatus("connected");

      // Notify the user
      toast.success("Người dùng khác đã tham gia cuộc gọi");
    }
  };

  // Add event listeners
  window.addEventListener("message", handleMessage);
  window.addEventListener("call:accepted", handleCallAccepted as EventListener);
  window.addEventListener(
    "webrtc:roomJoined",
    handleRoomJoined as EventListener,
  );
  window.addEventListener(
    "webrtc:rtpCapabilitiesReceived",
    handleRtpCapabilitiesReceived as EventListener,
  );
  window.addEventListener(
    "call:participant:joined",
    handleParticipantJoined as EventListener,
  );

  // Return cleanup function
  return () => {
    window.removeEventListener("message", handleMessage);
    window.removeEventListener(
      "call:accepted",
      handleCallAccepted as EventListener,
    );
    window.removeEventListener(
      "webrtc:roomJoined",
      handleRoomJoined as EventListener,
    );
    window.removeEventListener(
      "webrtc:rtpCapabilitiesReceived",
      handleRtpCapabilitiesReceived as EventListener,
    );
    window.removeEventListener(
      "call:participant:joined",
      handleParticipantJoined as EventListener,
    );
  };
}
