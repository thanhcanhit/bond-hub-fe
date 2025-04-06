import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
    ],
  },
  output: "standalone",
};

export default nextConfig;
