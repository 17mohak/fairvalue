import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone output keeps the production container small (see web/Dockerfile).
  output: "standalone",
  poweredByHeader: false,
  reactStrictMode: true,
  // The full player export is read from disk at request time (lib/players.server.ts); make sure
  // the standalone server image carries it when it exists. It is git-ignored dataset content.
  outputFileTracingIncludes: { "/players/**": ["./src/data/generated/**"] },
};

export default nextConfig;
