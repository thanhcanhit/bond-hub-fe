import { create } from "zustand";
import {
  initiateCall,
  acceptCall,
  endCall,
  rejectCall,
  getActiveCall,
} from "@/actions/call.action";
import { useAuthStore } from "./authStore";

interface CallState {
  // State
  isInCall: boolean;
  isMuted: boolean;
  isCameraOff: boolean;
  currentCall: {
    id: string;
    roomId: string;
    type: "AUDIO" | "VIDEO";
    targetId: string;
    targetType: "USER" | "GROUP";
  } | null;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  startCall: (receiverId: string, type: "AUDIO" | "VIDEO") => Promise<boolean>;
  startGroupCall: (
    groupId: string,
    type: "AUDIO" | "VIDEO",
  ) => Promise<boolean>;
  acceptCall: (callId: string) => Promise<boolean>;
  rejectIncomingCall: (callId: string) => Promise<boolean>;
  endCall: () => Promise<boolean>;
  toggleMute: () => Promise<void>;
  toggleCamera: () => Promise<void>;
  setLocalStream: (stream: MediaStream | null) => void;
  setRemoteStream: (stream: MediaStream | null) => void;
  checkActiveCall: () => Promise<boolean>;
  resetCallState: () => void;
}

export const useCallStore = create<CallState>((set, get) => ({
  // Initial state
  isInCall: false,
  isMuted: false,
  isCameraOff: false,
  currentCall: null,
  localStream: null,
  remoteStream: null,
  isLoading: false,
  error: null,

  // Actions
  startCall: async (receiverId: string, type: "AUDIO" | "VIDEO") => {
    try {
      set({ isLoading: true, error: null });

      // Get token from auth store
      const token = useAuthStore.getState().accessToken;
      if (!token) {
        set({
          isLoading: false,
          error: "Bạn cần đăng nhập để thực hiện cuộc gọi",
        });
        return false;
      }

      // Call the action
      const result = await initiateCall(receiverId, type, token);

      if (result.success) {
        set({
          isInCall: true,
          currentCall: {
            id: result.callId,
            roomId: result.roomId,
            type: result.type,
            targetId: receiverId,
            targetType: "USER",
          },
          isLoading: false,
        });
        return true;
      } else {
        set({
          isLoading: false,
          error: result.message || "Không thể khởi tạo cuộc gọi",
        });
        return false;
      }
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : "Lỗi không xác định",
      });
      return false;
    }
  },

  startGroupCall: async (groupId: string, type: "AUDIO" | "VIDEO") => {
    try {
      set({ isLoading: true, error: null });

      // Get token from auth store
      const token = useAuthStore.getState().accessToken;
      if (!token) {
        set({
          isLoading: false,
          error: "Bạn cần đăng nhập để thực hiện cuộc gọi nhóm",
        });
        return false;
      }

      // Call the action
      const { initiateGroupCall } = await import("@/actions/call.action");
      const result = await initiateGroupCall(groupId, type, token);

      if (result.success) {
        set({
          isInCall: true,
          currentCall: {
            id: result.callId,
            roomId: result.roomId,
            type: result.type,
            targetId: groupId,
            targetType: "GROUP",
          },
          isLoading: false,
        });
        return true;
      } else {
        set({
          isLoading: false,
          error: result.message || "Không thể khởi tạo cuộc gọi nhóm",
        });
        return false;
      }
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : "Lỗi không xác định",
      });
      return false;
    }
  },

  acceptCall: async (callId: string) => {
    try {
      set({ isLoading: true, error: null });

      // Get token from auth store
      const token = useAuthStore.getState().accessToken;
      if (!token) {
        set({
          isLoading: false,
          error: "Bạn cần đăng nhập để tham gia cuộc gọi",
        });
        return false;
      }

      // Call the action
      const result = await acceptCall(callId, token);

      if (result.success) {
        set({
          isInCall: true,
          isLoading: false,
        });
        return true;
      } else {
        set({
          isLoading: false,
          error: result.message || "Không thể tham gia cuộc gọi",
        });
        return false;
      }
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : "Lỗi không xác định",
      });
      return false;
    }
  },

  rejectIncomingCall: async (callId: string) => {
    try {
      set({ isLoading: true, error: null });

      // Get token from auth store
      const token = useAuthStore.getState().accessToken;
      if (!token) {
        set({ isLoading: false });
        return false;
      }

      // Call the action
      const result = await rejectCall(callId, token);

      set({ isLoading: false });
      return result.success;
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : "Lỗi không xác định",
      });
      return false;
    }
  },

  endCall: async () => {
    try {
      set({ isLoading: true, error: null });

      // Get token and current call
      const token = useAuthStore.getState().accessToken;
      const currentCall = get().currentCall;

      if (!token || !currentCall) {
        get().resetCallState();
        return true;
      }

      // Stop media streams
      const localStream = get().localStream;
      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
      }

      // Call the action
      const result = await endCall(currentCall.id, token);

      // Reset call state regardless of result
      get().resetCallState();

      return result.success;
    } catch (error) {
      get().resetCallState();
      return false;
    }
  },

  toggleMute: async () => {
    const localStream = get().localStream;
    const isMuted = get().isMuted;

    if (localStream) {
      localStream.getAudioTracks().forEach((track) => {
        track.enabled = isMuted; // Toggle: if muted, enable; if not muted, disable
      });

      set({ isMuted: !isMuted });
    }
  },

  toggleCamera: async () => {
    const localStream = get().localStream;
    const isCameraOff = get().isCameraOff;

    if (localStream) {
      localStream.getVideoTracks().forEach((track) => {
        track.enabled = isCameraOff; // Toggle: if camera off, enable; if camera on, disable
      });

      set({ isCameraOff: !isCameraOff });
    }
  },

  setLocalStream: (stream) => {
    set({ localStream: stream });
  },

  setRemoteStream: (stream) => {
    set({ remoteStream: stream });
  },

  checkActiveCall: async () => {
    try {
      set({ isLoading: true, error: null });

      // Get token from auth store
      const token = useAuthStore.getState().accessToken;
      if (!token) {
        set({ isLoading: false });
        return false;
      }

      // Call the action
      const result = await getActiveCall(token);

      if (result.success && result.activeCall) {
        set({
          isInCall: true,
          currentCall: result.activeCall,
          isLoading: false,
        });
        return true;
      } else {
        set({
          isInCall: false,
          currentCall: null,
          isLoading: false,
        });
        return false;
      }
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : "Lỗi không xác định",
      });
      return false;
    }
  },

  resetCallState: () => {
    // Stop media streams
    const localStream = get().localStream;
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
    }

    set({
      isInCall: false,
      isMuted: false,
      isCameraOff: false,
      currentCall: null,
      localStream: null,
      remoteStream: null,
      isLoading: false,
      error: null,
    });
  },
}));
