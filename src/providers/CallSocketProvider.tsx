"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { io, Socket } from "socket.io-client";
import { useAuthStore } from "@/stores/authStore";
import { toast } from "sonner";
import dynamic from "next/dynamic";
import { setupSocket, setupCallSocket } from "@/lib/socket";

// Dynamically import CallManager with no SSR
const CallManager = dynamic(() => import("@/components/call/CallManager"), {
  ssr: false,
});

// Define context for call socket
interface CallSocketContextType {
  callSocket: Socket | null;
  isConnected: boolean;
}

const CallSocketContext = createContext<CallSocketContextType>({
  callSocket: null,
  isConnected: false,
});

// Hook to use call socket in components
export const useCallSocket = () => useContext(CallSocketContext);

interface CallSocketProviderProps {
  children: ReactNode;
}

export function CallSocketProvider({ children }: CallSocketProviderProps) {
  const [callSocket, setCallSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const { isAuthenticated, accessToken, currentUser } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated || !accessToken || !currentUser) {
      return;
    }

    // First, set up the main socket connection
    console.log("[CallSocketProvider] Setting up main socket connection");
    setupSocket(accessToken);

    // Connect to call namespace
    const socketUrl = `${process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3000"}/call`;
    console.log(
      `[CallSocketProvider] Connecting to call socket at ${socketUrl}`,
    );
    console.log(
      `[CallSocketProvider] Using token: ${accessToken ? "Token exists" : "No token"}`,
    );
    console.log(
      `[CallSocketProvider] Current user ID: ${currentUser?.id || "Unknown"}`,
    );

    // Set up call socket using the setupCallSocket function
    setupCallSocket(accessToken);

    // Get the call socket from the global variable
    const socket = callSocket;

    // Initialize call socket handlers
    import("@/utils/callSocketHandler").then(({ initCallSocketHandlers }) => {
      console.log("[CallSocketProvider] Initializing call socket handlers");
      initCallSocketHandlers();
    });

    // Store socket in state
    setCallSocket(socket);
    setIsConnected(socket?.connected || false);

    // Set up event listeners if socket exists
    if (socket) {
      socket.on("connect", () => {
        console.log(
          "[CallSocketProvider] Connected to call socket server with ID:",
          socket.id,
        );
        setIsConnected(true);
      });

      socket.on("disconnect", (reason) => {
        console.log(
          "[CallSocketProvider] Disconnected from call socket server. Reason:",
          reason,
        );
        setIsConnected(false);
      });

      socket.on("connect_error", (error) => {
        console.error("[CallSocketProvider] Connection error:", error);
        setIsConnected(false);
      });
    }

    // Set up a periodic check to ensure sockets are connected
    const checkInterval = setInterval(() => {
      // Ensure main socket is connected
      setupSocket(accessToken);

      // Ensure call socket is connected
      setupCallSocket(accessToken);
    }, 30000); // Check every 30 seconds

    // Cleanup on unmount
    return () => {
      console.log("[CallSocketProvider] Cleaning up socket connection");
      clearInterval(checkInterval);
      if (socket) {
        socket.off("connect");
        socket.off("disconnect");
        socket.off("connect_error");
      }
    };
  }, [isAuthenticated, accessToken, currentUser]);

  return (
    <CallSocketContext.Provider value={{ callSocket, isConnected }}>
      {children}
      {isAuthenticated && <CallManager />}
    </CallSocketContext.Provider>
  );
}
