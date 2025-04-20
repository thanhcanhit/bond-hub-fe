import axios, {
  AxiosError,
  AxiosInstance,
  AxiosRequestConfig,
  InternalAxiosRequestConfig,
} from "axios";
import { useAuthStore } from "@/stores/authStore";

const NEXT_PUBLIC_BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

// Token refresh state management
let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

// Define response types for better type safety
interface RefreshTokenResponse {
  accessToken: string;
  device?: {
    id: string;
    name: string;
    type: string;
  };
}

// Create a base axios instance with common configuration
const createBaseAxiosInstance = (): AxiosInstance => {
  return axios.create({
    baseURL: NEXT_PUBLIC_BACKEND_URL,
    headers: { "Content-Type": "application/json" },
    timeout: 15000, // 15 seconds timeout
  });
};

// Create an axios instance specifically for refresh token operations
export const refreshTokenAxios = createBaseAxiosInstance();

// Add network error handling for the refresh token axios instance
refreshTokenAxios.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.code === "ECONNABORTED") {
      return Promise.reject(new Error("Request timeout during token refresh"));
    }

    if (!error.response) {
      return Promise.reject(new Error("Network error during token refresh"));
    }

    return Promise.reject(error);
  },
);

// Create an axios instance with an optional token
export const createAxiosInstance = (token?: string): AxiosInstance => {
  const instance = createBaseAxiosInstance();

  // Add token to headers if provided
  if (token && token.trim() !== "") {
    instance.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  }

  // Add network error handling
  instance.interceptors.response.use(
    (response) => response,
    (error: AxiosError) => {
      if (error.code === "ECONNABORTED") {
        return Promise.reject(new Error("Request timeout. Please try again."));
      }

      if (!error.response) {
        return Promise.reject(
          new Error("Network error. Please check your connection."),
        );
      }

      return Promise.reject(error);
    },
  );

  return instance;
};

// Main axios instance with full authentication handling
const axiosInstance = createBaseAxiosInstance();

// Add token to all requests
axiosInstance.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    try {
      const accessToken = useAuthStore.getState().accessToken;

      if (accessToken) {
        config.headers = config.headers || {};
        config.headers.Authorization = `Bearer ${accessToken}`;
      }
      return config;
    } catch (error) {
      console.error("Error in axios request interceptor:", error);
      return config;
    }
  },
  (error) => Promise.reject(error),
);

// Function to add a request to the refresh token subscribers queue
const subscribeTokenRefresh = (callback: (token: string) => void) => {
  refreshSubscribers.push(callback);
};

// Function to notify all subscribers that the token has been refreshed
const onTokenRefreshed = (token: string) => {
  refreshSubscribers.forEach((callback) => callback(token));
  refreshSubscribers = [];
};

// Function to refresh the authentication token
const refreshAuthToken = async (): Promise<string> => {
  try {
    const authState = useAuthStore.getState();
    const refreshToken = authState.refreshToken;
    const deviceId = authState.deviceId;

    console.log("Starting token refresh process");
    console.log("Current refresh token:", refreshToken);
    console.log("Current device ID:", deviceId);

    if (!refreshToken) {
      throw new Error("No refresh token available");
    }

    if (!deviceId) {
      throw new Error("No device ID available");
    }

    const response = await refreshTokenAxios.post<RefreshTokenResponse>(
      "/auth/refresh",
      {
        refreshToken,
        deviceId,
      },
    );
    console.log("Refresh token response:", response.data);

    if (!response.data || !response.data.accessToken) {
      throw new Error("Invalid response from refresh token API");
    }

    const { accessToken } = response.data;

    // Keep the same refreshToken since backend doesn't return a new one
    useAuthStore.getState().setTokens(accessToken, refreshToken);

    console.log(
      `Token refresh completed successfully. New token: ${accessToken.substring(0, 10)}...`,
    );

    return accessToken;
  } catch (error) {
    console.error(
      "Error during token refresh:",
      error instanceof Error ? error.message : "Unknown error",
    );

    // Only logout immediately for critical errors
    // For most errors, we'll let the interceptor handle it with a delay
    if (
      axios.isAxiosError(error) &&
      error.response?.status === 403 // Forbidden - e.g., refresh token blacklisted
    ) {
      console.log(
        "Logging out immediately due to forbidden error during token refresh",
      );
      // Clear auth state on critical refresh token failure
      await useAuthStore.getState().logout();
    }

    throw error;
  } finally {
    console.log("Token refresh process completed, resetting isRefreshing flag");
    isRefreshing = false;
  }
};

// Handle response errors, including 401 Unauthorized with token refresh
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    // Handle network errors
    if (error.code === "ECONNABORTED") {
      return Promise.reject(new Error("Request timeout. Please try again."));
    }

    if (!error.response) {
      return Promise.reject(
        new Error("Network error. Please check your connection."),
      );
    }

    const originalRequest = error.config as AxiosRequestConfig & {
      _retry?: boolean;
    };

    // Handle 401 Unauthorized errors by refreshing the token
    if (error.response?.status === 401 && !originalRequest._retry) {
      console.log(
        `Received 401 error for request to ${originalRequest.url}, attempting to refresh token...`,
      );

      // Mark this request as retried to prevent infinite loops
      originalRequest._retry = true;

      // Check if we have the necessary data to refresh the token
      const authState = useAuthStore.getState();
      const refreshToken = authState.refreshToken;
      const deviceId = authState.deviceId;

      if (!refreshToken || !deviceId) {
        console.error(
          "Cannot refresh token: Missing refresh token or device ID",
        );
        // Log the error but don't logout immediately - let the error propagate
        // This allows the UI to handle the error gracefully
        return Promise.reject(
          new Error("Session expired. Please login again."),
        );
      }

      // If a token refresh is already in progress, queue this request
      if (isRefreshing) {
        console.log(
          `Token refresh already in progress, queuing request to ${originalRequest.url}`,
        );
        return new Promise((resolve, reject) => {
          subscribeTokenRefresh((token) => {
            console.log(
              `Processing queued request to ${originalRequest.url} with refreshed token`,
            );
            if (originalRequest.headers) {
              originalRequest.headers["Authorization"] = `Bearer ${token}`;
            } else {
              originalRequest.headers = { Authorization: `Bearer ${token}` };
            }
            resolve(axiosInstance(originalRequest));
          });

          // Add timeout to avoid waiting indefinitely
          setTimeout(() => {
            reject(new Error("Token refresh timeout"));
          }, 15000); // 15 seconds timeout
        });
      }

      // Start a new token refresh process
      console.log("Starting new token refresh process");
      isRefreshing = true;

      try {
        const newToken = await refreshAuthToken();

        // Notify all subscribers that the token has been refreshed
        console.log(
          `Notifying ${refreshSubscribers.length} queued requests about token refresh`,
        );
        onTokenRefreshed(newToken);

        // Update the authorization header and retry the original request
        console.log(
          `Retrying original request to ${originalRequest.url} with new token`,
        );
        if (originalRequest.headers) {
          originalRequest.headers["Authorization"] = `Bearer ${newToken}`;
        } else {
          originalRequest.headers = { Authorization: `Bearer ${newToken}` };
        }
        return axiosInstance(originalRequest);
      } catch (error) {
        // If token refresh fails, notify all subscribers to prevent hanging requests
        console.error(
          "Token refresh failed:",
          error instanceof Error ? error.message : "Unknown error",
        );
        console.log(
          `Notifying ${refreshSubscribers.length} queued requests about token refresh failure`,
        );
        onTokenRefreshed(""); // Empty token will cause subscribers to fail properly

        // Only logout if the error is a 401 or network error
        if (
          axios.isAxiosError(error) &&
          (error.response?.status === 401 || !error.response)
        ) {
          console.log(
            "Logging out due to authentication error during token refresh",
          );
          // We'll logout after a short delay to allow current operations to complete
          setTimeout(() => {
            useAuthStore
              .getState()
              .logout()
              .catch((e) => console.error("Error during delayed logout:", e));
          }, 500);
        }

        return Promise.reject(
          new Error("Session expired. Please login again."),
        );
      }
    }

    // For all other errors, just reject with the original error
    return Promise.reject(error);
  },
);

export default axiosInstance;
