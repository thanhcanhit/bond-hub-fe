import { Device } from "mediasoup-client";
import { state } from "./state";

/**
 * Consume a producer
 * @param producerId ID of the producer to consume
 * @param kind Kind of media (audio or video)
 * @returns Promise that resolves when consumer is set up
 */
export async function consume(producerId: string, kind: string): Promise<void> {
  return new Promise<void>((resolve) => {
    if (!state.recvTransport) {
      console.error("[WEBRTC] Receive transport not created");
      resolve(); // Resolve instead of reject to prevent call from failing
      return;
    }

    if (!state.socket) {
      console.error("[WEBRTC] Socket not connected");
      resolve(); // Resolve instead of reject to prevent call from failing
      return;
    }

    // Add a timeout for consume
    const timeout = setTimeout(() => {
      console.error(`[WEBRTC] Timeout consuming producer ${producerId}`);
      resolve(); // Resolve instead of reject to prevent call from failing
    }, 10000);

    // Check if device is initialized
    if (!state.device) {
      clearTimeout(timeout);
      console.error("[WEBRTC] Device not initialized");

      // Try to recreate the device if possible
      try {
        console.log("[WEBRTC] Attempting to recreate device for consume");

        // Try to get stored RTP capabilities
        const storedCapabilities = sessionStorage.getItem("rtpCapabilities");
        if (storedCapabilities) {
          try {
            console.log(
              "[WEBRTC] Found stored RTP capabilities, recreating device",
            );
            const rtpCapabilities = JSON.parse(storedCapabilities);

            // Create a new device
            state.device = new Device();

            // Load the device with stored capabilities
            state.device
              .load({ routerRtpCapabilities: rtpCapabilities })
              .then(() => {
                console.log(
                  "[WEBRTC] Successfully recreated device with stored capabilities",
                );

                // Now try to consume again
                if (state.socket && state.device && state.recvTransport) {
                  try {
                    console.log(
                      "[WEBRTC] Retrying consume after device recreation",
                    );

                    state.socket.emit(
                      "consume",
                      {
                        producerId,
                        rtpCapabilities: state.device.rtpCapabilities,
                      },
                      async (response: any) => {
                        clearTimeout(timeout);

                        if (!response) {
                          console.error(
                            `[WEBRTC] No response received for consume request for producer ${producerId}`,
                          );
                          resolve(); // Resolve instead of reject to prevent call from failing
                          return;
                        }

                        if (response.error) {
                          console.error(
                            `[WEBRTC] Error consuming producer ${producerId}:`,
                            response.error,
                          );
                          resolve(); // Resolve instead of reject to prevent call from failing
                          return;
                        }

                        try {
                          await handleConsumerSetup(response, producerId, kind);
                          resolve();
                        } catch (error) {
                          console.error(
                            `[WEBRTC] Error in consumer setup:`,
                            error,
                          );
                          resolve(); // Resolve instead of reject to prevent call from failing
                        }
                      },
                    );
                  } catch (error) {
                    console.error(`[WEBRTC] Error in consumer setup:`, error);
                    resolve(); // Resolve instead of reject to prevent call from failing
                  }
                }
              })
              .catch((loadError) => {
                console.error(
                  "[WEBRTC] Error loading device with stored capabilities:",
                  loadError,
                );
                resolve(); // Resolve instead of reject to prevent call from failing
              });

            // Return early since we're handling this asynchronously
            return;
          } catch (parseError) {
            console.error(
              "[WEBRTC] Error parsing stored RTP capabilities:",
              parseError,
            );
            resolve(); // Resolve instead of reject to prevent call from failing
            return;
          }
        } else {
          console.error(
            "[WEBRTC] No stored RTP capabilities available for device recreation",
          );
          resolve(); // Resolve instead of reject to prevent call from failing
          return;
        }
      } catch (deviceError) {
        console.error(
          "[WEBRTC] Failed to recreate device for consume:",
          deviceError,
        );
        resolve(); // Resolve instead of reject to prevent call from failing
        return;
      }
    }

    // Ensure rtpCapabilities exists
    if (!state.device.rtpCapabilities) {
      clearTimeout(timeout);
      console.error("[WEBRTC] Device has no RTP capabilities");
      resolve(); // Resolve instead of reject to prevent call from failing
      return;
    }

    state.socket.emit(
      "consume",
      {
        producerId,
        rtpCapabilities: state.device.rtpCapabilities,
      },
      async (response: any) => {
        clearTimeout(timeout);

        if (!response) {
          console.error(
            `[WEBRTC] No response received for consume request for producer ${producerId}`,
          );
          resolve(); // Resolve instead of reject to prevent call from failing
          return;
        }

        if (response.error) {
          console.error(
            `[WEBRTC] Error consuming producer ${producerId}:`,
            response.error,
          );
          // Resolve instead of reject to prevent call from failing
          resolve();
          return;
        }

        try {
          await handleConsumerSetup(response, producerId, kind);
          resolve();
        } catch (error) {
          console.error(`[WEBRTC] Error in consumer setup:`, error);
          resolve(); // Resolve instead of reject to prevent call from failing
        }
      },
    );
  });
}

/**
 * Handle consumer setup after receiving consume response
 * @param response Response from consume request
 * @param producerId ID of the producer being consumed
 * @param kind Kind of media (audio or video)
 */
export async function handleConsumerSetup(
  response: any,
  producerId: string,
  kind: string,
): Promise<void> {
  try {
    // Create consumer
    const consumer = await state.recvTransport!.consume({
      id: response.id,
      producerId,
      kind,
      rtpParameters: response.rtpParameters,
    });

    console.log(`[WEBRTC] Created ${kind} consumer with ID: ${consumer.id}`);

    // Store the consumer
    state.consumers.set(consumer.id, consumer);

    // Handle consumer events
    consumer.on("transportclose", () => {
      console.log(`[WEBRTC] Consumer transport closed: ${consumer.id}`);
      consumer.close();
      state.consumers.delete(consumer.id);
      state.remoteStreams.delete(consumer.id);

      // Notify UI that stream has been removed
      window.dispatchEvent(
        new CustomEvent("webrtc:streamRemoved", {
          detail: {
            id: consumer.id,
            kind,
            timestamp: new Date().toISOString(),
          },
        }),
      );
    });

    // Create a MediaStream from the consumer's track
    const stream = new (window.MediaStream || window.webkitMediaStream)();
    stream.addTrack(consumer.track);

    // Store the stream
    state.remoteStreams.set(consumer.id, stream);

    // Notify UI that a new stream is available
    window.dispatchEvent(
      new CustomEvent("webrtc:newStream", {
        detail: {
          id: consumer.id,
          stream,
          kind,
          timestamp: new Date().toISOString(),
        },
      }),
    );

    // Resume the consumer
    await consumer.resume();
    console.log(`[WEBRTC] Resumed ${kind} consumer: ${consumer.id}`);

    // Notify server that we're ready to receive media
    state.socket!.emit("resumeConsumer", { consumerId: consumer.id });
  } catch (error: any) {
    console.error(
      `[WEBRTC] Error setting up consumer for producer ${producerId}:`,
      error,
    );

    // Check if this is an AwaitQueueStoppedError
    if (
      error &&
      (error.name === "AwaitQueueStoppedError" ||
        (error.message && error.message.includes("queue stopped")))
    ) {
      console.warn(
        `[WEBRTC] Caught AwaitQueueStoppedError while consuming producer ${producerId}, attempting recovery`,
      );

      // Get current room ID and call ID from session storage
      const roomId = sessionStorage.getItem("callRoomId");
      const callId = sessionStorage.getItem("currentCallId");

      // Dispatch an event to notify about the error
      try {
        // First dispatch the specific consumer error event
        window.dispatchEvent(
          new CustomEvent("webrtc:consumerError", {
            detail: {
              producerId,
              kind,
              error: error.message || "AwaitQueueStoppedError",
              timestamp: new Date().toISOString(),
              recovery: true,
              roomId,
              callId,
            },
          }),
        );

        // Then dispatch a more general call error event that UI components can listen for
        window.dispatchEvent(
          new CustomEvent("call:error", {
            detail: {
              error: "Không thể kết nối với người dùng khác trong cuộc gọi",
              code: "AWAIT_QUEUE_STOPPED",
              timestamp: new Date().toISOString(),
              roomId,
              callId,
            },
          }),
        );

        // Also try to broadcast the error to all open windows using BroadcastChannel
        try {
          const callChannel = new BroadcastChannel("call_events");
          callChannel.postMessage({
            type: "CALL_ERROR",
            error: "Không thể kết nối với người dùng khác trong cuộc gọi",
            code: "AWAIT_QUEUE_STOPPED",
            timestamp: new Date().toISOString(),
            roomId,
            callId,
          });
          console.log("[WEBRTC] Broadcast CALL_ERROR message to all windows");
          callChannel.close();
        } catch (broadcastError) {
          console.error(
            "[WEBRTC] Error broadcasting call error:",
            broadcastError,
          );
        }
      } catch (eventError) {
        console.error("[WEBRTC] Error dispatching error events:", eventError);
      }

      // Don't throw the error to allow the call to continue
      return;
    }

    throw error;
  }
}
