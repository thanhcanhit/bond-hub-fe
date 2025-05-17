import { create } from "zustand";
import {
  initiateCall,
  acceptCall,
  endCall,
  rejectCall,
  getActiveCall,
} from "@/actions/call.action";
import { useAuthStore } from "./authStore";

// Create a logger function to standardize log format
const logCall = (action: string, details?: any) => {
  const timestamp = new Date().toISOString();
  const detailsStr = details ? ` | Details: ${JSON.stringify(details)}` : "";
  console.log(`[CALL_STORE] [${timestamp}] ${action}${detailsStr}`);
};

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
    logCall("START_CALL", { receiverId, type });
    try {
      set({ isLoading: true, error: null });
      logCall("SET_LOADING", { isLoading: true });

      // Get token from auth store
      const token = useAuthStore.getState().accessToken;
      logCall("GOT_TOKEN", { hasToken: !!token });

      if (!token) {
        const errorMsg = "Bạn cần đăng nhập để thực hiện cuộc gọi";
        logCall("ERROR_NO_TOKEN", { error: errorMsg });
        set({
          isLoading: false,
          error: errorMsg,
        });
        return false;
      }

      // Get current user ID from authStore
      const currentUserId = useAuthStore.getState().user?.id;
      logCall("GOT_USER_ID", { userId: currentUserId });

      if (!currentUserId) {
        const errorMsg =
          "Không thể thực hiện cuộc gọi: Không tìm thấy thông tin người dùng";
        logCall("ERROR_NO_USER_ID", { error: errorMsg });
        set({
          isLoading: false,
          error: errorMsg,
        });
        return false;
      }

      // Call the action with initiatorId
      logCall("CALLING_INITIATE_CALL_ACTION", {
        receiverId,
        type,
        initiatorId: currentUserId,
      });
      const result = await initiateCall(receiverId, type, token, currentUserId);
      logCall("INITIATE_CALL_RESULT", result);

      if (result.success) {
        const callData = {
          id: result.callId,
          roomId: result.roomId,
          type: type, // Use the passed type parameter to avoid TypeScript error
          targetId: receiverId,
          targetType: "USER",
        };

        logCall("CALL_INITIATED_SUCCESSFULLY", callData);
        set({
          isInCall: true,
          currentCall: callData,
          isLoading: false,
        });
        return true;
      } else {
        const errorMsg = result.message || "Không thể khởi tạo cuộc gọi";
        logCall("CALL_INITIATION_FAILED", { error: errorMsg });
        set({
          isLoading: false,
          error: errorMsg,
        });
        return false;
      }
    } catch (error) {
      const errorMsg =
        error instanceof Error ? error.message : "Lỗi không xác định";
      logCall("CALL_INITIATION_ERROR", { error: errorMsg });
      set({
        isLoading: false,
        error: errorMsg,
      });
      return false;
    }
  },

  startGroupCall: async (groupId: string, type: "AUDIO" | "VIDEO") => {
    logCall("START_GROUP_CALL", { groupId, type });
    try {
      set({ isLoading: true, error: null });
      logCall("SET_LOADING", { isLoading: true });

      // Get token from auth store
      const token = useAuthStore.getState().accessToken;
      logCall("GOT_TOKEN", { hasToken: !!token });

      if (!token) {
        const errorMsg = "Bạn cần đăng nhập để thực hiện cuộc gọi nhóm";
        logCall("ERROR_NO_TOKEN", { error: errorMsg });
        set({
          isLoading: false,
          error: errorMsg,
        });
        return false;
      }

      // Get current user ID from authStore
      const currentUserId = useAuthStore.getState().user?.id;
      logCall("GOT_USER_ID", { userId: currentUserId });

      if (!currentUserId) {
        const errorMsg =
          "Không thể thực hiện cuộc gọi nhóm: Không tìm thấy thông tin người dùng";
        logCall("ERROR_NO_USER_ID", { error: errorMsg });
        set({
          isLoading: false,
          error: errorMsg,
        });
        return false;
      }

      // Call the action
      logCall("IMPORTING_GROUP_CALL_ACTION");
      const { initiateGroupCall } = await import("@/actions/call.action");
      logCall("CALLING_INITIATE_GROUP_CALL_ACTION", {
        groupId,
        type,
        initiatorId: currentUserId,
      });
      const result = await initiateGroupCall(
        groupId,
        type,
        token,
        currentUserId,
      );
      logCall("INITIATE_GROUP_CALL_RESULT", result);

      if (result.success) {
        const callData = {
          id: result.callId,
          roomId: result.roomId,
          type: type, // Use the passed type parameter to avoid TypeScript error
          targetId: groupId,
          targetType: "GROUP" as const, // Use const assertion to fix TypeScript error
        };

        logCall("GROUP_CALL_INITIATED_SUCCESSFULLY", callData);
        set({
          isInCall: true,
          currentCall: callData,
          isLoading: false,
        });
        return true;
      } else {
        const errorMsg = result.message || "Không thể khởi tạo cuộc gọi nhóm";
        logCall("GROUP_CALL_INITIATION_FAILED", { error: errorMsg });
        set({
          isLoading: false,
          error: errorMsg,
        });
        return false;
      }
    } catch (error) {
      const errorMsg =
        error instanceof Error ? error.message : "Lỗi không xác định";
      logCall("GROUP_CALL_INITIATION_ERROR", { error: errorMsg });
      set({
        isLoading: false,
        error: errorMsg,
      });
      return false;
    }
  },

  acceptCall: async (callId: string, initiatorId?: string, roomId?: string) => {
    logCall("ACCEPT_CALL", { callId, initiatorId, roomId });
    try {
      set({ isLoading: true, error: null });
      logCall("SET_LOADING", { isLoading: true });

      // Get token from auth store
      const token = useAuthStore.getState().accessToken;
      logCall("GOT_TOKEN", { hasToken: !!token });

      if (!token) {
        const errorMsg = "Bạn cần đăng nhập để tham gia cuộc gọi";
        logCall("ERROR_NO_TOKEN", { error: errorMsg });
        set({
          isLoading: false,
          error: errorMsg,
        });
        return false;
      }

      // Get current user ID from authStore
      const currentUserId = useAuthStore.getState().user?.id;
      logCall("GOT_USER_ID", { userId: currentUserId });

      if (!currentUserId) {
        const errorMsg =
          "Không thể tham gia cuộc gọi: Không tìm thấy thông tin người dùng";
        logCall("ERROR_NO_USER_ID", { error: errorMsg });
        set({
          isLoading: false,
          error: errorMsg,
        });
        return false;
      }

      // Call the action with all parameters including initiatorId and roomId
      // These are needed for the backend to properly identify the call
      logCall("CALLING_ACCEPT_CALL_ACTION", {
        callId,
        initiatorId,
        roomId,
        userId: currentUserId,
      });
      const result = await acceptCall(
        callId,
        token,
        initiatorId,
        roomId,
        currentUserId,
      );
      logCall("ACCEPT_CALL_RESULT", result);

      if (result.success) {
        logCall("CALL_ACCEPTED_SUCCESSFULLY", {
          roomId: result.roomId,
          type: result.type,
          callUrl: result.callUrl,
          acceptedAt: result.acceptedAt,
        });

        // Store call information if available
        if (result.roomId && result.type) {
          const callData = {
            id: callId,
            roomId: result.roomId,
            type: result.type as "AUDIO" | "VIDEO",
            targetId: "", // We don't know the target ID at this point
            targetType: "USER" as const, // Assume it's a user call by default
          };

          logCall("SETTING_CURRENT_CALL_DATA", callData);
          set({
            isInCall: true,
            currentCall: callData,
            isLoading: false,
          });
        } else {
          logCall("SETTING_IN_CALL_WITHOUT_DETAILS");
          set({
            isInCall: true,
            isLoading: false,
          });
        }
        return true;
      } else {
        const errorMsg = result.message || "Không thể tham gia cuộc gọi";
        logCall("CALL_ACCEPTANCE_FAILED", { error: errorMsg });
        set({
          isLoading: false,
          error: errorMsg,
        });
        return false;
      }
    } catch (error) {
      const errorMsg =
        error instanceof Error ? error.message : "Lỗi không xác định";
      logCall("CALL_ACCEPTANCE_ERROR", { error: errorMsg });
      set({
        isLoading: false,
        error: errorMsg,
      });
      return false;
    }
  },

  rejectIncomingCall: async (callId: string) => {
    logCall("REJECT_INCOMING_CALL", { callId });
    try {
      set({ isLoading: true, error: null });
      logCall("SET_LOADING", { isLoading: true });

      // Get token from auth store
      const token = useAuthStore.getState().accessToken;
      logCall("GOT_TOKEN", { hasToken: !!token });

      if (!token) {
        logCall("ERROR_NO_TOKEN");
        set({ isLoading: false });
        return false;
      }

      // Get current user ID from authStore
      const currentUserId = useAuthStore.getState().user?.id;
      logCall("GOT_USER_ID", { userId: currentUserId });

      if (!currentUserId) {
        const errorMsg =
          "Không thể từ chối cuộc gọi: Không tìm thấy thông tin người dùng";
        logCall("ERROR_NO_USER_ID", { error: errorMsg });
        set({
          isLoading: false,
          error: errorMsg,
        });
        return false;
      }

      // Call the action with userId
      logCall("CALLING_REJECT_CALL_ACTION", { callId, userId: currentUserId });
      const result = await rejectCall(callId, token, currentUserId);
      logCall("REJECT_CALL_RESULT", result);

      set({ isLoading: false });
      logCall("CALL_REJECTION_COMPLETED", { success: result.success });
      return result.success;
    } catch (error) {
      const errorMsg =
        error instanceof Error ? error.message : "Lỗi không xác định";
      logCall("CALL_REJECTION_ERROR", { error: errorMsg });
      set({
        isLoading: false,
        error: errorMsg,
      });
      return false;
    }
  },

  endCall: async () => {
    logCall("END_CALL");
    try {
      set({ isLoading: true, error: null });
      logCall("SET_LOADING", { isLoading: true });

      // Get token and current call
      const token = useAuthStore.getState().accessToken;
      const currentCall = get().currentCall;
      logCall("GOT_CALL_DATA", {
        hasToken: !!token,
        hasCurrentCall: !!currentCall,
        callDetails: currentCall,
      });

      if (!token || !currentCall) {
        logCall("MISSING_TOKEN_OR_CALL_DATA", {
          hasToken: !!token,
          hasCurrentCall: !!currentCall,
        });
        get().resetCallState();
        return true;
      }

      // Get current user ID from authStore
      const currentUserId = useAuthStore.getState().user?.id;
      logCall("GOT_USER_ID", { userId: currentUserId });

      if (!currentUserId) {
        const errorMsg =
          "Không thể kết thúc cuộc gọi: Không tìm thấy thông tin người dùng";
        logCall("ERROR_NO_USER_ID", { error: errorMsg });
        // Still reset call state to ensure UI is updated
        get().resetCallState();
        return false;
      }

      // Stop media streams
      const localStream = get().localStream;
      logCall("GOT_LOCAL_STREAM", { hasLocalStream: !!localStream });

      if (localStream) {
        const tracks = localStream.getTracks();
        logCall("STOPPING_MEDIA_TRACKS", { trackCount: tracks.length });
        tracks.forEach((track) => {
          track.stop();
          logCall("TRACK_STOPPED", { kind: track.kind, id: track.id });
        });
      }

      // Call the action with userId
      logCall("CALLING_END_CALL_ACTION", {
        callId: currentCall.id,
        userId: currentUserId,
      });
      const result = await endCall(currentCall.id, token, currentUserId);
      logCall("END_CALL_RESULT", result);

      // Reset call state regardless of result
      logCall("RESETTING_CALL_STATE");
      get().resetCallState();

      logCall("CALL_ENDED", { success: result.success });
      return result.success;
    } catch (error) {
      const errorMsg =
        error instanceof Error ? error.message : "Lỗi không xác định";
      logCall("CALL_END_ERROR", { error: errorMsg });
      logCall("RESETTING_CALL_STATE_AFTER_ERROR");
      get().resetCallState();
      return false;
    }
  },

  toggleMute: async () => {
    logCall("TOGGLE_MUTE");
    const localStream = get().localStream;
    const isMuted = get().isMuted;
    logCall("MUTE_STATE", { isMuted, hasLocalStream: !!localStream });

    if (localStream) {
      const audioTracks = localStream.getAudioTracks();
      logCall("AUDIO_TRACKS", { count: audioTracks.length });

      audioTracks.forEach((track) => {
        track.enabled = isMuted; // Toggle: if muted, enable; if not muted, disable
        logCall("AUDIO_TRACK_TOGGLED", {
          trackId: track.id,
          enabled: track.enabled,
        });
      });

      const newMuteState = !isMuted;
      logCall("SETTING_NEW_MUTE_STATE", { newMuteState });
      set({ isMuted: newMuteState });
    } else {
      logCall("NO_LOCAL_STREAM_FOR_MUTE");
    }
  },

  toggleCamera: async () => {
    logCall("TOGGLE_CAMERA");
    const localStream = get().localStream;
    const isCameraOff = get().isCameraOff;
    logCall("CAMERA_STATE", { isCameraOff, hasLocalStream: !!localStream });

    if (localStream) {
      const videoTracks = localStream.getVideoTracks();
      logCall("VIDEO_TRACKS", { count: videoTracks.length });

      videoTracks.forEach((track) => {
        track.enabled = isCameraOff; // Toggle: if camera off, enable; if camera on, disable
        logCall("VIDEO_TRACK_TOGGLED", {
          trackId: track.id,
          enabled: track.enabled,
        });
      });

      const newCameraState = !isCameraOff;
      logCall("SETTING_NEW_CAMERA_STATE", { newCameraState });
      set({ isCameraOff: newCameraState });
    } else {
      logCall("NO_LOCAL_STREAM_FOR_CAMERA");
    }
  },

  setLocalStream: (stream) => {
    logCall("SET_LOCAL_STREAM", {
      hasStream: !!stream,
      trackInfo: stream
        ? stream.getTracks().map((t) => ({ kind: t.kind, id: t.id }))
        : null,
    });
    set({ localStream: stream });
  },

  setRemoteStream: (stream) => {
    logCall("SET_REMOTE_STREAM", {
      hasStream: !!stream,
      trackInfo: stream
        ? stream.getTracks().map((t) => ({ kind: t.kind, id: t.id }))
        : null,
    });
    set({ remoteStream: stream });
  },

  checkActiveCall: async () => {
    logCall("CHECK_ACTIVE_CALL");
    try {
      set({ isLoading: true, error: null });
      logCall("SET_LOADING", { isLoading: true });

      // Get token from auth store
      const token = useAuthStore.getState().accessToken;
      logCall("GOT_TOKEN", { hasToken: !!token });

      if (!token) {
        logCall("ERROR_NO_TOKEN");
        set({ isLoading: false });
        return false;
      }

      // Call the action
      logCall("CALLING_GET_ACTIVE_CALL_ACTION");
      const result = await getActiveCall(token);
      logCall("GET_ACTIVE_CALL_RESULT", {
        success: result.success,
        hasActiveCall: !!result.activeCall,
        activeCall: result.activeCall,
      });

      if (result.success && result.activeCall) {
        logCall("ACTIVE_CALL_FOUND", result.activeCall);
        set({
          isInCall: true,
          currentCall: result.activeCall,
          isLoading: false,
        });
        return true;
      } else {
        logCall("NO_ACTIVE_CALL_FOUND");
        set({
          isInCall: false,
          currentCall: null,
          isLoading: false,
        });
        return false;
      }
    } catch (error) {
      const errorMsg =
        error instanceof Error ? error.message : "Lỗi không xác định";
      logCall("CHECK_ACTIVE_CALL_ERROR", { error: errorMsg });
      set({
        isLoading: false,
        error: errorMsg,
      });
      return false;
    }
  },

  resetCallState: () => {
    logCall("RESET_CALL_STATE");

    // Stop media streams
    const localStream = get().localStream;
    logCall("GOT_LOCAL_STREAM", { hasLocalStream: !!localStream });

    if (localStream) {
      const tracks = localStream.getTracks();
      logCall("STOPPING_MEDIA_TRACKS", { trackCount: tracks.length });

      tracks.forEach((track) => {
        track.stop();
        logCall("TRACK_STOPPED", { kind: track.kind, id: track.id });
      });
    }

    const previousState = {
      isInCall: get().isInCall,
      isMuted: get().isMuted,
      isCameraOff: get().isCameraOff,
      hasCurrentCall: !!get().currentCall,
      hasLocalStream: !!get().localStream,
      hasRemoteStream: !!get().remoteStream,
    };

    logCall("PREVIOUS_STATE_BEFORE_RESET", previousState);

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

    logCall("CALL_STATE_RESET_COMPLETED");
  },
}));
