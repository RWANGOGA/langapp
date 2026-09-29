import { apiGet } from "@/lib/api";

export interface ClassItem { date: string; time: string; title: string }
export interface LearnerDashboard {
  learner: { name: string; level: string; avatar: string; unread: number };
  tutor: { name: string; country: string; avatar: string };
  nextClass: { title: string; secondsLeft: number; zoomUrl: string; meetUrl: string; packageName: string };
  progress: { percent: number; level: string; completed: number; total: number };
  today: string;
  classes: ClassItem[];
}

export async function getLearnerDashboard(): Promise<LearnerDashboard> {
  const data = await apiGet<LearnerDashboard>("/learner/dashboard");
  if (!data) {
    throw new Error("Failed to fetch learner dashboard");
  }
  return data;
}