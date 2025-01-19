'use client';

import { useRouter } from 'next/navigation';
import useUserStore from '@/stores/userStore';
import { useEffect } from 'react';

export default function ChatPage() {
  const user = useUserStore((state) => state.user);
  const router = useRouter();

  useEffect(() => {
    if (!user) {
      router.push('/login'); // Chuyển hướng nếu chưa đăng nhập
    }
  }, [user, router]);

  if (!user) {
    return null; // Tránh render trong khi chờ chuyển hướng
  }

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-50">
      <h1 className="text-2xl font-bold">Chào, {user.username}!</h1>
      <p className="mt-4 text-lg">Đây là trang chat của bạn.</p>
    </div>
  );
}
