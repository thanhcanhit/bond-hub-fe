'use client';

import useUserStore from '@/stores/userStore';

export default function DashboardPage() {
  const user = useUserStore((state) => state.user);

  if (!user) {
    return <div>Bạn cần đăng nhập để xem trang này.</div>;
  }

  return (
    <div>
      <h1>Chào mừng, {user.username}!</h1>
      <p>Đây là trang Dashboard.</p>
    </div>
  );
}
