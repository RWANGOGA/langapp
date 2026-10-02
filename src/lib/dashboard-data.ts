import { apiGet } from "@/lib/api";

export interface ClassItem { date: string; time: string; title: string }
export interface LearnerDashboard {
  learner: { name: string; level: string; avatar: string; unread: number };
  tutor: { name: string; country: string; avatar: string } | null;
  nextClass: { title: string; secondsLeft: number; zoomUrl?: string; meetUrl?: string; packageName?: string } | null;
  progress: { percent: number; level: string; completed: number; total: number };
  today: string;
  classes: ClassItem[];
}

// Neutral placeholder avatar (inline SVG, so no file or remote host is needed)
const FALLBACK_AVATAR =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="#cbd5e1"/><circle cx="50" cy="38" r="18" fill="#94a3b8"/><path d="M14 92c4-22 22-32 36-32s32 10 36 32z" fill="#94a3b8"/></svg>'
  );

export async function getLearnerDashboard(): Promise<LearnerDashboard> {
  const data = await apiGet<LearnerDashboard>("/learner/dashboard");
  if (!data) {
    throw new Error("Failed to fetch learner dashboard");
  }
  return {
    ...data,
    learner: { ...data.learner, avatar: data.learner.avatar || FALLBACK_AVATAR },
    tutor: data.tutor ? { ...data.tutor, avatar: data.tutor.avatar || FALLBACK_AVATAR } : null,
  };
}
