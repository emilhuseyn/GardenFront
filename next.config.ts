import type { NextConfig } from "next";

const backendOrigin = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5034').replace(/\/$/, '');

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${backendOrigin}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
