
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
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
    // Default is 1MB. Set to 20MB.
    bodySizeLimit: 20 * 1024 * 1024, // 20MB in bytes
  },
};

export default nextConfig;
