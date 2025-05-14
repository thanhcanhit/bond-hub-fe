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
export async function acceptCall(callId: string, token: string) {
  try {
    console.log(`Accepting call ${callId}`);
    console.log(`Token received: ${token ? "Token exists" : "No token"}`);

    if (!token) {
      return { success: false, message: "Unauthorized" };
    }

    // Đảm bảo token không có khoảng trắng ở đầu hoặc cuối
    const cleanToken = token.trim();

    // Đảm bảo API URL không bị undefined
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

    const response = await fetch(`${apiUrl}/api/v1/calls/join`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${cleanToken}`,
      },
      body: JSON.stringify({ callId }),
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

    // Đảm bảo token không có khoảng trắng ở đầu hoặc cuối
    const cleanToken = token.trim();

    // Đảm bảo API URL không bị undefined
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

    const response = await fetch(`${apiUrl}/api/v1/calls/end`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${cleanToken}`,
      },
      body: JSON.stringify({ callId }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return {
        success: false,
        message: errorData.message || "Failed to end call",
      };
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
