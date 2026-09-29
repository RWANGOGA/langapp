export type Provider = "Zoom" | "Google Meet" | "MS Teams";
export interface SessionItem {
  id: string;
  date: string;
  time: string;
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
  next: { sessionId: string; learner: string; topic: string; secondsLeft: number; meetingUrl?: string };
  learners: LearnerSummary[];
  today: string;
  sessions: SessionItem[];
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

export async function getTutorDashboard(): Promise<TutorDashboard> {
  return fetchWithAuth(`${PROXY}/tutor/dashboard`);
}