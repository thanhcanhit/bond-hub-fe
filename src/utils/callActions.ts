import { toast } from "sonner";

/**
 * End a call with the server
 */
export async function endCallWithServer(
  callId: string | null,
  token: string | null,
): Promise<boolean> {
  try {
    if (!callId || !token) {
      console.log("[CALL_ACTIONS] Missing callId or token for ending call");
      return false;
    }

    console.log(
      `[CALL_ACTIONS] Sending end call request to server for call ID: ${callId}`,
    );

    // Import the endCall action directly
    const { endCall } = await import("@/actions/call.action");
    const result = await endCall(callId, token);
    console.log(`[CALL_ACTIONS] End call API result:`, result);

    return result.success;
  } catch (error) {
    console.error("[CALL_ACTIONS] Error ending call with server:", error);
    return false;
  }
}

/**
 * End an active call when callId is not known
 */
export async function endActiveCall(token: string): Promise<boolean> {
  try {
    console.log("[CALL_ACTIONS] Trying to end active call");

    // First try to get the active call from the server
    const { getActiveCall } = await import("@/actions/call.action");
    const activeCallResult = await getActiveCall(token);

    if (activeCallResult.success && activeCallResult.activeCall) {
      console.log(
        `[CALL_ACTIONS] Found active call from server: ${activeCallResult.activeCall.id}`,
      );

      // End the active call
      const { endCall } = await import("@/actions/call.action");
      const result = await endCall(activeCallResult.activeCall.id, token);
      console.log(`[CALL_ACTIONS] End call API result:`, result);

      return result.success;
    } else {
      console.log("[CALL_ACTIONS] No active call found from server");
      return false;
    }
  } catch (error) {
    console.error("[CALL_ACTIONS] Error ending active call:", error);
    return false;
  }
}

/**
 * Initiate an outgoing call
 */
export async function initiateOutgoingCall(
  targetId: string,
  callType: "AUDIO" | "VIDEO",
  token: string,
): Promise<{ success: boolean; callId?: string }> {
  try {
    if (!token) {
      console.error("[CALL_ACTIONS] No token available to initiate call");
      toast.error("Bạn cần đăng nhập để thực hiện cuộc gọi");
      return { success: false };
    }

    if (!targetId) {
      console.error("[CALL_ACTIONS] No target ID provided for outgoing call");
      toast.error("Không thể xác định người nhận cuộc gọi");
      return { success: false };
    }

    // Initiate the call
    console.log(
      `[CALL_ACTIONS] Initiating call to ${targetId} with type ${callType}`,
    );
    const { initiateCall } = await import("@/actions/call.action");
    const result = await initiateCall(targetId, callType, token);
    console.log("[CALL_ACTIONS] Call initiation result:", result);

    if (result.success) {
      console.log("[CALL_ACTIONS] Call initiated successfully:", result);
      // Store the callId for future reference
      if (result.callId) {
        sessionStorage.setItem("currentCallId", result.callId);
        console.log(
          `[CALL_ACTIONS] Stored currentCallId=${result.callId} in sessionStorage`,
        );
      }

      return { success: true, callId: result.callId };
    } else {
      console.error("[CALL_ACTIONS] Failed to initiate call:", result.message);
      toast.error(result.message || "Không thể thực hiện cuộc gọi");
      return { success: false };
    }
  } catch (error) {
    console.error("[CALL_ACTIONS] Error initiating outgoing call:", error);
    toast.error("Đã xảy ra lỗi khi thực hiện cuộc gọi");
    return { success: false };
  }
}

/**
 * Check for an active call
 */
export async function checkActiveCall(
  token: string,
): Promise<{ success: boolean; callId?: string }> {
  try {
    if (!token) {
      console.warn("[CALL_ACTIONS] No token available to check active call");
      return { success: false };
    }

    console.log("[CALL_ACTIONS] Checking for active call");
    const { getActiveCall } = await import("@/actions/call.action");
    const activeCallResult = await getActiveCall(token);
    console.log("[CALL_ACTIONS] Active call check result:", activeCallResult);

    if (activeCallResult.success && activeCallResult.activeCall) {
      console.log(
        "[CALL_ACTIONS] Active call found:",
        activeCallResult.activeCall,
      );
      return { success: true, callId: activeCallResult.activeCall.id };
    } else {
      console.log("[CALL_ACTIONS] No active call found");
      return { success: false };
    }
  } catch (error) {
    console.error("[CALL_ACTIONS] Error checking active call:", error);
    return { success: false };
  }
}
