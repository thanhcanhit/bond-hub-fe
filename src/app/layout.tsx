import { Toaster } from "sonner";
import "./globals.css";
import AuthProvider from "@/providers/AuthProvider";
import { SocketChatProvider } from "@/providers/SocketChatProvider";
import DocumentTitle from "@/components/common/DocumentTitle";
import { Inter } from "next/font/google"; // Import Inter font

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata = {
  title: "Vodka",
  description:
    "Vodka is a community for sharing and connecting. Chat, share, and connect with others.",
};

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
      </head>
      <body className={`${inter.className} force-pointer-events`}>
        <DocumentTitle title="Vodka" />
        <Toaster position="top-center" richColors />
        <AuthProvider>
          <SocketChatProvider>
            <main className="min-h-screen">{children}</main>
          </SocketChatProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
