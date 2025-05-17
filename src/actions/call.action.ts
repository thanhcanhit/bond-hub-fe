"use server";

/**
 * Trích xuất ID người dùng từ JWT token
 * @param token JWT token
 * @returns ID người dùng hoặc chuỗi rỗng nếu không thể trích xuất
 */
function extractUserIdFromToken(token: string): string {
  try {
    const tokenParts = token.split(".");
    if (tokenParts.length === 3) {
      const payload = JSON.parse(atob(tokenParts[1]));
      return payload.sub || "";
    }
  } catch (error) {
    console.error("Error extracting userId from token:", error);
  }
  return "";
}

/**
 * Initiate a call to another user
 * @param receiverId ID of the user to call
 * @param type Type of call (AUDIO or VIDEO)
 * @param token Authentication token (passed from client)
 * @returns Call data including callId and roomId
 */
export async function initiateCall(
  receiverId: string,
  type: "AUDIO" | "VIDEO",
  token: string,
) {
  try {
    console.log(`Initiating call to ${receiverId} with type ${type}`);
    console.log(`Token received: ${token ? "Token exists" : "No token"}`);

    if (!token) {
      return { success: false, message: "Unauthorized" };
    }

    // Đảm bảo token không có khoảng trắng ở đầu hoặc cuối
    const cleanToken = token.trim();

    // Đảm bảo API URL không bị undefined
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
    console.log(`Using API URL: ${apiUrl}`);

    // Log thông tin request để debug
    console.log(`Making request to ${apiUrl}/api/v1/calls`);
    console.log(`Authorization header: Bearer ${cleanToken}`);

    // Lấy ID người dùng hiện tại từ token JWT
    const initiatorId = extractUserIdFromToken(cleanToken);
    console.log(`Extracted initiatorId from token: ${initiatorId}`);

    // Gửi request với initiatorId
    const response = await fetch(`${apiUrl}/api/v1/calls`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${cleanToken}`,
      },
      body: JSON.stringify({
        receiverId,
        type,
        initiatorId, // Thêm initiatorId vào request
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return {
        success: false,
        message: errorData.message || "Failed to create call",
      };
    }

    const data = await response.json();
    return {
      success: true,
      callId: data.id,
      roomId: data.roomId,
      type,
    };
  } catch (error) {
    console.error("Error initiating call:", error);
    return {
      success: false,
      message: "Internal server error",
    };
  }
}

/**
 * Accept an incoming call
 * @param callId ID of the call to accept
 * @param token Authentication token (passed from client)
 * @returns Success status
 */
export async function acceptCall(
  callId: string,
  token: string,
  initiatorId?: string,
  roomId?: string,
) {
  try {
    console.log(`Accepting call ${callId}`);
    console.log(`Token received: ${token ? "Token exists" : "No token"}`);
    console.log(
      `Additional params - initiatorId: ${initiatorId || "not provided"}, roomId: ${roomId || "not provided"}`,
    );

    if (!token) {
      return { success: false, message: "Unauthorized" };
    }

    // Đảm bảo token không có khoảng trắng ở đầu hoặc cuối
    const cleanToken = token.trim();

    // Đảm bảo API URL không bị undefined
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

    // Extract user ID from token
    const userId = extractUserIdFromToken(cleanToken);
    console.log(`Extracted userId from token for call acceptance: ${userId}`);

    // Prepare request body with all available information
    const requestBody: any = {
      callId,
      userId, // Include the user ID in the request
    };

    // Add optional parameters if provided
    if (initiatorId) {
      requestBody.initiatorId = initiatorId;
      console.log(`Including initiatorId in request: ${initiatorId}`);
    }

    if (roomId) {
      requestBody.roomId = roomId;
      console.log(`Including roomId in request: ${roomId}`);
    }

    // Log request details for debugging
    console.log(`Making request to ${apiUrl}/api/v1/calls/join`);
    console.log(`Authorization header: Bearer ${cleanToken}`);
    console.log(`Request body:`, requestBody);

    const response = await fetch(`${apiUrl}/api/v1/calls/join`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${cleanToken}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return {
        success: false,
        message: errorData.message || "Failed to join call",
      };
    }

    const data = await response.json();

    // Thêm thông tin về loại cuộc gọi nếu có
    const callType = data.type || "AUDIO";

    // Tạo URL cuộc gọi dựa trên loại cuộc gọi
    const callUrl =
      callType === "VIDEO"
        ? `/video-call/${data.roomId}`
        : `/call/${data.roomId}`;

    // Dispatch a global event to notify that the call has been accepted
    // This helps ensure that all open windows (including the caller's window) are notified
    if (typeof window !== "undefined") {
      try {
        console.log(
          `Dispatching call:accepted event for call ID: ${callId}, roomId: ${data.roomId}`,
        );
        window.dispatchEvent(
          new CustomEvent("call:accepted", {
            detail: {
              callId,
              roomId: data.roomId,
              initiatorId: initiatorId || undefined,
              receiverId: userId,
              timestamp: new Date().toISOString(),
            },
          }),
        );

        // Also dispatch a participant joined event to ensure the UI updates
        console.log(
          `Dispatching call:participant:joined event for roomId: ${data.roomId}`,
        );
        window.dispatchEvent(
          new CustomEvent("call:participant:joined", {
            detail: {
              roomId: data.roomId,
              userId: userId,
              timestamp: new Date().toISOString(),
            },
          }),
        );
      } catch (eventError) {
        console.error("Error dispatching call acceptance events:", eventError);
        // Continue anyway, as this is just an additional notification mechanism
      }
    }

    return {
      success: true,
      roomId: data.roomId,
      type: callType,
      callUrl: callUrl,
      acceptedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error("Error accepting call:", error);
    return {
      success: false,
      message: "Internal server error",
    };
  }
}

/**
 * Reject an incoming call
 * @param callId ID of the call to reject
 * @param token Authentication token (passed from client)
 * @returns Success status
 */
export async function rejectCall(callId: string, token: string) {
  try {
    console.log(`Rejecting call ${callId}`);
    console.log(`Token received: ${token ? "Token exists" : "No token"}`);

    if (!token) {
      return { success: false, message: "Unauthorized" };
    }

    // Đảm bảo token không có khoảng trắng ở đầu hoặc cuối
    const cleanToken = token.trim();

    // Đảm bảo API URL không bị undefined
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

    const response = await fetch(`${apiUrl}/api/v1/calls/${callId}/reject`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${cleanToken}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      return {
        success: false,
        message: errorData.message || "Failed to reject call",
      };
    }

    return { success: true };
  } catch (error) {
    console.error("Error rejecting call:", error);
    return {
      success: false,
      message: "Internal server error",
    };
  }
}

/**
 * End an ongoing call
 * @param callId ID of the call to end
 * @param token Authentication token (passed from client)
 * @returns Success status
 */
export async function endCall(callId: string, token: string) {
  try {
    console.log(`Ending call ${callId}`);
    console.log(`Token received: ${token ? "Token exists" : "No token"}`);

    if (!token) {
      return { success: false, message: "Unauthorized" };
    }

    if (!callId) {
      console.error("No call ID provided to endCall function");
      return { success: false, message: "Missing call ID" };
    }

    // Đảm bảo token không có khoảng trắng ở đầu hoặc cuối
    const cleanToken = token.trim();

    // Đảm bảo API URL không bị undefined
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
    console.log(`Using API URL: ${apiUrl}`);

    // Log thông tin request để debug
    console.log(`Making request to ${apiUrl}/api/v1/calls/end`);
    console.log(`Authorization header: Bearer ${cleanToken}`);
    console.log(`Request body: { callId: ${callId} }`);

    // Extract user ID from token
    const userId = extractUserIdFromToken(cleanToken);
    console.log(`Extracted userId from token for ending call: ${userId}`);

    // Log request details for debugging
    console.log(`Request body: { callId: ${callId}, userId: ${userId} }`);

    const response = await fetch(`${apiUrl}/api/v1/calls/end`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${cleanToken}`,
      },
      body: JSON.stringify({
        callId,
        userId, // Include the user ID in the request
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error(
        `Error ending call: ${errorData.message || "Unknown error"}`,
      );
      return {
        success: false,
        message: errorData.message || "Failed to end call",
      };
    }

    console.log("Call ended successfully");

    // Try to dispatch a call:ended event to ensure all components are notified
    try {
      if (typeof window !== "undefined") {
        console.log(`Dispatching call:ended event for call ID: ${callId}`);
        window.dispatchEvent(
          new CustomEvent("call:ended", {
            detail: { callId },
          }),
        );
      }
    } catch (eventError) {
      console.error("Error dispatching call:ended event:", eventError);
    }

    return { success: true };
  } catch (error) {
    console.error("Error ending call:", error);
    return {
      success: false,
      message: "Internal server error",
    };
  }
}

/**
 * Initiate a group call
 * @param groupId ID of the group to call
 * @param type Type of call (AUDIO or VIDEO)
 * @param token Authentication token (passed from client)
 * @returns Call data including callId and roomId
 */
export async function initiateGroupCall(
  groupId: string,
  type: "AUDIO" | "VIDEO",
  token: string,
) {
  try {
    console.log(`Initiating group call to ${groupId} with type ${type}`);
    console.log(`Token received: ${token ? "Token exists" : "No token"}`);

    if (!token) {
      return { success: false, message: "Unauthorized" };
    }

    // Đảm bảo token không có khoảng trắng ở đầu hoặc cuối
    const cleanToken = token.trim();

    // Đảm bảo API URL không bị undefined
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

    // Log thông tin request để debug
    console.log(`Making request to ${apiUrl}/api/v1/calls`);
    console.log(`Authorization header: Bearer ${cleanToken}`);

    // Lấy ID người dùng hiện tại từ token JWT
    const initiatorId = extractUserIdFromToken(cleanToken);
    console.log(`Extracted initiatorId from token: ${initiatorId}`);

    // Gửi request với initiatorId
    const response = await fetch(`${apiUrl}/api/v1/calls`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${cleanToken}`,
      },
      body: JSON.stringify({
        groupId,
        type,
        initiatorId, // Thêm initiatorId vào request
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return {
        success: false,
        message: errorData.message || "Failed to create group call",
      };
    }

    const data = await response.json();
    return {
      success: true,
      callId: data.id,
      roomId: data.roomId,
      type,
    };
  } catch (error) {
    console.error("Error initiating group call:", error);
    return {
      success: false,
      message: "Internal server error",
    };
  }
}

/**
 * Get active call for current user
 * @param token Authentication token (passed from client)
 * @returns Active call data if exists
 */
/**
 * Join an existing call
 * @param callId ID of the call to join
 * @param token Authentication token (passed from client)
 * @returns Success status and call details
 */
export async function joinCall(callId: string, token: string) {
  try {
    console.log(`Joining call ${callId}`);
    console.log(`Token received: ${token ? "Token exists" : "No token"}`);

    if (!token) {
      return { success: false, message: "Unauthorized" };
    }

    // Đảm bảo token không có khoảng trắng ở đầu hoặc cuối
    const cleanToken = token.trim();

    // Đảm bảo API URL không bị undefined
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

    // Extract user ID from token
    const userId = extractUserIdFromToken(cleanToken);
    console.log(`Extracted userId from token for call join: ${userId}`);

    // Prepare request body
    const requestBody = {
      callId,
      userId,
    };

    // Log request details for debugging
    console.log(`Making request to ${apiUrl}/api/v1/calls/join`);
    console.log(`Authorization header: Bearer ${cleanToken}`);
    console.log(`Request body:`, requestBody);

    const response = await fetch(`${apiUrl}/api/v1/calls/join`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${cleanToken}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return {
        success: false,
        message: errorData.message || "Failed to join call",
      };
    }

    const data = await response.json();
    return {
      success: true,
      roomId: data.roomId,
      type: data.type || "AUDIO",
    };
  } catch (error) {
    console.error("Error joining call:", error);
    return {
      success: false,
      message: "Internal server error",
    };
  }
}

/**
 * Create a call room on the server
 * @param callId ID of the call to create a room for
 * @param token Authentication token (passed from client)
 * @returns Success status
 */
export async function createCallRoom(callId: string, token: string) {
  try {
    console.log(`Creating call room for call ${callId}`);
    console.log(`Token received: ${token ? "Token exists" : "No token"}`);

    if (!token) {
      return { success: false, message: "Unauthorized" };
    }

    // Đảm bảo token không có khoảng trắng ở đầu hoặc cuối
    const cleanToken = token.trim();

    // Đảm bảo API URL không bị undefined
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

    // Extract user ID from token
    const userId = extractUserIdFromToken(cleanToken);
    console.log(`Extracted userId from token for room creation: ${userId}`);

    // Prepare request body
    const requestBody = {
      callId,
      userId,
    };

    // Log request details for debugging
    console.log(`Making request to ${apiUrl}/api/v1/calls/room`);
    console.log(`Authorization header: Bearer ${cleanToken}`);
    console.log(`Request body:`, requestBody);

    const response = await fetch(`${apiUrl}/api/v1/calls/room`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${cleanToken}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return {
        success: false,
        message: errorData.message || "Failed to create call room",
      };
    }

    const data = await response.json();
    return {
      success: true,
      roomId: data.roomId,
    };
  } catch (error) {
    console.error("Error creating call room:", error);
    return {
      success: false,
      message: "Internal server error",
    };
  }
}

export async function getActiveCall(token: string) {
  try {
    console.log(`Getting active call`);
    console.log(`Token received: ${token ? "Token exists" : "No token"}`);

    if (!token) {
      return { success: false, message: "Unauthorized" };
    }

    // Đảm bảo token không có khoảng trắng ở đầu hoặc cuối
    const cleanToken = token.trim();

    // Đảm bảo API URL không bị undefined
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

    // Log thông tin request để debug
    console.log(`Making request to ${apiUrl}/api/v1/calls/user/active`);
    console.log(`Authorization header: Bearer ${cleanToken}`);

    const response = await fetch(`${apiUrl}/api/v1/calls/user/active`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${cleanToken}`,
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        // No active call is not an error
        return { success: true, activeCall: null };
      }

      const errorData = await response.json();
      return {
        success: false,
        message: errorData.message || "Failed to get active call",
      };
    }

    const data = await response.json();
    return {
      success: true,
      activeCall: data,
    };
  } catch (error) {
    console.error("Error getting active call:", error);
    return {
      success: false,
      message: "Internal server error",
    };
  }
}
