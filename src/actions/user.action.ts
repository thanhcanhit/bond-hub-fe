//"use server";
import axiosInstance from "@/lib/axios";
import { useAuthStore } from "@/stores/authStore";
import { User } from "@/types/base";
import { AxiosError } from "axios";
import {
  getCachedUserData,
  cacheUserData,
  removeCachedUserData,
} from "@/utils/userCache";

// Lấy danh sách tất cả users
export async function getAllUsers() {
  try {
    const response = await axiosInstance.get("/users");
    const users: User[] = response.data;
    return { success: true, users };
  } catch (error) {
    console.error("Get all users failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Lấy thông tin user theo ID
export async function getUserDataById(id: string, token?: string) {
  try {
    // Kiểm tra id hợp lệ
    if (!id || typeof id !== "string" || id.trim() === "") {
      console.error("[USER_ACTION] Invalid user ID provided:", id);
      return {
        success: false,
        error: "Invalid user ID",
      };
    }

    // Check if user data is in cache and still valid
    const cachedUser = getCachedUserData(id);
    if (cachedUser) {
      console.log(`[USER_ACTION] Using cached user data for ID: ${id}`);
      return { success: true, user: cachedUser };
    }

    console.log(`[USER_ACTION] Fetching user data for ID: ${id}`);

    // Add timeout to the request to prevent hanging
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

    try {
      // Set up request config
      const config: any = {
        signal: controller.signal,
      };

      // If token is provided, use it in the request
      if (token) {
        config.headers = {
          ...config.headers,
          Authorization: `Bearer ${token}`,
        };
        console.log(`[USER_ACTION] Using provided token for user data request`);
      }

      const response = await axiosInstance.get(`/users/${id}`, config);

      clearTimeout(timeoutId);

      const user: User = response.data;
      console.log(
        `[USER_ACTION] Successfully fetched user data for ID: ${id}`,
        user,
      );

      // Store user data in cache
      cacheUserData(id, user);

      return { success: true, user };
    } catch (requestError) {
      clearTimeout(timeoutId);
      throw requestError; // Re-throw to be caught by the outer catch
    }
  } catch (error) {
    console.error(`[USER_ACTION] Get user by ID failed for ID ${id}:`, error);

    // Check if this is a timeout or abort error
    if (
      error &&
      typeof error === "object" &&
      "name" in error &&
      (error.name === "AbortError" || error.name === "TimeoutError")
    ) {
      console.warn(`[USER_ACTION] Request timed out for user ID: ${id}`);

      // Try to get from cache even if expired as fallback
      const expiredCachedUser = getCachedUserData(id, true);
      if (expiredCachedUser) {
        console.log(
          `[USER_ACTION] Using expired cached user data for ID: ${id} after timeout`,
        );
        return { success: true, user: expiredCachedUser };
      }
    }

    // Tạo user giả nếu không tìm thấy (chỉ cho mục đích hiển thị UI)
    const axiosError = error as AxiosError;
    if (axiosError.response && axiosError.response.status === 404) {
      console.log(`[USER_ACTION] Creating placeholder user for ID ${id}`);
      const placeholderUser: User = {
        id: id,
        email: null,
        phoneNumber: null,
        passwordHash: "",
        createdAt: new Date(),
        updatedAt: new Date(),
        userInfo: {
          id: id,
          fullName: "Người dùng",
          profilePictureUrl: null,
          statusMessage: "",
          blockStrangers: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          userAuth: null as unknown as User,
        },
        refreshTokens: [],
        qrCodes: [],
        posts: [],
        stories: [],
        groupMembers: [],
        cloudFiles: [],
        pinnedItems: [],
        sentFriends: [],
        receivedFriends: [],
        contacts: [],
        contactOf: [],
        settings: [],
        postReactions: [],
        hiddenPosts: [],
        addedBy: [],
        notifications: [],
        sentMessages: [],
        receivedMessages: [],
        comments: [],
      };

      // Cache the placeholder user too
      cacheUserData(id, placeholderUser);

      return { success: true, user: placeholderUser };
    }

    // For any other error, create a generic placeholder user
    console.log(
      `[USER_ACTION] Creating generic placeholder user for ID ${id} due to error`,
    );
    const genericUser: User = {
      id: id,
      email: null,
      phoneNumber: null,
      passwordHash: "",
      createdAt: new Date(),
      updatedAt: new Date(),
      userInfo: {
        id: id,
        fullName: "Người dùng",
        profilePictureUrl: null,
        statusMessage: "",
        blockStrangers: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        userAuth: null as unknown as User,
      },
      refreshTokens: [],
      qrCodes: [],
      posts: [],
      stories: [],
      groupMembers: [],
      cloudFiles: [],
      pinnedItems: [],
      sentFriends: [],
      receivedFriends: [],
      contacts: [],
      contactOf: [],
      settings: [],
      postReactions: [],
      hiddenPosts: [],
      addedBy: [],
      notifications: [],
      sentMessages: [],
      receivedMessages: [],
      comments: [],
    };

    // Cache the generic user too
    cacheUserData(id, genericUser);

    return { success: true, user: genericUser };
  }
}

// Batch fetch multiple users at once
export async function batchGetUserData(userIds: string[]) {
  // Filter out duplicate IDs
  const uniqueIds = [...new Set(userIds)];

  // Check which users are already in cache
  const cachedUsers: User[] = [];
  const idsToFetch: string[] = [];

  uniqueIds.forEach((id) => {
    const cachedUser = getCachedUserData(id);
    if (cachedUser) {
      cachedUsers.push(cachedUser);
    } else {
      idsToFetch.push(id);
    }
  });

  // If all users are in cache, return immediately
  if (idsToFetch.length === 0) {
    console.log(`All ${uniqueIds.length} users found in cache`);
    return { success: true, users: cachedUsers };
  }

  // Otherwise, fetch the remaining users
  try {
    console.log(`Batch fetching ${idsToFetch.length} users`);

    // Fetch each user individually (could be optimized with a batch API endpoint)
    const fetchPromises = idsToFetch.map((id) => getUserDataById(id));
    const results = await Promise.all(fetchPromises);

    // Combine cached and newly fetched users
    const fetchedUsers = results
      .filter((result) => result.success && result.user)
      .map((result) => result.user as User);

    const allUsers = [...cachedUsers, ...fetchedUsers];

    return { success: true, users: allUsers };
  } catch (error) {
    console.error("Batch get users failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      users: cachedUsers, // Return any cached users we did find
    };
  }
}

// Lấy thông tin cơ bản của user theo ID
export async function getUserBasicInfo(id: string) {
  try {
    const response = await axiosInstance.get(`/users/${id}/basic-info`);
    const userInfo = response.data; // Type tùy thuộc vào định nghĩa của bạn
    return { success: true, userInfo };
  } catch (error) {
    console.error("Get user basic info failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Cập nhật thông tin user (giả sử backend có endpoint PATCH /users/:id)
export async function updateUser(id: string, userData: Partial<User>) {
  try {
    const response = await axiosInstance.patch(`/users/${id}`, userData);
    const updatedUser: User = response.data;

    // Cập nhật lại thông tin trong store nếu user hiện tại đang được chỉnh sửa
    const currentUser = useAuthStore.getState().user;
    if (currentUser && currentUser.id === id) {
      useAuthStore.getState().updateUser(updatedUser);
    }

    // Update the cache with the new user data
    cacheUserData(id, updatedUser);

    return { success: true, user: updatedUser };
  } catch (error) {
    console.error("Update user failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Xóa user (giả sử backend có endpoint DELETE /users/:id)
export async function deleteUser(id: string) {
  try {
    await axiosInstance.delete(`/users/${id}`);

    // Nếu user hiện tại bị xóa, thực hiện logout
    const currentUser = useAuthStore.getState().user;
    if (currentUser && currentUser.id === id) {
      useAuthStore.getState().logout();
    }

    // Remove from cache if exists
    removeCachedUserData(id);

    return { success: true };
  } catch (error) {
    console.error("Delete user failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Upload profile picture
export async function updateProfilePicture(file: File) {
  try {
    // Make sure file is not undefined
    if (!file) {
      throw new Error("No file selected");
    }

    const formData = new FormData();
    formData.append("file", file);

    // Change the content type to multipart/form-data
    const response = await axiosInstance.put(
      "/auth/update-profile-picture",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      },
    );

    const { message, url } = response.data;

    // Thêm timestamp vào URL để tránh cache
    const urlWithTimestamp = `${url}?t=${new Date().getTime()}`;

    // Lấy dữ liệu user hiện tại từ store
    const currentUser = useAuthStore.getState().user;
    if (currentUser && currentUser.id) {
      // Cập nhật ngay lập tức trong store với URL mới có timestamp
      if (currentUser.userInfo) {
        const updatedUser = {
          ...currentUser,
          userInfo: {
            ...currentUser.userInfo,
            profilePictureUrl: urlWithTimestamp,
          },
        };

        // Cập nhật store
        useAuthStore.getState().updateUser(updatedUser);

        // Cập nhật cache
        cacheUserData(currentUser.id, updatedUser);

        console.log(
          "Profile picture immediately updated in store with timestamp",
        );
      }

      // Sau đó, thử lấy dữ liệu đầy đủ từ server (không chờ đợi)
      getUserDataById(currentUser.id)
        .then((userResponse) => {
          if (userResponse.success && userResponse.user) {
            // Đảm bảo URL hình ảnh mới có timestamp
            const serverUser = userResponse.user;
            if (serverUser.userInfo && serverUser.userInfo.profilePictureUrl) {
              serverUser.userInfo.profilePictureUrl = `${serverUser.userInfo.profilePictureUrl}?t=${new Date().getTime()}`;
            }

            // Cập nhật store với dữ liệu đầy đủ từ server
            useAuthStore.getState().updateUser(serverUser);

            // Cập nhật cache
            cacheUserData(currentUser.id, serverUser);

            console.log(
              "User data updated from database after profile picture change",
            );
          }
        })
        .catch((fetchError) => {
          console.error("Error fetching updated user data:", fetchError);
          // Không cần làm gì vì đã cập nhật store trước đó
        });
    }

    // Trả về URL có timestamp để client có thể sử dụng ngay
    return { success: true, message, url: urlWithTimestamp };
  } catch (error) {
    console.error("Update profile picture failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Upload cover image
export async function updateCoverImage(file: File) {
  try {
    // Make sure file is not undefined
    if (!file) {
      throw new Error("No file selected");
    }

    const formData = new FormData();
    formData.append("file", file);

    // Change the content type to multipart/form-data
    const response = await axiosInstance.put(
      "/auth/update-cover-image",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      },
    );

    const { message, url } = response.data;

    // Thêm timestamp vào URL để tránh cache
    const urlWithTimestamp = `${url}?t=${new Date().getTime()}`;

    // Lấy dữ liệu user hiện tại từ store
    const currentUser = useAuthStore.getState().user;
    if (currentUser && currentUser.id) {
      // Cập nhật ngay lập tức trong store với URL mới có timestamp
      if (currentUser.userInfo) {
        const updatedUser = {
          ...currentUser,
          userInfo: {
            ...currentUser.userInfo,
            coverImgUrl: urlWithTimestamp,
          },
        };

        // Cập nhật store
        useAuthStore.getState().updateUser(updatedUser);

        // Cập nhật cache
        cacheUserData(currentUser.id, updatedUser);

        console.log("Cover image immediately updated in store with timestamp");
      }

      // Sau đó, thử lấy dữ liệu đầy đủ từ server (không chờ đợi)
      getUserDataById(currentUser.id)
        .then((userResponse) => {
          if (userResponse.success && userResponse.user) {
            // Đảm bảo URL hình ảnh mới có timestamp
            const serverUser = userResponse.user;
            if (serverUser.userInfo && serverUser.userInfo.coverImgUrl) {
              serverUser.userInfo.coverImgUrl = `${serverUser.userInfo.coverImgUrl}?t=${new Date().getTime()}`;
            }

            // Cập nhật store với dữ liệu đầy đủ từ server
            useAuthStore.getState().updateUser(serverUser);

            // Cập nhật cache
            cacheUserData(currentUser.id, serverUser);

            console.log(
              "User data updated from database after cover image change",
            );
          }
        })
        .catch((fetchError) => {
          console.error("Error fetching updated user data:", fetchError);
          // Không cần làm gì vì đã cập nhật store trước đó
        });
    }

    // Trả về URL có timestamp để client có thể sử dụng ngay
    return { success: true, message, url: urlWithTimestamp };
  } catch (error) {
    console.error("Update cover image failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Cập nhật thông tin cơ bản của người dùng
export async function updateUserBasicInfo(userData: {
  fullName?: string;
  phoneNumber?: string;
  bio?: string;
  gender?: string;
  dateOfBirth?: Date;
}) {
  try {
    const currentUser = useAuthStore.getState().user;
    if (!currentUser || !currentUser.id) {
      throw new Error("User not authenticated");
    }

    // Cập nhật ngay lập tức trong store trước khi gọi API
    // Điều này giúp UI cập nhật ngay lập tức
    if (currentUser.userInfo) {
      // Xử lý gender để đảm bảo đúng kiểu Gender
      let updatedGender = currentUser.userInfo.gender;
      if (userData.gender) {
        // Chuyển đổi string thành Gender enum
        if (
          userData.gender === "MALE" ||
          userData.gender === "FEMALE" ||
          userData.gender === "OTHER"
        ) {
          updatedGender = userData.gender as any; // Ép kiểu an toàn vì đã kiểm tra giá trị
        }
      }

      const immediateUpdatedUserInfo = {
        ...currentUser.userInfo,
        fullName: userData.fullName || currentUser.userInfo.fullName,
        gender: updatedGender,
        dateOfBirth: userData.dateOfBirth || currentUser.userInfo.dateOfBirth,
        bio: userData.bio || currentUser.userInfo.bio,
      };

      const immediateUserToUpdate = {
        ...currentUser,
        userInfo: immediateUpdatedUserInfo,
      };

      // Cập nhật store ngay lập tức
      useAuthStore.getState().updateUser(immediateUserToUpdate);

      // Cập nhật cache
      cacheUserData(currentUser.id, immediateUserToUpdate as User);

      console.log("Basic info immediately updated in store");
    }

    // Gọi API để cập nhật thông tin trên server
    const response = await axiosInstance.put(
      `/auth/update-basic-info`,
      userData,
    );
    const updatedUser = response.data;

    // Sau khi API thành công, lấy dữ liệu mới từ server (không chờ đợi)
    // Sử dụng Promise để không chặn luồng chính
    getUserDataById(currentUser.id)
      .then((userResponse) => {
        if (userResponse.success && userResponse.user) {
          // Cập nhật toàn bộ dữ liệu user trong store
          useAuthStore.getState().updateUser(userResponse.user);

          // Cập nhật cache
          cacheUserData(currentUser.id, userResponse.user);

          console.log(
            "User data updated from database after basic info change",
          );
        }
      })
      .catch((fetchError) => {
        console.error("Error fetching updated user data:", fetchError);
        // Không cần làm gì vì đã cập nhật store trước đó
      });

    // Trả về kết quả thành công ngay lập tức
    return {
      success: true,
      user: updatedUser,
      // Thêm thông tin đã cập nhật để UI có thể sử dụng ngay
      updatedInfo: {
        fullName: userData.fullName,
        gender: userData.gender,
        dateOfBirth: userData.dateOfBirth,
        bio: userData.bio,
      },
    };
  } catch (error) {
    console.error("Update user basic info failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Tìm kiếm người dùng theo email hoặc số điện thoại
export async function searchUser(searchValue: string) {
  try {
    // Kiểm tra xem searchValue có phải là email không
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(searchValue);

    // Tạo payload phù hợp dựa trên loại tìm kiếm
    const payload = isEmail
      ? { email: searchValue }
      : { phoneNumber: searchValue };

    const response = await axiosInstance.post("/users/search", payload);

    // Cache the found user
    if (response.data && response.data.id) {
      cacheUserData(response.data.id, response.data);
    }

    return { success: true, user: response.data };
  } catch (error) {
    // Kiểm tra nếu là lỗi 404 (không tìm thấy)
    const axiosError = error as AxiosError;
    if (axiosError.response && axiosError.response.status === 404) {
      // Kiểm tra lại isEmail vì nó đã ra khỏi phạm vi của try
      const isEmailSearch = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(searchValue);
      console.log(
        `Không tìm thấy người dùng với ${isEmailSearch ? "email" : "số điện thoại"}: ${searchValue}`,
      );
      // Trả về success: false nhưng không có thông báo lỗi để UI hiển thị "Không tìm thấy"
      return { success: false };
    }

    console.error("Search user failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Tìm kiếm người dùng theo số điện thoại (giữ lại để tương thích ngược)
export async function searchUserByPhoneNumber(phoneNumber: string) {
  return searchUser(phoneNumber);
}
