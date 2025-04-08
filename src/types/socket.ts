// types/socket.ts
import { User } from "./base";

// Các loại dữ liệu cụ thể cho từng loại message
export interface ForceLogoutData {
  reason: string;
  deviceId?: string;
}

export interface NotificationData {
  id: string;
  title: string;
  body: string;
  type: string;
  referenceId?: string;
}

export interface UpdateData {
  type: string;
  version: string;
  url?: string;
}

export interface UserDataUpdateData {
  user: User;
  updateType: "profile" | "settings" | "basicInfo" | "all";
}

// Union type cho data của các loại message
export type SocketMessageData =
  | ForceLogoutData
  | NotificationData
  | UpdateData
  | UserDataUpdateData
  | Record<string, unknown>;

// Interface cơ bản cho tất cả các loại message
export interface SocketMessage {
  type: "forceLogout" | "notification" | "update" | "userDataUpdate"; // Các loại message từ server
  message: string;
  timestamp: number;
  data?: SocketMessageData;
}

// Interface cụ thể cho từng loại message
export interface ForceLogoutMessage extends SocketMessage {
  type: "forceLogout";
  data: ForceLogoutData;
}

export interface NotificationMessage extends SocketMessage {
  type: "notification";
  data: NotificationData;
}

export interface UpdateMessage extends SocketMessage {
  type: "update";
  data: UpdateData;
}

export interface UserDataUpdateMessage extends SocketMessage {
  type: "userDataUpdate";
  data: UserDataUpdateData;
}

// Type guard functions
export function isForceLogoutMessage(
  message: SocketMessage,
): message is ForceLogoutMessage {
  return message.type === "forceLogout";
}

export function isNotificationMessage(
  message: SocketMessage,
): message is NotificationMessage {
  return message.type === "notification";
}

export function isUpdateMessage(
  message: SocketMessage,
): message is UpdateMessage {
  return message.type === "update";
}

export function isUserDataUpdateMessage(
  message: SocketMessage,
): message is UserDataUpdateMessage {
  return message.type === "userDataUpdate";
}

export interface SocketAuth {
  token: string;
}
