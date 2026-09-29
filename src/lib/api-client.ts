"use client";

const BASE = "/api/v1"; // Use relative URL so requests go through Next.js rewrite (first-party cookies)

/** Client-side GET to FastAPI via Next.js proxy. Forwards the login cookie automatically. */
export async function apiGetClient<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${BASE}${path}`, {
      credentials: "include", // This sends the httpOnly cookies
      headers: {
        "Content-Type": "application/json",
      },
    });
    if (res.status === 401) {
      // Don't redirect here - let the calling component handle it
      return null;
    }
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}