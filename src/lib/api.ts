import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8004/api/v1";

/** The backend stores the cookie as: "Bearer <jwt>" (quoted, URL-encoded by Next). Normalise to the raw JWT. */
function extractToken(raw?: string): string | null {
  if (!raw) return null;
  let v = raw;
  try { v = decodeURIComponent(v); } catch {}
  v = v.replace(/^"|"$/g, "");
  if (v.startsWith("Bearer ")) v = v.slice(7);
  return v || null;
}

/** Server-side GET to FastAPI. Sends the login token as a Bearer header; sends the user to login on 401. */
export async function apiGet<T>(path: string, opts: { public?: boolean; revalidate?: number } = {}): Promise<T | null> {
  const headers: Record<string, string> = {};
  if (!opts.public) {
    const cookieStore = await cookies();
    const token = extractToken(cookieStore.get("access_token")?.value);
    if (!token) redirect("/auth/login?reason=session");
    headers.Authorization = `Bearer ${token}`;
  }
  try {
    const res = await fetch(`${BASE}${path}`, {
      headers,
      ...(opts.revalidate ? { next: { revalidate: opts.revalidate } } : { cache: "no-store" as const }),
    });
    if (res.status === 401 && !opts.public) redirect("/auth/login?reason=session");
    if (!res.ok) {
      if (opts.public) {
        console.warn(`[apiGet] public ${path} returned ${res.status} – returning null`);
        return null;
      }
      throw new Error(`API ${path} failed with ${res.status}`);
    }
    return (await res.json()) as T;
  } catch (err) {
    if (opts.public) {
      console.warn(`[apiGet] public ${path} failed – returning null:`, err);
      return null;
    }
    throw err;
  }
}
