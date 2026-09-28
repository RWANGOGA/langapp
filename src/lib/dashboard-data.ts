import { apiGet } from "@/lib/api";

export interface ClassItem { date: string; time: string; title: string } // date = YYYY-MM-DD in the learner's timezone
export interface LearnerDashboard {
  learner: { name: string; level: string; avatar: string; unread: number };
  tutor: { name: string; country: string; avatar: string };
  nextClass: { title: string; secondsLeft: number; zoomUrl: string; meetUrl: string; packageName: string };
  progress: { percent: number; level: string; completed: number; total: number };
  today: string;
  classes: ClassItem[];
}

/** GET {API_URL}/api/learner/dashboard (needs the login cookie). */
export async function getLearnerDashboard(): Promise<LearnerDashboard> {
  try {
    const data = await apiGet<LearnerDashboard>("/learner/dashboard");
    if (data) return data;
  } catch {
    // API not available or 404 - use dev fallback
  }
  return DEV_FALLBACK(); // DELETE this fallback (and DEV_FALLBACK) once the backend is running
}

// ---- development fallback that reproduces the mockup; remove when the API is live ----
const iso = (d: number) => new Date(Date.now() + d * 864e5).toISOString().slice(0, 10);
const DEV_FALLBACK = (): LearnerDashboard => ({
  learner: { name: "Kenji Tanaka", level: "B2", avatar: "/learner-kenji.png", unread: 3 },
  tutor: { name: "Sarah J.", country: "USA", avatar: "/tutor-sarah.png" },
  nextClass: {
    title: "General English: Unit 7 - Conversation Practice", secondsLeft: 15 * 60 + 32,
    zoomUrl: "https://zoom.us/", meetUrl: "https://meet.google.com/", packageName: "3-Month Intensive Package",
  },
  progress: { percent: 72, level: "B2", completed: 18, total: 25 },
  today: iso(0),
  classes: [
    { date: iso(0), time: "19:30", title: "Unit 7 (Conversation)" },
    { date: iso(2), time: "20:00", title: "Unit 8 (Grammar)" },
    { date: iso(4), time: "19:30", title: "Vocabulary Workshop" },
  ],
});