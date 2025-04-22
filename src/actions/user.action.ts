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
export async function getUserDataById(id: string) {
  try {
    // Kiểm tra id hợp lệ
    if (!id || typeof id !== "string" || id.trim() === "") {
      console.error("Invalid user ID provided:", id);
      return {
        success: false,
        error: "Invalid user ID",
      };
    }

    // Check if user data is in cache and still valid
    const cachedUser = getCachedUserData(id);
    if (cachedUser) {
      console.log(`Using cached user data for ID: ${id}`);
      return { success: true, user: cachedUser };
    }

    console.log(`Fetching user data for ID: ${id}`);
    const response = await axiosInstance.get(`/users/${id}`);
    const user: User = response.data;

    // Store user data in cache
    cacheUserData(id, user);

    return { success: true, user };
  } catch (error) {
    console.error(`Get user by ID failed for ID ${id}:`, error);

    // Tạo user giả nếu không tìm thấy (chỉ cho mục đích hiển thị UI)
    const axiosError = error as AxiosError;
    if (axiosError.response && axiosError.response.status === 404) {
      console.log(`Creating placeholder user for ID ${id}`);
      const placeholderUser: User = {
        id: id,
        email: null,
        phoneNumber: null,
        passwordHash: "",
        createdAt: new Date(),
        updatedAt: new Date(),
        userInfo: {
          id: id,
          fullName: "Người dùng không tồn tại",
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

    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
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

    // Lấy dữ liệu user mới nhất từ database
    const currentUser = useAuthStore.getState().user;
    if (currentUser && currentUser.id) {
      try {
        // Gọi API lấy dữ liệu user mới nhất
        const userResponse = await getUserDataById(currentUser.id);

        if (userResponse.success && userResponse.user) {
          // Cập nhật toàn bộ dữ liệu user trong store
          useAuthStore.getState().updateUser(userResponse.user);
          console.log(
            "User data updated from database after profile picture change",
          );
        } else {
          // Nếu không lấy được dữ liệu mới, chỉ cập nhật URL ảnh
          if (currentUser.userInfo) {
            const updatedUser = {
              ...currentUser,
              userInfo: {
                ...currentUser.userInfo,
                profilePictureUrl: url,
              },
            };
            useAuthStore.getState().updateUser(updatedUser);

            // Update cache
            cacheUserData(currentUser.id, updatedUser);

            console.log("Only profile picture URL updated in store");
          }
        }
      } catch (fetchError) {
        console.error("Error fetching updated user data:", fetchError);
        // Nếu có lỗi khi lấy dữ liệu mới, chỉ cập nhật URL ảnh
        if (currentUser.userInfo) {
          const updatedUser = {
            ...currentUser,
            userInfo: {
              ...currentUser.userInfo,
              profilePictureUrl: url,
            },
          };
          useAuthStore.getState().updateUser(updatedUser);

          // Update cache
          cacheUserData(currentUser.id, updatedUser);
        }
      }
    }

    return { success: true, message, url };
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

    // Lấy dữ liệu user mới nhất từ database
    const currentUser = useAuthStore.getState().user;
    if (currentUser && currentUser.id) {
      try {
        // Gọi API lấy dữ liệu user mới nhất
        const userResponse = await getUserDataById(currentUser.id);

        if (userResponse.success && userResponse.user) {
          // Cập nhật toàn bộ dữ liệu user trong store
          useAuthStore.getState().updateUser(userResponse.user);
          console.log(
            "User data updated from database after cover image change",
          );
        } else {
          // Nếu không lấy được dữ liệu mới, chỉ cập nhật URL ảnh bìa
          if (currentUser.userInfo) {
            const updatedUser = {
              ...currentUser,
              userInfo: {
                ...currentUser.userInfo,
                coverImgUrl: url,
              },
            };
            useAuthStore.getState().updateUser(updatedUser);

            // Update cache
            cacheUserData(currentUser.id, updatedUser);

            console.log("Only cover image URL updated in store");
          }
        }
      } catch (fetchError) {
        console.error("Error fetching updated user data:", fetchError);
        // Nếu có lỗi khi lấy dữ liệu mới, chỉ cập nhật URL ảnh bìa
        if (currentUser.userInfo) {
          const updatedUser = {
            ...currentUser,
            userInfo: {
              ...currentUser.userInfo,
              coverImgUrl: url,
            },
          };
          useAuthStore.getState().updateUser(updatedUser);

          // Update cache
          cacheUserData(currentUser.id, updatedUser);
        }
      }
    }

    return { success: true, message, url };
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

    const response = await axiosInstance.put(
      `/auth/update-basic-info`,
      userData,
    );
    const updatedUser = response.data;

    // Lấy dữ liệu user mới nhất từ database
    try {
      // Gọi API lấy dữ liệu user mới nhất
      const userResponse = await getUserDataById(currentUser.id);

      if (userResponse.success && userResponse.user) {
        // Cập nhật toàn bộ dữ liệu user trong store
        useAuthStore.getState().updateUser(userResponse.user);
        console.log("User data updated from database after basic info change");
      } else {
        // Nếu không lấy được dữ liệu mới, cập nhật dựa trên dữ liệu hiện tại
        if (currentUser.userInfo) {
          const updatedUserInfo = {
            ...currentUser.userInfo,
            fullName: userData.fullName || currentUser.userInfo.fullName,
            gender: userData.gender || currentUser.userInfo.gender,
            dateOfBirth:
              userData.dateOfBirth || currentUser.userInfo.dateOfBirth,
            bio: userData.bio || currentUser.userInfo.bio,
          };

          const userToUpdate = {
            ...updatedUser,
            userInfo: updatedUserInfo,
          };

          useAuthStore.getState().updateUser(userToUpdate);

          // Update cache
          cacheUserData(currentUser.id, userToUpdate);

          console.log("Basic info updated in store using local data");
        } else {
          useAuthStore.getState().updateUser(updatedUser);

          // Update cache
          cacheUserData(currentUser.id, updatedUser);
        }
      }
    } catch (fetchError) {
      console.error("Error fetching updated user data:", fetchError);
      // Nếu có lỗi khi lấy dữ liệu mới, cập nhật dựa trên dữ liệu hiện tại
      if (currentUser.userInfo) {
        const updatedUserInfo = {
          ...currentUser.userInfo,
          fullName: userData.fullName || currentUser.userInfo.fullName,
          gender: userData.gender || currentUser.userInfo.gender,
          dateOfBirth: userData.dateOfBirth || currentUser.userInfo.dateOfBirth,
          bio: userData.bio || currentUser.userInfo.bio,
        };

        const userToUpdate = {
          ...updatedUser,
          userInfo: updatedUserInfo,
        };

        useAuthStore.getState().updateUser(userToUpdate);

        // Update cache
        cacheUserData(currentUser.id, userToUpdate);
      } else {
        useAuthStore.getState().updateUser(updatedUser);

        // Update cache
        cacheUserData(currentUser.id, updatedUser);
      }
    }

    return { success: true, user: updatedUser };
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
