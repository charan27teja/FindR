import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config, { dev }) => {
    // Disable caching during development to prevent OneDrive file lock issues
    if (dev) {
      config.cache = false;
    }
    return config;
  },
};

export default nextConfig;
