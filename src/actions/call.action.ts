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

    // Import axios instance
    const { createAxiosInstance } = await import("@/lib/axios");

    // Create a custom axios instance with the token
    const axiosInstance = createAxiosInstance(cleanToken);

    // Lấy ID người dùng hiện tại từ token JWT
    const initiatorId = extractUserIdFromToken(cleanToken);
    console.log(`Extracted initiatorId from token: ${initiatorId}`);

    // Log thông tin request để debug
    console.log(`Making request to /calls using axios`);
    console.log(
      `Request body: { receiverId: ${receiverId}, type: ${type}, initiatorId: ${initiatorId} }`,
    );

    // Gửi request với initiatorId
    const response = await axiosInstance.post("/calls", {
      receiverId,
      type,
      initiatorId, // Thêm initiatorId vào request
    });

    const data = response.data;
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
 * @param initiatorId Optional ID of the call initiator
 * @param roomId Optional room ID for the call
 * @returns Success status and call details
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

    // Import axios instance
    const { createAxiosInstance } = await import("@/lib/axios");

    // Create a custom axios instance with the token
    const axiosInstance = createAxiosInstance(cleanToken);

    // Extract user ID from token
    const userId = extractUserIdFromToken(cleanToken);
    console.log(`Extracted userId from token for call acceptance: ${userId}`);

    if (!userId) {
      console.error("Failed to extract user ID from token");
      return { success: false, message: "Invalid authentication token" };
    }

    // Prepare request body with minimal required information
    // The backend will use the user ID from the token for validation
    const requestBody: any = {
      callId,
      // Only include userId from the token - the backend will validate this
      userId,
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
    console.log(`Making request to /calls/join using axios`);
    console.log(`Request body:`, requestBody);

    try {
      const response = await axiosInstance.post("/calls/join", requestBody);
      const data = response.data;

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
          console.error(
            "Error dispatching call acceptance events:",
            eventError,
          );
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
    } catch (axiosError: any) {
      // Extract error message from the response if available
      let errorMessage =
        axiosError.response?.data?.message ||
        axiosError.message ||
        "Failed to accept call";

      // Log the detailed error information
      console.error(`API error accepting call: ${errorMessage}`, {
        status: axiosError.response?.status,
        statusText: axiosError.response?.statusText,
        data: axiosError.response?.data,
        headers: axiosError.response?.headers,
        config: {
          url: axiosError.config?.url,
          method: axiosError.config?.method,
          baseURL: axiosError.config?.baseURL,
        },
      });

      // Enhance error message for better user experience
      if (axiosError.response?.status === 403) {
        errorMessage = "User is not allowed to join this call";
      } else if (axiosError.response?.status === 404) {
        errorMessage = "Call not found or already ended";
      } else if (axiosError.response?.status === 401) {
        errorMessage = "Authentication failed. Please log in again";
      }

      // Dispatch an event to notify that the call acceptance failed
      if (typeof window !== "undefined") {
        try {
          window.dispatchEvent(
            new CustomEvent("call:error", {
              detail: {
                callId,
                errorType: "accept_failed",
                errorMessage,
                timestamp: new Date().toISOString(),
              },
            }),
          );
          console.log("Dispatched call:error event for failed call acceptance");
        } catch (eventError) {
          console.error("Error dispatching call error event:", eventError);
        }
      }

      return {
        success: false,
        message: errorMessage,
      };
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error("Error accepting call:", error);
    return {
      success: false,
      message: errorMessage,
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

    // Import axios instance
    const { createAxiosInstance } = await import("@/lib/axios");

    // Create a custom axios instance with the token
    const axiosInstance = createAxiosInstance(cleanToken);

    // Log thông tin request để debug
    console.log(`Making request to /calls/${callId}/reject using axios`);

    await axiosInstance.post(`/calls/${callId}/reject`);

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

    // Import axios instance
    const { createAxiosInstance } = await import("@/lib/axios");

    // Create a custom axios instance with the token
    const axiosInstance = createAxiosInstance(cleanToken);

    // Extract user ID from token
    const userId = extractUserIdFromToken(cleanToken);
    console.log(`Extracted userId from token for ending call: ${userId}`);

    // Log request details for debugging
    console.log(`Making request to /calls/end using axios`);
    console.log(`Request body: { callId: ${callId}, userId: ${userId} }`);

    await axiosInstance.post("/calls/end", {
      callId,
      userId, // Include the user ID in the request
    });

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

    // Import axios instance
    const { createAxiosInstance } = await import("@/lib/axios");

    // Create a custom axios instance with the token
    const axiosInstance = createAxiosInstance(cleanToken);

    // Lấy ID người dùng hiện tại từ token JWT
    const initiatorId = extractUserIdFromToken(cleanToken);
    console.log(`Extracted initiatorId from token: ${initiatorId}`);

    // Log thông tin request để debug
    console.log(`Making request to /calls using axios for group call`);
    console.log(
      `Request body: { groupId: ${groupId}, type: ${type}, initiatorId: ${initiatorId} }`,
    );

    // Gửi request với initiatorId
    const response = await axiosInstance.post("/calls", {
      groupId,
      type,
      initiatorId, // Thêm initiatorId vào request
    });

    const data = response.data;
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
export async function joinCall(
  callId: string,
  token: string,
  alreadyAccepted: boolean = false,
) {
  try {
    console.log(`Joining call ${callId}, alreadyAccepted: ${alreadyAccepted}`);
    console.log(`Token received: ${token ? "Token exists" : "No token"}`);

    if (!token) {
      return { success: false, message: "Unauthorized" };
    }

    // Nếu cuộc gọi đã được chấp nhận trước đó, trả về thành công ngay lập tức
    if (alreadyAccepted) {
      console.log(
        `Call ${callId} was already accepted, returning success without API call`,
      );
      return {
        success: true,
        roomId: callId, // Sử dụng callId làm roomId trong trường hợp này
        type: "AUDIO", // Mặc định là AUDIO, có thể được ghi đè bởi dữ liệu từ sessionStorage
      };
    }

    // Đảm bảo token không có khoảng trắng ở đầu hoặc cuối
    const cleanToken = token.trim();

    // Import axios instance
    const { createAxiosInstance } = await import("@/lib/axios");

    // Create a custom axios instance with the token
    const axiosInstance = createAxiosInstance(cleanToken);

    // Extract user ID from token
    const userId = extractUserIdFromToken(cleanToken);
    console.log(`Extracted userId from token for call join: ${userId}`);

    if (!userId) {
      console.error("Failed to extract user ID from token");
      return { success: false, message: "Invalid authentication token" };
    }

    // Prepare request body with only the essential information
    const requestBody = {
      callId,
      userId,
    };

    // Log request details for debugging
    console.log(`Making request to /calls/join using axios`);
    console.log(`Request body:`, requestBody);

    try {
      const response = await axiosInstance.post("/calls/join", requestBody);
      const data = response.data;
      return {
        success: true,
        roomId: data.roomId,
        type: data.type || "AUDIO",
      };
    } catch (axiosError: any) {
      // Extract error message from the response if available
      let errorMessage =
        axiosError.response?.data?.message ||
        axiosError.message ||
        "Failed to join call";

      // Log the detailed error information
      console.error(`API error joining call: ${errorMessage}`, {
        status: axiosError.response?.status,
        statusText: axiosError.response?.statusText,
        data: axiosError.response?.data,
        headers: axiosError.response?.headers,
        config: {
          url: axiosError.config?.url,
          method: axiosError.config?.method,
          baseURL: axiosError.config?.baseURL,
        },
      });

      // Enhance error message for better user experience
      if (axiosError.response?.status === 403) {
        errorMessage = "User is not allowed to join this call";
      } else if (axiosError.response?.status === 404) {
        errorMessage = "Call not found or already ended";
      } else if (axiosError.response?.status === 401) {
        errorMessage = "Authentication failed. Please log in again";
      }

      return {
        success: false,
        message: errorMessage,
      };
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error("Error joining call:", error);
    return {
      success: false,
      message: errorMessage,
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

    // Import axios instance
    const { createAxiosInstance } = await import("@/lib/axios");

    // Create a custom axios instance with the token
    const axiosInstance = createAxiosInstance(cleanToken);

    // Extract user ID from token
    const userId = extractUserIdFromToken(cleanToken);
    console.log(`Extracted userId from token for room creation: ${userId}`);

    // Prepare request body
    const requestBody = {
      callId,
      userId,
    };

    // Log request details for debugging
    console.log(`Making request to /calls/room using axios`);
    console.log(`Request body:`, requestBody);

    const response = await axiosInstance.post("/calls/room", requestBody);
    const data = response.data;
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

    // Import axios instance
    const { createAxiosInstance } = await import("@/lib/axios");

    // Create a custom axios instance with the token
    const axiosInstance = createAxiosInstance(cleanToken);

    // Log thông tin request để debug
    console.log(`Making request to /calls/user/active using axios`);

    try {
      const response = await axiosInstance.get("/calls/user/active");
      const data = response.data;

      return {
        success: true,
        activeCall: data,
      };
    } catch (error: any) {
      // Check if it's a 404 error (no active call)
      if (error.response && error.response.status === 404) {
        // No active call is not an error
        return { success: true, activeCall: null };
      }

      // Other errors
      return {
        success: false,
        message: error.response?.data?.message || "Failed to get active call",
      };
    }
  } catch (error) {
    console.error("Error getting active call:", error);
    return {
      success: false,
      message: "Internal server error",
    };
  }
}
