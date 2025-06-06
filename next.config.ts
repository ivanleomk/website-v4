import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'r2-workers.ivanleomk9297.workers.dev',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
