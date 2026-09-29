"use client";

import { apiGetClient } from "@/lib/api-client";

export type TutorStatus = "Active" | "Assigned" | "Onboarding";
export type CellStatus = "pending" | "confirmed" | "completed" | "alert" | "assigned" | "plus" | "empty";
export type Provider = "Google Meet" | "Zoom" | "MS Teams";
export type PlanName = "Basic" | "Pro" | "Premium";

export interface Kpi { label: string; value: string }
export interface Tutor { id: string; name: string; email: string; status: TutorStatus; language: string; rating: number; assignments: number }
export interface MatrixRow { tutor: string; cells: CellStatus[] }
export interface Meeting { provider: Provider; sessions: string[]; connected: boolean }
export interface Plan { name: PlanName; share: number; color: string }
export interface Leader { name: string; value: number }
export interface Activity { id: string; initial: string; text: string; time: string }
export interface StatusCount { label: "Active" | "Renewing" | "Expiring" | "Cancelled"; color: string }
export interface BarGroup { label: string; bars: { value: number; color: string }[] }

export interface AdminDashboard {
  kpis: Kpi[]; tutors: Tutor[]; matrix: MatrixRow[]; meetings: Meeting[];
  plans: Plan[]; leaders: Leader[]; activity: Activity[];
  statuses: StatusCount[]; bars: BarGroup[];
}

export interface Plan { name: PlanName; share: number; color: string }

/** GET {API_URL}/api/admin/dashboard (needs admin cookie). */
export async function getAdminDashboard(): Promise<AdminDashboard> {
  const data = await apiGetClient<AdminDashboard>("/admin/dashboard");
  return data ?? MOCK_FALLBACK(); // DELETE this fallback once the API is running
}

// ---- development fallback that reproduces the mockup; remove when the API is live ----
const MOCK_FALLBACK = (): AdminDashboard => ({
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
  meetings: (["Google Meet", "Zoom", "MS Teams"] as Provider[]).map((p, i) => ({
    provider: p, connected: i === 1,
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
  statuses: [
    { label: "Active", color: "var(--teal)" }, { label: "Renewing", color: "var(--navy)" },
    { label: "Expiring", color: "#f3b04a" }, { label: "Cancelled", color: "#d64545" },
  ],
  bars: [
    { label: "Basic", bars: [{ value: 50, color: "var(--navy)" }, { value: 25, color: "var(--teal)" }] },
    { label: "Pro", bars: [{ value: 35, color: "var(--navy)" }, { value: 55, color: "#f47a52" }] },
    { label: "Premium", bars: [{ value: 28, color: "var(--navy)" }, { value: 18, color: "#f47a52" }] },
  ],
});