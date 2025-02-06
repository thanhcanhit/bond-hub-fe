import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:3000/:path*', // Dẫn đến backend của bạn
      },
    ];
  },

};

export default nextConfig;
