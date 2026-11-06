import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone output keeps the production container small (see web/Dockerfile).
  output: "standalone",
  poweredByHeader: false,
  reactStrictMode: true,
  // The full player export is read from disk at request time (lib/players.server.ts); make sure
  // the standalone server image carries it when it exists. It is git-ignored dataset content.
  // Every environment reads it (Overview, Terminal, Stories, the dossier and /api/players).
  outputFileTracingIncludes: { "/**": ["./src/data/generated/**"] },
  // D-038 moved the old rooms into the Terminal; keep their links working.
  async redirects() {
    return [
      { source: "/players", destination: "/terminal", permanent: false },
      { source: "/studio", destination: "/terminal/valuation", permanent: false },
      { source: "/fairness", destination: "/terminal/audit", permanent: false },
    ];
  },
};

export default nextConfig;
