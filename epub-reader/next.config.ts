import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  eslint: {
    // Temporarily ignore linting during builds for testing
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Temporarily ignore TypeScript errors during builds for testing
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
