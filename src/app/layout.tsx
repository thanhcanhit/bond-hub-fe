import { Toaster } from "sonner";
import "./globals.css";
import AuthProvider from "@/providers/AuthProvider";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Vodka</title>
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body suppressHydrationWarning>
        <Toaster
          position="top-center"
          richColors
          toastOptions={{
            className: "rounded-2xl w-[450px]", // Đặt chiều rộng cố định
            style: {
              whiteSpace: "nowrap", // Ngăn xuống dòng
            },
          }}
        />
        <AuthProvider>
          <main className="min-h-screen">{children}</main>
        </AuthProvider>
      </body>
    </html>
  );
}
