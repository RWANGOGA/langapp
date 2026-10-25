import { cookies } from "next/headers";
import { redirect } from "next/navigation";

// Server-rendered calls go straight to FastAPI through API_URL, the same origin
// the rewrite proxy uses. Falling back to the public URL makes this server
// re-enter its own edge on every render, where all traffic shares one client IP
// - and therefore one rate-limit budget.
const BASE = process.env.API_URL
  ? `${process.env.API_URL.replace(/\/+$/, "")}/api/v1`
  : process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8004/api/v1";

/** The backend stores the cookie as: "Bearer <jwt>" (quoted, URL-encoded by Next). Normalise to the raw JWT. */
function extractToken(raw?: string): string | null {
  if (!raw) return null;
  let v = raw;
  try { v = decodeURIComponent(v); } catch {}
  v = v.replace(/^"|"$/g, "");
  if (v.startsWith("Bearer ")) v = v.slice(7);
  return v || null;
}

/** Outcome of a read where having no session is itself a normal answer. */
export type OptionalRead<T> =
  | { kind: "anonymous" }
  | { kind: "ok"; value: T }
  | { kind: "error"; status: number | null };

/**
 * Server-side GET for pages that are public but show more to a signed-in
 * visitor. Unlike apiGet it never redirects: not being logged in is a state
 * the page renders, not a session failure. A failed call is reported as such
 * rather than quietly shown as "signed out", so the page can never claim you
 * have done nothing when the truth is that we could not read your file.
 */
export async function apiReadOptional<T>(path: string): Promise<OptionalRead<T>> {
  const cookieStore = await cookies();
  const token = extractToken(cookieStore.get("access_token")?.value);
  if (!token) return { kind: "anonymous" };
  try {
    const res = await fetch(`${BASE}${path}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    // A rejected token means the visitor is signed out, not that the read
    // broke; the page should fall back to its public view.
    if (res.status === 401) return { kind: "anonymous" };
    if (!res.ok) return { kind: "error", status: res.status };
    return { kind: "ok", value: (await res.json()) as T };
  } catch (err) {
    console.warn(`[apiReadOptional] ${path} failed:`, err);
    return { kind: "error", status: null };
  }
}

/** Server-side GET to FastAPI. Sends the login token as a Bearer header; sends the user to login on 401. */
export async function apiGet<T>(
  path: string,
  opts: { public?: boolean; revalidate?: number } = {},
): Promise<T | null> {
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
