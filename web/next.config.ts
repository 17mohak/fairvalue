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
  // Compress the 1.9 MB player index (D-052). Next.js gzips pages but skipped this route: a route
  // handler's Content-Type reaches its compression filter as an array, which the filter rejects.
  // A header set here is applied first as a plain string, so the filter accepts it. A handler
  // cannot gzip its own body: Next.js drops a Content-Encoding header that a handler sets.
  async headers() {
    return [{ source: "/api/players", headers: [{ key: "Content-Type", value: "application/json" }] }];
  },
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
