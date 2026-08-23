import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config, { dev }) => {
    // In-memory caching avoids OneDrive file-lock issues (no disk writes)
    // while still giving fast recompiles — disabling it entirely made every
    // request recompile from scratch, adding seconds to every navigation.
    if (dev) {
      config.cache = { type: "memory" };
    }
    return config;
  },
};

export default nextConfig;
