import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone output keeps the production container small (see web/Dockerfile).
  output: "standalone",
  poweredByHeader: false,
  reactStrictMode: true,
};

export default nextConfig;
