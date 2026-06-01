import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Fix for monorepo / multiple lockfiles warning
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
