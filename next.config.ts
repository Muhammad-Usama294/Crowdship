import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb', // Increase limit for KYC document uploads
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'ibprlzutwehcwvwtsixj.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
};

export default nextConfig;
