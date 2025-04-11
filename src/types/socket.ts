// types/socket.ts
export interface SocketMessage {
  type: "forceLogout" | "notification" | "update"; // Các loại message từ server
  message: string;
  timestamp: number;
}

export interface SocketAuth {
  token: string;
}
