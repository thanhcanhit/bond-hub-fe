import { state } from "./state";
import { getCurrentRoomId } from "./state";

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
    // Create producer
    const producer = await state.sendTransport.produce({
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

    // Check if this is an AwaitQueueStoppedError
    if (
      error &&
      (error.name === "AwaitQueueStoppedError" ||
        (error.message && error.message.includes("queue stopped")))
    ) {
      console.warn(
        `[WEBRTC] Caught AwaitQueueStoppedError while producing ${kind}, attempting recovery`,
      );

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

    throw error;
  }
}
