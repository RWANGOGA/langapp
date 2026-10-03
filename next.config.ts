import type { NextConfig } from "next";

/**
 * The rewrite destination needs the backend *origin* only. The template below
 * already appends `/api/:path*`, and the browser requests `/api/v1/...`, so
 * `API_URL` must NOT include the `/api/v1` suffix.
 *
 * `NEXT_PUBLIC_API_URL` is the one variable that is reliably configured, and it
 * does carry the `/api/v1` suffix. Derive from it when `API_URL` is absent so a
 * missing API_URL cannot silently rewrite to localhost in production.
 */
function resolveApiOrigin(): string {
  const explicit = process.env.API_URL;
  if (explicit) return explicit.replace(/\/+$/, "");

  const publicUrl = process.env.NEXT_PUBLIC_API_URL;
  if (publicUrl) return publicUrl.replace(/\/+$/, "").replace(/\/api\/v1$/, "");

  return "http://localhost:8004";
}

const apiOrigin = resolveApiOrigin();

const nextConfig: NextConfig = {
  // The browser calls /api/... on the Next origin; this proxies it to FastAPI, so the login cookie stays first-party.
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${apiOrigin}/api/:path*` }];
  },
};

export default nextConfig;