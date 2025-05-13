import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Disable ESLint during builds
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  // Disable TypeScript type checking during builds
  typescript: {
    // Warning: This allows production builds to successfully complete even if
    // your project has type errors.
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "i.ibb.co",
        port: "", // Leave empty unless a specific port is required
        pathname: "/**", // Allow all paths under this domain
      },
      {
        protocol: "https",
        hostname: "vcnmqyobtaqxbnckzcnr.supabase.co",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "picsum.photos",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "i.pravatar.cc",
        port: "",
        pathname: "/**",
      },
    ],
    // Tối ưu hóa hình ảnh
    formats: ["image/avif", "image/webp"],
  },
  // Tối ưu hóa hiệu suất
  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
  },
  // Tối ưu hóa cho production
  output: "standalone",
  // Tăng tốc độ chuyển trang
  experimental: {
    // Tạm thời vô hiệu hóa optimizeCss do gây lỗi build
    // optimizeCss: true,
    scrollRestoration: true,
  },
};

export default nextConfig;
