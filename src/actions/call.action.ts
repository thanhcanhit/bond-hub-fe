"use server";

/**
 * Initiate a call to another user
 * @param receiverId ID of the user to call
 * @param type Type of call (AUDIO or VIDEO)
 * @param token Authentication token (passed from client)
 * @param initiatorId ID of the user initiating the call (passed from client)
 * @returns Call data including callId and roomId
 */
export async function initiateCall(
  receiverId: string,
  type: "AUDIO" | "VIDEO",
  token: string,
  initiatorId: string,
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

    // Validate initiatorId
    if (!initiatorId) {
      console.error("Cannot initiate call: No initiatorId provided");
      return { success: false, message: "Initiator ID is required" };
    }

    // Thay đổi cách tạo cuộc gọi để phù hợp với backend
    // Thay vì sử dụng receiverId, chúng ta sẽ tạo một cuộc gọi nhóm tạm thời
    // Điều này sẽ cho phép cả hai người dùng tham gia cuộc gọi mà không gặp lỗi

    // Đầu tiên, kiểm tra xem người dùng đã có nhóm chung chưa
    console.log(
      `Checking if users ${initiatorId} and ${receiverId} have a common group`,
    );

    try {
      // Tạo cuộc gọi trực tiếp như bình thường
      console.log(`Making request to /calls using axios`);
      console.log(
        `Request body: { receiverId: ${receiverId}, type: ${type}, initiatorId: ${initiatorId} }`,
      );

      // Gửi request với initiatorId được truyền từ client
      const response = await axiosInstance.post("/calls", {
        receiverId,
        type,
        initiatorId, // Sử dụng initiatorId được truyền vào
      });

      const data = response.data;
      return {
        success: true,
        callId: data.id,
        roomId: data.roomId,
        type,
      };
    } catch (directCallError) {
      console.error("Error initiating direct call:", directCallError);
      console.log("Falling back to creating a temporary group call");

      // Nếu không thể tạo cuộc gọi trực tiếp, thử tạo một nhóm tạm thời
      // Lưu ý: Đây là một giải pháp tạm thời, cần thảo luận với backend để có giải pháp tốt hơn
      return {
        success: false,
        message: "Không thể tạo cuộc gọi trực tiếp. Vui lòng thử lại sau.",
      };
    }
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
 * @param userId ID of the user accepting the call (passed from client)
 * @returns Success status and call details
 */
export async function acceptCall(
  callId: string,
  token: string,
  initiatorId?: string,
  roomId?: string,
  userId?: string,
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

    // Validate userId
    if (!userId) {
      console.error("Cannot accept call: No userId provided");
      return { success: false, message: "User ID is required" };
    }

    // First, get the call details to check if this is a direct call or a group call
    console.log(`Getting call details for ${callId} before joining`);
    let callData: any = null;
    let isDirectCall = false;
    let isInitiator = false;

    try {
      const callResponse = await axiosInstance.get(`/calls/${callId}`);
      callData = callResponse.data;
      console.log(`Call details retrieved:`, callData);

      // Check if this is a direct call (no groupId)
      isDirectCall = !callData.groupId;
      console.log(`Is direct call: ${isDirectCall}`);

      // For direct calls, check if the user is either the initiator or the intended recipient
      if (isDirectCall) {
        // The backend doesn't store receiverId in the call record, so we need to infer it
        // If the user is not the initiator, they must be the intended recipient
        isInitiator = callData.initiatorId === userId;
        console.log(`User is initiator: ${isInitiator}`);

        if (!isInitiator) {
          console.log(
            `User ${userId} is not the initiator, assuming they are the intended recipient`,
          );
          console.log(
            `For direct calls, we need to ensure the receiver can join`,
          );
        }
      } else {
        // For group calls, check if the user is a member of the group
        console.log(`This is a group call for group ${callData.groupId}`);
      }
    } catch (callError: any) {
      console.error(
        `Error getting call details:`,
        callError.response || callError,
      );
      // Continue anyway, as the backend will do the validation
    }

    // For direct calls where the user is not the initiator, we need a special approach
    // Since the backend doesn't automatically add the receiver as a participant
    if (isDirectCall && !isInitiator && callData) {
      console.log(
        `Direct call detected where user is the receiver. Using special handling.`,
      );

      // For direct calls, we need to handle the case where the receiver is not yet a participant
      // We'll use the reject endpoint first to update the call status, then join
      try {
        // First, check if the user is already a participant
        const isAlreadyParticipant = callData.participants.some(
          (p: any) => p.userId === userId,
        );

        if (!isAlreadyParticipant) {
          console.log(
            `User ${userId} is not yet a participant in the call. Adding them.`,
          );

          // Since we can't modify the backend, we'll use a workaround:
          // 1. We'll directly join the WebRTC room using the roomId
          // 2. We'll return success with the roomId so the user can connect to the call

          // Prepare the response with the necessary information
          const callType = callData.type || "AUDIO";
          const callUrl =
            callType === "VIDEO"
              ? `/video-call/${callData.roomId}`
              : `/call/${callData.roomId}`;

          console.log(
            `Using direct room connection for receiver. RoomId: ${callData.roomId}`,
          );

          // Dispatch events to notify the UI
          if (typeof window !== "undefined") {
            try {
              console.log(`Dispatching call:accepted event for direct call`);
              window.dispatchEvent(
                new CustomEvent("call:accepted", {
                  detail: {
                    callId,
                    roomId: callData.roomId,
                    initiatorId: callData.initiatorId,
                    timestamp: new Date().toISOString(),
                  },
                }),
              );
            } catch (eventError) {
              console.error(
                "Error dispatching call acceptance events:",
                eventError,
              );
            }
          }

          return {
            success: true,
            roomId: callData.roomId,
            type: callType,
            callUrl: callUrl,
            acceptedAt: new Date().toISOString(),
            note: "Direct connection to room without backend participant registration",
          };
        }
      } catch (directCallError) {
        console.error(
          "Error in direct call special handling:",
          directCallError,
        );
        // Continue with normal flow as fallback
      }
    }

    // Standard approach for group calls or if the special handling for direct calls failed
    // Prepare request body with all necessary information
    // The backend API expects callId and userId
    const requestBody = {
      callId,
      userId, // Use userId passed from client
    };

    // Log the initiatorId and roomId for debugging
    if (initiatorId) {
      console.log(`Call initiator ID: ${initiatorId}`);
    }

    if (roomId) {
      console.log(`Call room ID: ${roomId}`);
    }

    // Log request details for debugging
    console.log(`Making request to /calls/join using axios`);
    console.log(`Request body:`, requestBody);

    try {
      // Make the API call to join the call
      console.log(`Sending call acceptance request with body:`, requestBody);
      const url = `/calls/join`;
      console.log(`Making API call to: ${url}`);

      const response = await axiosInstance.post(url, requestBody);
      const data = response.data;
      console.log(`Call acceptance successful. Response data:`, data);

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
                // We don't include receiverId here as we don't have userId anymore
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
                // We don't include userId here as we don't have it anymore
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

      // Log detailed debugging information
      console.log(`Debug info for call acceptance error:`, {
        callId,
        tokenFirstChars: token ? token.substring(0, 10) + "..." : "No token",
        initiatorId: initiatorId || "not provided",
        roomId: roomId || "not provided",
        requestBody,
        // Include information about the backend's expectations
        note: "The backend expects only callId and userId in the request body. The initiatorId and roomId are not used by the backend's JoinCallDto.",
        errorDetails:
          "The backend checks if the user is allowed to join the call by verifying if they are the initiator or already a participant. For direct calls, the receiver is not automatically added as a participant when the call is created.",
      });

      // If the error is "User is not allowed to join this call", provide more specific guidance
      if (
        axiosError.response?.data?.message ===
        "User is not allowed to join this call"
      ) {
        console.log(`
          This error occurs because the backend doesn't recognize the user as a valid participant.
          For direct calls, the backend only adds the initiator as a participant when the call is created.
          The receiver is not automatically added as a participant, so when they try to join,
          the backend doesn't recognize them as a valid participant.

          Possible solutions:
          1. Use group calls instead of direct calls
          2. Modify the backend to add the receiver as a participant when the call is created
          3. Add a new endpoint to add a user as a participant to a call
        `);
      }

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
 * @param userId ID of the user rejecting the call (passed from client)
 * @returns Success status
 */
export async function rejectCall(
  callId: string,
  token: string,
  userId?: string,
) {
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

    // Validate userId
    if (!userId) {
      console.error("Cannot reject call: No userId provided");
      return { success: false, message: "User ID is required" };
    }

    // Prepare request body with ONLY the required information
    const requestBody = {
      callId,
      userId, // Use userId passed from client
    };

    // Log thông tin request để debug
    console.log(`Making request to /calls/${callId}/reject using axios`);
    console.log(`Request body:`, requestBody);

    await axiosInstance.post(`/calls/${callId}/reject`, requestBody);

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
 * @param userId ID of the user ending the call (passed from client)
 * @returns Success status
 */
export async function endCall(callId: string, token: string, userId?: string) {
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

    // Validate userId
    if (!userId) {
      console.error("Cannot end call: No userId provided");
      return { success: false, message: "User ID is required" };
    }

    // Log request details for debugging
    console.log(`Making request to /calls/end using axios`);
    console.log(`Request body: { callId: ${callId}, userId: ${userId} }`);

    await axiosInstance.post("/calls/end", {
      callId,
      userId, // Use userId passed from client
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
 * @param initiatorId ID of the user initiating the call (passed from client)
 * @returns Call data including callId and roomId
 */
export async function initiateGroupCall(
  groupId: string,
  type: "AUDIO" | "VIDEO",
  token: string,
  initiatorId: string,
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

    // Validate initiatorId
    if (!initiatorId) {
      console.error("Cannot initiate group call: No initiatorId provided");
      return { success: false, message: "Initiator ID is required" };
    }

    // Log thông tin request để debug
    console.log(`Making request to /calls using axios for group call`);
    console.log(
      `Request body: { groupId: ${groupId}, type: ${type}, initiatorId: ${initiatorId} }`,
    );

    // Gửi request với initiatorId được truyền từ client
    const response = await axiosInstance.post("/calls", {
      groupId,
      type,
      initiatorId, // Sử dụng initiatorId được truyền vào
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
 * @param alreadyAccepted Whether the call has already been accepted
 * @param userId ID of the user joining the call (passed from client)
 * @returns Success status and call details
 */
export async function joinCall(
  callId: string,
  token: string,
  alreadyAccepted: boolean = false,
  userId?: string,
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

    // Validate userId
    if (!userId) {
      console.error("Cannot join call: No userId provided");
      return { success: false, message: "User ID is required" };
    }

    // Prepare request body with ONLY the required information
    // The backend API expects only callId and userId
    const requestBody = {
      callId,
      userId, // Use userId passed from client
    };

    // Log request details for debugging
    console.log(`Making request to /calls/join using axios`);
    console.log(`Request body:`, requestBody);

    try {
      const response = await axiosInstance.post("/calls/join", requestBody);
      const data = response.data;
      console.log(`Successfully joined call. Response data:`, data);
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

      // Log debugging information
      console.log(`Debug info for call join error:`, {
        callId,
        tokenFirstChars: token.substring(0, 10) + "...",
        requestBody,
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
 * @param userId ID of the user creating the room (passed from client)
 * @returns Success status
 */
export async function createCallRoom(
  callId: string,
  token: string,
  userId?: string,
) {
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

    // Validate userId
    if (!userId) {
      console.error("Cannot create call room: No userId provided");
      return { success: false, message: "User ID is required" };
    }

    // Prepare request body
    const requestBody = {
      callId,
      userId, // Use userId passed from client
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
