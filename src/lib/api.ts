import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8004/api/v1";

/** Server-side GET to FastAPI. Forwards the login cookie; sends the user to /login on 401. */
export async function apiGet<T>(path: string, opts: { public?: boolean; revalidate?: number } = {}): Promise<T | null> {
  const headers: Record<string, string> = {};
  if (!opts.public) {
    const cookieStore = await cookies();
    headers.cookie = cookieStore.toString();
  }
  const res = await fetch(`${BASE}${path}`, {
    headers,
    ...(opts.revalidate ? { next: { revalidate: opts.revalidate } } : { cache: "no-store" as const }),
  });
  if (res.status === 401 && !opts.public) redirect("/auth/login");
  if (!res.ok) {
    // For public endpoints, return null to allow fallback data instead of throwing
    if (opts.public && res.status === 404) return null;
    throw new Error(`API ${path} failed with ${res.status}`);
  }
  return (await res.json()) as T;
}