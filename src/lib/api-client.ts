"use client";

const BASE = "/api/v1"; // Use relative URL so requests go through Next.js rewrite (first-party cookies)

/** Client-side GET to FastAPI via Next.js proxy. Forwards the login cookie automatically. */
export async function apiGetClient<T>(path: string): Promise<T | null> {
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      credentials: "include", // This sends the httpOnly cookies
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (err) {
    // Surface network/rewrite failures instead of collapsing them into "no data".
    throw new Error(`Could not reach ${BASE}${path}: ${err instanceof Error ? err.message : "network error"}`);
  }

  if (res.status === 401) {
    // Don't redirect here - let the calling component handle it
    return null;
  }
  if (!res.ok) {
    // 403/404/500 all used to look identical at the call site. Include the status.
    let detail = "";
    try {
      const body = await res.json();
      if (body?.detail) {
        detail = ` - ${typeof body.detail === "string" ? body.detail : JSON.stringify(body.detail)}`;
      }
    } catch {
      // Non-JSON error body; the status alone is still useful.
    }
    throw new Error(`GET ${BASE}${path} failed: ${res.status} ${res.statusText}${detail}`);
  }
  return (await res.json()) as T;
}