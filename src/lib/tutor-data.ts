export type Provider = "Zoom" | "Google Meet" | "MS Teams";
export interface SessionItem { id: string; date: string; time: string; learner: string; topic: string; provider?: Provider; meetingUrl?: string } // date = YYYY-MM-DD
export interface LearnerSummary { id: string; name: string; nativeLanguage: string; goal: string; level: string }
export interface TutorDashboard {
  tutor: { name: string; role: string; unread: number };
  next: { sessionId: string; learner: string; topic: string; secondsLeft: number; meetingUrl?: string };
  learners: LearnerSummary[];
  today: string;
  sessions: SessionItem[];
}

const iso = (d: number) => new Date(Date.now() + d * 864e5).toISOString().slice(0, 10);

const MOCK = (): TutorDashboard => ({
  tutor: { name: "Alex R.", role: "Tutor", unread: 2 },
  next: { sessionId: "s1", learner: "Kenji Tanaka", topic: "General English: Unit 7 - Conversation Practice", secondsLeft: 15 * 60 + 32 },
  learners: [
    { id: "l1", name: "Kenji Tanaka", nativeLanguage: "Japanese", goal: "Business English", level: "B2" },
    { id: "l2", name: "Aiko Sato", nativeLanguage: "Japanese", goal: "IELTS", level: "B1" },
    { id: "l3", name: "Bao Nguyen", nativeLanguage: "Vietnamese", goal: "Daily Conversation", level: "A2" },
    { id: "l4", name: "Linh Tran", nativeLanguage: "Vietnamese", goal: "TOEIC", level: "B1" },
  ],
  today: iso(0),
  sessions: [
    { id: "s1", date: iso(0), time: "19:30", learner: "Kenji Tanaka", topic: "Unit 7 (Conversation)" },
    { id: "s2", date: iso(0), time: "20:30", learner: "Aiko Sato", topic: "IELTS Speaking Part 2", provider: "Zoom", meetingUrl: "https://zoom.us/j/000000000" },
    { id: "s3", date: iso(1), time: "18:00", learner: "Bao Nguyen", topic: "Ordering food and directions" },
    { id: "s4", date: iso(3), time: "19:00", learner: "Linh Tran", topic: "TOEIC Part 5 grammar" },
  ],
});

/** Server loader: FastAPI `GET {API_URL}/api/tutor/dashboard` (add your auth header), else mock data. */
export async function getTutorDashboard(): Promise<TutorDashboard> {
  const base = process.env.API_URL;
  if (base) {
    try {
      const res = await fetch(`${base}/api/tutor/dashboard`, { cache: "no-store" });
      if (res.ok) return (await res.json()) as TutorDashboard;
    } catch { /* fall back to mock */ }
  }
  return MOCK();
}