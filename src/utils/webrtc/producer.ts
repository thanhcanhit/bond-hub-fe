import { state } from "./state";
import { getCurrentRoomId } from "./state";
import { isCleanupInProgress } from "./cleanup";

/**
 * Produce media track
 * @param kind Kind of media (audio or video)
 * @param track Media track to produce
 * @returns Producer ID
 */
export async function produce(
  kind: string,
  track: MediaStreamTrack,
): Promise<string> {
  // Check if cleanup is in progress
  if (isCleanupInProgress()) {
    console.warn(
      `[WEBRTC] Cannot produce ${kind} while cleanup is in progress`,
    );
    const fakeProducerId = `cleanup-${Date.now()}`;
    console.log(
      `[WEBRTC] Created fake producer ID during cleanup: ${fakeProducerId}`,
    );

    // Dispatch an event to notify about the error
    try {
      window.dispatchEvent(
        new CustomEvent("webrtc:producerError", {
          detail: {
            kind,
            error: "Cannot produce while cleanup is in progress",
            timestamp: new Date().toISOString(),
            recovery: true,
            duringCleanup: true,
          },
        }),
      );
    } catch (eventError) {
      console.error(
        "[WEBRTC] Error dispatching webrtc:producerError event:",
        eventError,
      );
    }

    return fakeProducerId;
  }

  // Also check sessionStorage as a fallback
  try {
    const isCleaningUp =
      sessionStorage.getItem("webrtc_cleaning_up") === "true";
    if (isCleaningUp) {
      console.warn(
        `[WEBRTC] Cannot produce ${kind} while cleanup is in progress (from sessionStorage)`,
      );
      const fakeProducerId = `cleanup-storage-${Date.now()}`;
      return fakeProducerId;
    }
  } catch (storageError) {
    console.warn(
      "[WEBRTC] Error checking cleanup status from sessionStorage:",
      storageError,
    );
  }

  if (!state.sendTransport) {
    throw new Error("Send transport not created");
  }

  // Check if we already have a producer for this kind
  if (state.producers.has(kind)) {
    console.log(
      `[WEBRTC] Producer for ${kind} already exists, closing it first`,
    );
    try {
      const existingProducer = state.producers.get(kind);
      existingProducer.close();
      state.producers.delete(kind);
    } catch (error) {
      console.error(`[WEBRTC] Error closing existing ${kind} producer:`, error);
    }
  }

  console.log(`[WEBRTC] Producing ${kind} track: ${track.id}`);

  try {
    // Double-check that cleanup hasn't started during our execution
    if (isCleanupInProgress()) {
      console.warn(
        `[WEBRTC] Cleanup started while preparing to produce ${kind}`,
      );
      const fakeProducerId = `cleanup-during-${Date.now()}`;
      return fakeProducerId;
    }

    // Check if the transport is closed or closing
    if (state.sendTransport.closed) {
      console.warn(`[WEBRTC] Cannot produce ${kind} - transport is closed`);
      const fakeProducerId = `closed-transport-${Date.now()}`;
      return fakeProducerId;
    }

    // Add timeout protection for produce operation
    const producePromise = state.sendTransport.produce({
      track,
      encodings:
        kind === "video"
          ? [
              { maxBitrate: 100000 }, // Low quality
              { maxBitrate: 300000 }, // Medium quality
              { maxBitrate: 900000 }, // High quality
            ]
          : undefined,
      codecOptions:
        kind === "video"
          ? {
              videoGoogleStartBitrate: 1000,
            }
          : undefined,
      appData: { kind },
    });

    // Create a timeout promise
    const timeoutPromise = new Promise<any>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Timeout producing ${kind} after 8000ms`));
      }, 8000);
    });

    // Race the produce operation against the timeout
    const producer = await Promise.race([producePromise, timeoutPromise]);

    console.log(`[WEBRTC] ${kind} producer created with ID: ${producer.id}`);

    // Store the producer
    state.producers.set(kind, producer);

    // Handle producer events
    producer.on("transportclose", () => {
      console.log(`[WEBRTC] ${kind} producer transport closed`);
      producer.close();
      state.producers.delete(kind);
    });

    producer.on("trackended", () => {
      console.log(`[WEBRTC] ${kind} producer track ended`);

      // Notify the server that the producer has closed
      const roomId = getCurrentRoomId();
      if (roomId && state.socket) {
        state.socket.emit("producerClosed", {
          roomId,
          producerId: producer.id,
          kind,
        });
      }

      producer.close();
      state.producers.delete(kind);
    });

    return producer.id;
  } catch (error: any) {
    console.error(`[WEBRTC] Error producing ${kind}:`, error);

    // Check if cleanup started during our operation
    if (isCleanupInProgress()) {
      console.warn(
        `[WEBRTC] Cleanup started while producing ${kind}, this likely caused the error`,
      );
      const fakeProducerId = `cleanup-error-${Date.now()}`;

      // Dispatch an event to notify about the error
      try {
        window.dispatchEvent(
          new CustomEvent("webrtc:producerError", {
            detail: {
              kind,
              error: "Cleanup in progress during produce operation",
              timestamp: new Date().toISOString(),
              recovery: true,
              duringCleanup: true,
            },
          }),
        );
      } catch (eventError) {
        console.error(
          "[WEBRTC] Error dispatching cleanup error event:",
          eventError,
        );
      }

      return fakeProducerId;
    }

    // Check if this is an AwaitQueueStoppedError
    if (
      error &&
      (error.name === "AwaitQueueStoppedError" ||
        (error.message && error.message.includes("queue stopped")))
    ) {
      console.warn(
        `[WEBRTC] Caught AwaitQueueStoppedError while producing ${kind}, attempting recovery`,
      );

      // Set a flag in sessionStorage to indicate we've encountered this error
      try {
        // Store error details for debugging
        const queueErrors = JSON.parse(
          sessionStorage.getItem("queueStoppedErrors") || "[]",
        );
        queueErrors.push({
          timestamp: new Date().toISOString(),
          kind,
          location: "produce",
          error: error.message || "AwaitQueueStoppedError",
        });
        // Keep only the last 5 errors
        if (queueErrors.length > 5) {
          queueErrors.shift();
        }
        sessionStorage.setItem(
          "queueStoppedErrors",
          JSON.stringify(queueErrors),
        );
      } catch (storageError) {
        console.warn(
          "[WEBRTC] Error storing queue error details:",
          storageError,
        );
      }

      // Return a fake producer ID to avoid breaking the call flow
      // This allows the application to continue even if producing media fails
      const fakeProducerId = `error-${Date.now()}`;
      console.log(
        `[WEBRTC] Created fake producer ID for recovery: ${fakeProducerId}`,
      );

      // Dispatch an event to notify about the error
      try {
        window.dispatchEvent(
          new CustomEvent("webrtc:producerError", {
            detail: {
              kind,
              error: error.message || "AwaitQueueStoppedError",
              timestamp: new Date().toISOString(),
              recovery: true,
            },
          }),
        );
      } catch (eventError) {
        console.error(
          "[WEBRTC] Error dispatching webrtc:producerError event:",
          eventError,
        );
      }

      return fakeProducerId;
    }

    // Handle timeout errors
    if (error.message && error.message.includes("Timeout producing")) {
      console.warn(
        `[WEBRTC] Timeout while producing ${kind}, creating fake producer ID`,
      );
      const fakeProducerId = `timeout-${Date.now()}`;

      // Dispatch timeout event
      try {
        window.dispatchEvent(
          new CustomEvent("webrtc:producerTimeout", {
            detail: {
              kind,
              timestamp: new Date().toISOString(),
            },
          }),
        );
      } catch (eventError) {
        console.error("[WEBRTC] Error dispatching timeout event:", eventError);
      }

      return fakeProducerId;
    }

    // For any other errors, create a fake producer ID to avoid breaking the call flow
    const fakeProducerId = `unknown-error-${Date.now()}`;
    console.log(
      `[WEBRTC] Created fake producer ID for unknown error: ${fakeProducerId}`,
    );

    // Dispatch a generic error event
    try {
      window.dispatchEvent(
        new CustomEvent("webrtc:producerError", {
          detail: {
            kind,
            error: error.message || "Unknown error",
            timestamp: new Date().toISOString(),
            recovery: true,
          },
        }),
      );
    } catch (eventError) {
      console.error("[WEBRTC] Error dispatching error event:", eventError);
    }

    return fakeProducerId;
  }
}
