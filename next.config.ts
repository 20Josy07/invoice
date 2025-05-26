
import type { NextConfig } from 'next';

const config: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
  serverActions: {
    // Increased body size limit for Server Actions to handle larger image uploads.
    // Default is 1MB. Set to approx 19MB.
    bodySizeLimit: 20000000, // 20,000,000 bytes
  },
};

export default config;
