"use client";

import { apiGetClient, apiSendClient } from "@/lib/api-client";

export type TutorStatus = "Active" | "Assigned" | "Onboarding";
export type CellStatus = "pending" | "confirmed" | "completed" | "alert" | "assigned" | "plus" | "empty";
export type Provider = "Google Meet" | "Zoom" | "MS Teams";
export type PlanName = "Basic" | "Pro" | "Premium";

export interface Kpi { label: string; value: string }
export interface Tutor { id: string; name: string; email: string; status: TutorStatus; country: string | null; rating: number; assignments: number; qualification_type?: string | null; english_proof_type?: string | null; english_score?: string | null; intro_video_url?: string | null; availability?: string | null; onboarding_fee_usd: number }
export interface StudentSummary { id: number; name: string; email: string; level: string; tutor_name: string | null; status: string }
export interface MatrixRow { tutor: string; cells: CellStatus[] }
export interface Meeting { provider: string; sessions: string[]; connected: boolean }
export interface Plan { name: string; share: number; color: string }
export interface Leader { name: string; value: number }
export interface Activity { id: string; initial: string; text: string; at: string | null }
export interface StatusCount { label: string; count?: number; color: string }

export interface AdminDashboard {
  unread: number;
  applications_in_review: number;
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
}
export interface PaymentActivity { id: number; event_type: string; summary: string; new_state: string | null; amount: number | null; currency: string | null; created_at: string }
export interface PaymentAnalytics { successful_payments: number; matching_pending: number; gross_revenue_usd: number; active_subscriptions: number; generated_at: string }

/** GET {API_URL}/api/admin/dashboard (needs admin cookie). */
export async function getAdminDashboard(): Promise<AdminDashboard> {
  const data = await apiGetClient<AdminDashboard>("/admin/dashboard");
  if (!data) {
    throw new Error("Failed to fetch admin dashboard data");
  }
  return data;
}

export async function getPaymentActivity(): Promise<PaymentActivity[]> {
  return (await apiGetClient<PaymentActivity[]>("/admin/payment/activity")) ?? [];
}

export async function getPaymentAnalytics(): Promise<PaymentAnalytics> {
  return (await apiGetClient<PaymentAnalytics>("/admin/payment/analytics")) ?? { successful_payments: 0, matching_pending: 0, gross_revenue_usd: 0, active_subscriptions: 0, generated_at: "" };
}

/* — Tutor application review queue —
   The applicant's file, read the way staff read it (TutorApplicationRead: the
   applicant view plus admin_notes and reviewed_by). The reviewer acts through
   PATCH /tutor/applications/{id}; the backend owns the state machine and will
   refuse an illegal or premature move, so the UI mirrors the allowed edges only
   to decide which buttons to show, never to enforce them. */
export type ApplicationStatus =
  | "submitted"
  | "documents_review"
  | "english_test"
  | "demo_lesson"
  | "approved"
  | "rejected"
  | "withdrawn";

export interface ApplicationDetail {
  id: number;
  user_id: number;
  status: ApplicationStatus;
  current_step: number;
  full_name: string;
  country: string;
  email?: string | null;
  id_document_url: string | null;
  id_verification_status: string;
  qualification_type: string | null;
  qualification_file_url: string | null;
  qualification_verified: boolean;
  english_proof_type: string | null;
  english_score: string | null;
  english_proof_url: string | null;
  english_verified: boolean;
  intro_video_url: string | null;
  years_experience: number;
  specialties: string[];
  languages: string[];
  reference_1_name: string | null;
  reference_1_email: string | null;
  background_check_status: string;
  demo_lesson_score: number | null;
  admin_notes: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ApplicationList {
  applications: ApplicationDetail[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

// Mirrors ALLOWED_TRANSITIONS in app/api/tutor_application.py. Kept here so the
// queue can offer the right next actions; the server re-checks every one.
export const ALLOWED_TRANSITIONS: Record<ApplicationStatus, ApplicationStatus[]> = {
  submitted: ["documents_review", "english_test", "demo_lesson", "approved", "rejected", "withdrawn"],
  documents_review: ["english_test", "demo_lesson", "approved", "rejected"],
  english_test: ["demo_lesson", "approved", "rejected"],
  demo_lesson: ["approved", "rejected"],
  rejected: ["submitted"],
  approved: [],
  withdrawn: [],
};

export const STATUS_LABEL: Record<ApplicationStatus, string> = {
  submitted: "Submitted",
  documents_review: "Documents review",
  english_test: "English assessment",
  demo_lesson: "Demo lesson",
  approved: "Approved",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
};

/** GET /tutor/applications - the review queue. `status` filters to one stage. */
export async function getApplications(params: {
  status?: ApplicationStatus;
  search?: string;
  page?: number;
  page_size?: number;
} = {}): Promise<ApplicationList> {
  const q = new URLSearchParams();
  if (params.status) q.set("status", params.status);
  if (params.search) q.set("search", params.search);
  q.set("page", String(params.page ?? 1));
  q.set("page_size", String(params.page_size ?? 25));
  const data = await apiGetClient<ApplicationList>(`/tutor/applications?${q.toString()}`);
  if (!data) throw new Error("Failed to fetch the application queue");
  return data;
}

/** Move an application to a new review stage. Throws with the server's reason
 * when the move is refused (illegal edge, or approving an incomplete file). */
export async function reviewApplication(
  id: number,
  body: { status: ApplicationStatus; admin_notes?: string; demo_lesson_score?: number },
): Promise<ApplicationDetail> {
  return apiSendClient<ApplicationDetail>("PATCH", `/tutor/applications/${id}`, body);
}
