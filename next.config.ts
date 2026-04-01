import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Security: only allow server-side imports of node modules
  serverExternalPackages: ["gray-matter", "commander", "glob"],
};

export default nextConfig;
