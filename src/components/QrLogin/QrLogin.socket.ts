import { Socket } from "socket.io-client";
import { QrStatusData } from "@/types/qrCode";

// Define a type for socket data that can be in various formats
type SocketData = QrStatusData | QrStatusData[] | string | unknown;

/**
 * Subscribes to QR code status events on the socket
 * @param socket The socket.io client instance
 * @param qrToken The QR token to subscribe to
 * @param handleQrStatus Callback function to handle QR status updates
 */
export const subscribeToQrEvents = (
  socket: Socket,
  qrToken: string,
  handleQrStatus: (data: QrStatusData) => void,
) => {
  if (!socket || !qrToken) return;

  // Format 1: qr-status-{token}
  console.log(`Subscribing to qr-status-${qrToken} events`);
  socket.on(`qr-status-${qrToken}`, (data: SocketData) => {
    console.log(`Received qr-status-${qrToken} event:`, data);
    try {
      // Nếu data là mảng, lấy phần tử đầu tiên
      const processedData = Array.isArray(data) ? data[0] : data;
      console.log(`Processed data:`, processedData);

      // Nếu data là string, thử parse JSON
      if (typeof processedData === "string") {
        try {
          const parsedData = JSON.parse(processedData);
          console.log(`Parsed JSON data:`, parsedData);
          handleQrStatus(parsedData);
          return;
        } catch (e) {
          console.warn(`Failed to parse string data as JSON:`, e);
        }
      }

      handleQrStatus(processedData);
    } catch (error) {
      console.error(`Error processing qr-status-${qrToken} event:`, error);
    }
  });

  // Format 2: status-{token} (without qr- prefix)
  console.log(`Subscribing to status-${qrToken} events`);
  socket.on(`status-${qrToken}`, (data: SocketData) => {
    console.log(`Received status-${qrToken} event:`, data);
    try {
      // Nếu data là mảng, lấy phần tử đầu tiên
      const processedData = Array.isArray(data) ? data[0] : data;
      console.log(`Processed data:`, processedData);

      // Nếu data là string, thử parse JSON
      if (typeof processedData === "string") {
        try {
          const parsedData = JSON.parse(processedData);
          console.log(`Parsed JSON data:`, parsedData);
          handleQrStatus(parsedData);
          return;
        } catch (e) {
          console.warn(`Failed to parse string data as JSON:`, e);
        }
      }

      handleQrStatus(processedData);
    } catch (error) {
      console.error(`Error processing status-${qrToken} event:`, error);
    }
  });

  // Format 3: just the token as event name
  console.log(`Subscribing to ${qrToken} events`);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  socket.on(`${qrToken}`, (data: any) => {
    console.log(`Received ${qrToken} event:`, data);
    try {
      // Nếu data là mảng, lấy phần tử đầu tiên
      const processedData = Array.isArray(data) ? data[0] : data;
      console.log(`Processed data:`, processedData);

      // Nếu data là string, thử parse JSON
      if (typeof processedData === "string") {
        try {
          const parsedData = JSON.parse(processedData);
          console.log(`Parsed JSON data:`, parsedData);
          handleQrStatus(parsedData);
          return;
        } catch (e) {
          console.warn(`Failed to parse string data as JSON:`, e);
        }
      }

      handleQrStatus(processedData);
    } catch (error) {
      console.error(`Error processing ${qrToken} event:`, error);
    }
  });
};

/**
 * Unsubscribes from QR code status events on the socket
 * @param socket The socket.io client instance
 * @param qrToken The QR token to unsubscribe from
 */
export const unsubscribeFromQrEvents = (socket: Socket, qrToken: string) => {
  if (!socket || !qrToken) return;

  console.log(`Unsubscribing from all qrToken events: ${qrToken}`);
  socket.off(`qr-status-${qrToken}`);
  socket.off(`status-${qrToken}`);
  socket.off(`${qrToken}`);
};

/**
 * Initializes a socket connection with debug logging
 * @param socket The socket.io client instance
 */
export const initializeSocketDebugListeners = (socket: Socket) => {
  // Listen for all events (debug)
  socket.onAny((event, ...args) => {
    console.log(`Received event: ${event}`, args);
  });

  // Log socket connection events
  socket.on("connect", () => {
    console.log("Socket connected with ID:", socket.id);
  });

  socket.on("disconnect", (reason) => {
    console.log("Socket disconnected:", reason);
  });

  socket.on("connect_error", (error) => {
    console.error("Socket connection error:", error);
  });

  socket.on("error", (error) => {
    console.error("Socket error:", error);
  });
};
