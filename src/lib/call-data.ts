"use client";

// Client-side access to the in-app lesson call. A single read exchanges the
// signed-in session for a short-lived, room-scoped LiveKit token; the caller
// (either the assigned learner or tutor) is resolved server-side.
//
// Unlike the generic apiGetClient, this returns the HTTP status to the caller
// instead of collapsing everything into a thrown string. The call screen needs
// to distinguish "you are not a participant" from "no room yet" from "this
// server does not run calls", because each earns an honest, different message.

const BASE = "/api/v1"; // Relative, so it rides the Next rewrite with first-party cookies.

export interface CallToken {
  url: string;
  room: string;
  identity: string;
  token: string;
}

export type CallResult =
  | { ok: true; data: CallToken }
  | { ok: false; status: number; detail: string };

/**
 * Whether this server runs in-app calls. The dashboards gate the 'in-app room'
 * affordance on this, so an unconfigured deployment looks exactly like it did
 * before. A failed read resolves to false: never advertise a call we cannot
 * back, but let the join path (not this optimistic flag) surface real errors.
 */
export async function getCallsEnabled(): Promise<boolean> {
  try {
    const res = await fetch(`${BASE}/calls/config`, { credentials: "include" });
    if (!res.ok) return false;
    const body = (await res.json()) as { enabled?: boolean };
    return !!body.enabled;
  } catch {
    return false;
  }
}

export async function getCallToken(classId: number): Promise<CallResult> {
  let res: Response;
  try {
    res = await fetch(`${BASE}/sessions/${classId}/call`, {
      credentials: "include",
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    // Network / rewrite failure: not a decision by the server, so report it as
    // such rather than pretending the lesson has no room.
    return {
      ok: false,
      status: 0,
      detail: err instanceof Error ? err.message : "network error",
    };
  }

  if (res.ok) {
    return { ok: true, data: (await res.json()) as CallToken };
  }

  let detail = "";
  try {
    const body = await res.json();
    if (body?.detail) detail = String(body.detail);
  } catch {
    // Non-JSON error body; the status alone still drives the UI.
  }
  return { ok: false, status: res.status, detail };
}
