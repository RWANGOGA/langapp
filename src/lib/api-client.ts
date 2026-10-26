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

/** Client-side write (PUT/PATCH/POST/DELETE) to FastAPI via the Next proxy.
 * Returns the parsed body, or throws with the server's `detail` so callers can
 * surface the real reason a change was refused (e.g. an incomplete application
 * that cannot be approved) instead of a generic failure. */
export async function apiSendClient<T>(
  method: "PUT" | "PATCH" | "POST" | "DELETE",
  path: string,
  body?: unknown,
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  if (res.status === 204) return undefined as T;
  let payload: unknown = null;
  try {
    payload = await res.json();
  } catch {
    // No JSON body (proxy error page, empty 5xx).
  }
  if (!res.ok) {
    const detail =
      payload && typeof payload === "object" && "detail" in payload
        ? (payload as { detail: unknown }).detail
        : null;
    const message =
      typeof detail === "string"
        ? detail
        : detail
          ? JSON.stringify(detail)
          : `${method} ${path} failed: ${res.status} ${res.statusText}`;
    throw new Error(message);
  }
  return payload as T;
}