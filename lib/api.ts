import axios from "axios";
//import { useAuthStore } from "../stores/authStore";

const api = axios.create({
  baseURL: "http://localhost:3000", // Đổi thành URL backend
  withCredentials: true,
});

// Middleware tự động refresh token khi hết hạn
// api.interceptors.response.use(
//   (response) => response,
//   async (error) => {
//     if (error.response?.status === 401) {
//       const refreshToken = localStorage.getItem('refreshToken'); // Get from local storage
//       if (!refreshToken) {
//         console.error("No refresh token found");
//         useAuthStore.getState().logout(); // Or handle appropriately
//         return Promise.reject(error); // Stop the request chain
//       }

//       try {
//         const res = await axios.post(
//           "/auth/refresh",
//           {},
//           {
//             headers: { 'refresh-token': refreshToken }, // Send refresh token in header
//             withCredentials: true,
//           },
//         );
//         // useAuthStore.getState().setAccessToken(res.data.accessToken);
//         // return api(error.config);
//         localStorage.setItem('accessToken', res.data.accessToken); // Update access token
//         useAuthStore.getState().setAccessToken(res.data.accessToken);
//         return api(error.config);
//       } catch (refreshError) {
//         console.error("Refresh token error:", refreshError);
//         localStorage.removeItem('accessToken');
//         localStorage.removeItem('refreshToken');
//         useAuthStore.getState().logout();
//         return Promise.reject(refreshError); // Important: Reject the refresh error
//       }
//     }
//     return Promise.reject(error);
//   },
// );

export default api;