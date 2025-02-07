// import axios from "axios";
// import { useAuthStore } from "../stores/authStore";

// const api = axios.create({
//   baseURL: "http://localhost:3000", // Đổi thành URL backend
// });

// // Middleware tự động refresh token khi hết hạn
// // api.interceptors.response.use(
// //   (response) => response,
// //   async (error) => {
// //     const originalRequest = error.config;
// //     if (error.response?.status === 401) {
// //       originalRequest._retry = true;
// //       const refreshToken = localStorage.getItem('refreshToken'); // Get from local storage
// //       if (!refreshToken) {
// //         console.error("No refresh token found");
// //         useAuthStore.getState().logout(); // Or handle appropriately
// //         return Promise.reject(error); // Stop the request chain
// //       }

// //       try {
// //         const res = await axios.post(
// //           "/auth/refresh",
// //           {},
// //           {
// //             headers: { 'refresh-token': refreshToken }, // Send refresh token in header
// //             withCredentials: true,
// //           },
// //         );
// //         // useAuthStore.getState().setAccessToken(res.data.accessToken);
// //         // return api(error.config);
// //         localStorage.setItem('accessToken', res.data.accessToken); // Update access token
// //         useAuthStore.getState().setAccessToken(res.data.accessToken);
// //         return api(error.config);
// //       } catch (refreshError) {
// //         console.error("Refresh token error:", refreshError);
// //         localStorage.removeItem('accessToken');
// //         localStorage.removeItem('refreshToken');
// //         useAuthStore.getState().logout();
// //         return Promise.reject(refreshError); // Important: Reject the refresh error
// //       }
// //     }
// //     return Promise.reject(error);
// //   },
// // );
// api.interceptors.response.use(
//   (response) => response,
//   async (error) => {
//     const originalRequest = error.config;

//     if (error.response?.status === 401 && !originalRequest._retry) {
//       originalRequest._retry = true; // Để tránh loop vô tận khi refresh token fail
//       const refreshToken = localStorage.getItem('refreshToken');

//       if (!refreshToken) {
//         console.error("No refresh token found");
//         useAuthStore.getState().logout();
//         return Promise.reject(error);
//       }

//       try {
//         const res = await axios.post(
//           "http://localhost:3000/auth/refresh",
//           {},
//           {
//             headers: { 'refresh-token': refreshToken },
//           }
//         );
//         const newAccessToken = res.data.accessToken;
//         const currentToken = localStorage.getItem("accessToken");

//         if (newAccessToken !== currentToken) { // ✅ Chỉ cập nhật nếu khác
//           localStorage.setItem('accessToken', newAccessToken);
//           useAuthStore.getState().setAccessToken(newAccessToken);
//         }
//         // const newAccessToken = res.data.accessToken;
//         // localStorage.setItem('accessToken', newAccessToken);
//         // useAuthStore.getState().setAccessToken(newAccessToken);

//         originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
//         return api(originalRequest); // Gửi lại request với accessToken mới
//       } catch (refreshError) {
//         console.error("Refresh token error:", refreshError);
//         useAuthStore.getState().logout();
//         return Promise.reject(refreshError);
//       }
//     }
//     return Promise.reject(error);
//   }
// );


// export default api;
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