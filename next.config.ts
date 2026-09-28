import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The browser calls /api/... on the Next origin; this proxies it to FastAPI, so the login cookie stays first-party.
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${process.env.API_URL ?? "http://localhost:8004"}/api/:path*` }];
  },
};

export default nextConfig;