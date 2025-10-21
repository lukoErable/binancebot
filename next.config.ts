import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // Enable instrumentation for background services
  experimental: {
    instrumentationHook: true,
  },
};

export default nextConfig;
