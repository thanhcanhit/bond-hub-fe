'use client';

import { useRouter } from 'next/navigation';
import useUserStore from '@/stores/userStore';

import { usePathname } from 'next/navigation';

export default function Navbar() {
    const logout = useUserStore((state) => state.logout);
    const isLoading = useUserStore((state) => state.isLoading);
    const router = useRouter();
    const pathname = usePathname();

    // Không hiển thị Navbar nếu đang ở trang đăng nhập
    if (pathname === '/login') {
        return null;
    }

    const handleLogout = async () => {
        await logout();
        router.push('/login'); // Chuyển về trang đăng nhập
    };

    return (
        <nav className="flex justify-between items-center p-4 bg-gray-800 text-white">
            <h1 className="text-lg">My Chat App</h1>
            {isLoading ? (
                <p>Đang đăng xuất...</p>
            ) : (
                <button onClick={handleLogout} className="text-red-500">
                    Đăng xuất
                </button>
            )}
        </nav>
    );
}
