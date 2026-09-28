export type TutorStatus = "Active" | "Assigned" | "Onboarding";
export type CellStatus = "pending" | "confirmed" | "completed" | "alert" | "assigned" | "plus" | "empty";
export type Provider = "Google Meet" | "Zoom" | "MS Teams";

export interface Kpi { label: string; value: string }
export interface Tutor { id: string; name: string; email: string; status: TutorStatus; language: string; rating: number; assignments: number }
export interface MatrixRow { tutor: string; cells: [CellStatus, CellStatus, CellStatus, CellStatus, CellStatus] }
export interface Meeting { provider: Provider; sessions: string[] }
export interface Plan { name: "Basic" | "Pro" | "Premium"; share: number; color: string }
export interface Leader { name: string; value: number }
export interface Activity { id: string; initial: string; text: string; time: string }
export interface AdminDashboard {
  kpis: Kpi[]; tutors: Tutor[]; matrix: MatrixRow[]; meetings: Meeting[];
  plans: Plan[]; leaders: Leader[]; activity: Activity[];
}

const MOCK: AdminDashboard = {
  kpis: [
    { label: "Total Tutors", value: "248" },
    { label: "Active Students", value: "1,850" },
    { label: "Scheduled Sessions", value: "92" },
    { label: "System Health", value: "98%" },
  ],
  tutors: [
    { id: "1", name: "Sarah Chen", email: "sarah@gmail.com", status: "Active", language: "English", rating: 4.0, assignments: 10 },
    { id: "2", name: "David Kim", email: "david@gmail.com", status: "Assigned", language: "English", rating: 5.0, assignments: 21 },
    { id: "3", name: "Fatima Khan", email: "fatima@gmail.com", status: "Onboarding", language: "English", rating: 4.0, assignments: 18 },
    { id: "4", name: "Robert Wilson", email: "robert@gmail.com", status: "Active", language: "English", rating: 3.0, assignments: 13 },
  ],
  matrix: [
    { tutor: "Sarah Chen", cells: ["pending", "confirmed", "completed", "alert", "empty"] },
    { tutor: "David Kim", cells: ["empty", "assigned", "plus", "empty", "empty"] },
    { tutor: "Fatima Khan", cells: ["pending", "confirmed", "empty", "completed", "empty"] },
    { tutor: "Robert Wilson", cells: ["empty", "empty", "completed", "alert", "pending"] },
  ],
  meetings: ["Google Meet", "Zoom", "MS Teams"].map((p) => ({
    provider: p as Provider,
    sessions: ["Sarah C. - ESL 101, 14:00", "Liam N. - Business English, 15:30"],
  })),
  plans: [
    { name: "Basic", share: 45, color: "var(--navy)" },
    { name: "Pro", share: 30, color: "var(--teal)" },
    { name: "Premium", share: 25, color: "#f47a52" },
  ],
  leaders: [{ name: "Ben J.", value: 282 }, { name: "Fatima C.", value: 263 }],
  activity: [
    { id: "a1", initial: "T", text: "Sarah C. session completed", time: "12 minutes ago" },
    { id: "a2", initial: "S", text: "Ben J. payment confirmed", time: "13 minutes ago" },
    { id: "a3", initial: "T", text: "David K. assigned to Emily", time: "13 minutes ago" },
  ],
};

/** Server-side loader. Point API_URL at FastAPI (GET /api/admin/dashboard); falls back to mock data. */
export async function getAdminDashboard(): Promise<AdminDashboard> {
  const base = process.env.API_URL;
  if (base) {
    try {
      const res = await fetch(`${base}/api/admin/dashboard`, { cache: "no-store" });
      if (res.ok) return (await res.json()) as AdminDashboard;
    } catch { /* fall through to mock */ }
  }
  return MOCK;
}
