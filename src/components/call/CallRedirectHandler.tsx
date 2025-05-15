"use client";

import { useEffect } from "react";

/**
 * Component that handles call redirects from sessionStorage
 * This is a recovery mechanism for when the normal navigation fails
 */
export default function CallRedirectHandler() {
  // Handle call events globally
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Handle participant joined events from backend
    const handleParticipantJoined = (event: Event) => {
      const customEvent = event as CustomEvent;
      const data = customEvent.detail;

      console.log("Global handler caught call:participant:joined event:", data);

      // If we have roomId, construct and store the call URL
      if (data.roomId) {
        // Determine if this is a video call (simple heuristic based on roomId format)
        // This is a fallback - ideally the call type would be included in the event data
        const isVideoCall = data.roomId.includes("video");
        const callUrl = isVideoCall
          ? `/video-call/${data.roomId}`
          : `/call/${data.roomId}`;

        // Create absolute URL
        const absoluteCallUrl = `${window.location.origin}${callUrl}`;

        try {
          sessionStorage.setItem("pendingCallRedirect", absoluteCallUrl);
          console.log(
            "Global handler stored call URL in sessionStorage from participant joined event:",
            absoluteCallUrl,
          );
        } catch (e) {
          console.error("Failed to store call URL in sessionStorage:", e);
        }
      }
    };

    // Listen for participant joined events
    window.addEventListener(
      "call:participant:joined",
      handleParticipantJoined as EventListener,
    );

    return () => {
      window.removeEventListener(
        "call:participant:joined",
        handleParticipantJoined as EventListener,
      );
    };
  }, []);

  // Check for pending redirects in sessionStorage
  useEffect(() => {
    // Only run in browser environment
    if (typeof window === "undefined") return;

    // Function to handle the redirect
    const checkPendingRedirect = () => {
      try {
        const pendingCallRedirect = sessionStorage.getItem(
          "pendingCallRedirect",
        );

        if (pendingCallRedirect) {
          console.log(`Found pending call redirect: ${pendingCallRedirect}`);

          // Clear the pending redirect first to prevent loops
          sessionStorage.removeItem("pendingCallRedirect");
          console.log("Cleared pendingCallRedirect from sessionStorage");

          // Check if we're already on a call page
          const currentPath = window.location.pathname;
          if (
            currentPath.includes("/call/") ||
            currentPath.includes("/video-call/")
          ) {
            console.log("Already on a call page, not redirecting");
            return;
          }

          // Extract the relative path if it's an absolute URL
          let redirectPath = pendingCallRedirect;
          try {
            const url = new URL(pendingCallRedirect);
            redirectPath = url.pathname + url.search + url.hash;
          } catch (e) {
            // Not a valid URL, assume it's already a relative path
          }

          console.log(`Redirecting to: ${redirectPath}`);

          // Use window.location for more reliable navigation
          window.location.href = pendingCallRedirect;
        }
      } catch (error) {
        console.error("Error handling call redirect:", error);
      }
    };

    // Check immediately
    checkPendingRedirect();

    // Also set up an interval to check periodically (as a safety net)
    const intervalId = setInterval(checkPendingRedirect, 2000);

    return () => {
      clearInterval(intervalId);
    };
  }, []);

  // This component doesn't render anything
  return null;
}
