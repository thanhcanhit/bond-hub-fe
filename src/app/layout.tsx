"use client";
import Loading from "@/components/Loading";
import "./globals.css";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, isLoading } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    const currentPath = window.location.pathname;

    if (isLoading) return; // Chờ cho đến khi trạng thái tải xong

    if (isAuthenticated && currentPath !== "/dashboard") {
      router.push("/dashboard");
    } else if (!isAuthenticated && currentPath !== "/") {
      router.push("/");
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return <Loading />;
  }

  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Bondhub</title>
        <link rel="icon" href="/bondhub.png" />
      </head>
      <body suppressHydrationWarning>
        <main className="min-h-screen">{children}</main>
      </body>
    </html>
  );
}
