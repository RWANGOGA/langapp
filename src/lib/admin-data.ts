"use client";

import { apiGetClient } from "@/lib/api-client";

export type TutorStatus = "Active" | "Assigned" | "Onboarding";
export type CellStatus = "pending" | "confirmed" | "completed" | "alert" | "assigned" | "plus" | "empty";
export type Provider = "Google Meet" | "Zoom" | "MS Teams";
export type PlanName = "Basic" | "Pro" | "Premium";

export interface Kpi { label: string; value: string }
export interface Tutor { id: string; name: string; email: string; status: TutorStatus; language: string; rating: number; assignments: number; qualification_type?: string | null; english_proof_type?: string | null; english_score?: string | null; intro_video_url?: string | null; availability?: string | null; onboarding_fee_usd: number }
export interface StudentSummary { id: number; name: string; email: string; level: string; tutor_name: string | null; status: string }
export interface MatrixRow { tutor: string; cells: CellStatus[] }
export interface Meeting { provider: string; sessions: string[]; connected: boolean }
export interface Plan { name: string; share: number; color: string }
export interface Leader { name: string; value: number }
export interface Activity { id: string; initial: string; text: string; time: string }
export interface StatusCount { label: string; count?: number; color: string }
export interface BarGroup { label: string; bars: { value: number; color: string }[] }

export interface AdminDashboard {
  unread: number;
  kpis: Kpi[]; 
  tutors: Tutor[]; 
  students: StudentSummary[];
  student_names: string[];
  matrix: MatrixRow[]; 
  meetings: Meeting[];
  plans: Plan[]; 
  leaders: Leader[]; 
  activity: Activity[];
  statuses: StatusCount[]; 
  bars: BarGroup[];
}

/** GET {API_URL}/api/admin/dashboard (needs admin cookie). */
export async function getAdminDashboard(): Promise<AdminDashboard> {
  const data = await apiGetClient<AdminDashboard>("/admin/dashboard");
  if (!data) {
    throw new Error("Failed to fetch admin dashboard data");
  }
  return data;
}