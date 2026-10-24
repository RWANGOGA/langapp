export type Provider = "Zoom" | "Google Meet" | "MS Teams";
export interface SessionItem {
  id: string;
  date: string;
  time: string;
  startsAt: string; // explicit UTC ISO instant - render in viewer's timezone
  status: "scheduled" | "completed" | "cancelled" | "no_show";
  learner: string;
  topic: string;
  provider?: Provider;
  meetingUrl?: string;
}
export interface LearnerSummary {
  id: string;
  name: string;
  nativeLanguage: string;
  goal: string;
  level: string;
}
export interface TutorDashboard {
  tutor: { name: string; role: string; unread: number };
  next: { sessionId: string; learner: string; topic: string; secondsLeft: number; startsAt?: string; meetingUrl?: string };
  learners: LearnerSummary[];
  today: string;
  sessions: SessionItem[];
  packageSummary: { student_id: number; student_name: string; subject: string | null; package_name: string; tier: string | null; status: string; started_at: string; expires_at: string | null }[];
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8004/api/v1";
const PROXY = "/api/v1"; // Use relative URL for client-side (first-party cookies)

async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...options.headers,
  };
  const res = await fetch(url, { 
    ...options, 
    headers,
    credentials: "include",  // Send httpOnly cookies
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Unknown error" }));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }
  return res.json();
}

export interface SessionActionResponse {
  class_id: number;
  status: string;
  starts_at: string;
  zoom_url: string | null;
  meet_url: string | null;
  notes: string | null;
  updated_at: string;
}

/** POST a tutor session action. Class ids are numeric; UI session ids are "s12". */
async function postSessionAction(classId: number, action: string, body?: unknown): Promise<SessionActionResponse> {
  return fetchWithAuth(`${PROXY}/tutor/sessions/${classId}/${action}`, {
    method: "POST",
    body: JSON.stringify(body ?? {}),
  }) as Promise<SessionActionResponse>;
}

export const setSessionMeetingLink = (classId: number, provider: "zoom" | "google_meet", url: string) =>
  postSessionAction(classId, "meeting-link", { provider, url });

export const completeTutorSession = (classId: number) =>
  postSessionAction(classId, "complete");

export const cancelTutorSession = (classId: number, reason?: string) =>
  postSessionAction(classId, "cancel", { reason: reason || undefined });

export const markSessionNoShow = (classId: number) =>
  postSessionAction(classId, "no-show");

export const sendSessionFeedback = (classId: number, topic: string, feedback: string) =>
  postSessionAction(classId, "feedback", { topic: topic || undefined, feedback });

/** Learner-side cancel (24h policy is enforced by the API). */
export const cancelLearnerClass = (classId: number, reason?: string) =>
  fetchWithAuth(`${PROXY}/learner/sessions/${classId}/cancel`, {
    method: "POST",
    body: JSON.stringify({ reason: reason || undefined }),
  }) as Promise<SessionActionResponse>;

export async function getTutorDashboard(): Promise<TutorDashboard> {
  const [dashboard, packageSummary] = await Promise.all([
    fetchWithAuth(`${PROXY}/tutor/dashboard`),
    fetchWithAuth(`${PROXY}/tutor/payment-summary`),
  ]);
  return { ...dashboard, packageSummary };
}