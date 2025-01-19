'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import useUserStore from '@/stores/userStore';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const login = useUserStore((state) => state.login);
  const isLoading = useUserStore((state) => state.isLoading);
  const router = useRouter();

  const handleLogin = async () => {
    if (username) {
      await login(username);
      router.push('/'); // Chuyển về trang chat
    }
  };

  return (
    <div className="flex justify-center h-screen bg-gradient-to-r from-purple-500 to-pink-500">
      {isLoading ? (
        <p className="text-xl font-semibold">Đang xử lý...</p>
      ) : (
        <div className='flex flex-col items-center justify-center gap-8'>
          <div className='flex flex-col items-center justify-center gap-2'>
              <img src='/zalologo.png' style={{ width: '150px', height: 'auto' }} ></img>
              <h2 className="text-center text-l">Đăng nhập tài khoản Bondhub <p></p> để kết nối với ứng dụng Bondhub Web</h2>
          </div>
          <div className="p-7 bg-white shadow-md rounded-xl flex flex-row justify-between gap-10">
            <div className='w-1/2'>
              <h1 className="text-center text-xl font-bold">Welcome back</h1>
              <p className="text-sm text-gray-500 mb-5 text-center">We're so excited to see you again!</p>
              <p className="text-sm text-gray-500 mb-1">Phone number</p>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full p-2 mb-4 border rounded-sm"
              />
              <p className="text-sm text-gray-500 mb-1">Password</p>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-2 mb-4 border rounded-sm"
              />
              <button
                onClick={handleLogin}
                className="w-full p-2 bg-blue-500 text-white rounded-full"
              >
                Log in
              </button>
              
            </div>
            <div className='flex flex-col items-center justify-center w-1/2'>
              <img src="https://photo.znews.vn/w660/Uploaded/aohvtsw/2019_09_28/o11.jpg" alt="logo" className="w-24 h-24 mx-auto mt-4" />
              <h1 className="text-center text-xl font-bold mt-4">Log in with QR code</h1>
              <p className="text-center text-sm text-gray-500">Scan with your phone to log in</p>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
