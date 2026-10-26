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

/* — The payment ledger —
   No payment provider is wired, so an administrator records each payment by
   hand with the reference it actually arrived under. Every amount travels with
   its currency: the school charges in yen, dong and dollars, and one total
   across the three would be a number in no currency at all. */
export type LedgerStatus = "pending" | "processing" | "completed" | "matching_pending" | "failed" | "refunded";

export const PAID_STATUSES: LedgerStatus[] = ["completed", "matching_pending"];

export interface LedgerRow {
  order_id: number;
  student_id: number | null;
  student_name: string | null;
  student_email: string | null;
  package_id: string;
  package_name: string;
  status: LedgerStatus;
  region: string | null;
  currency: string;
  amount_minor: number;
  payment_method: string | null;
  reference: string | null;
  created_at: string;
  paid_at: string | null;
}

export interface CurrencyTotal { currency: string; amount_minor: number; count: number }

export interface LedgerSummary {
  awaiting_payment: number;
  awaiting_match: number;
  paid: number;
  collected: CurrencyTotal[];
}

export interface LedgerPage {
  orders: LedgerRow[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  summary: LedgerSummary;
}

export interface LedgerEvent {
  id: number;
  event_type: string;
  actor_type: string;
  previous_state: string | null;
  new_state: string | null;
  amount_minor: number | null;
  currency: string | null;
  summary: string;
  reference: string | null;
  note: string | null;
  created_at: string;
}

export interface LedgerSubscription {
  tier: string;
  status: string;
  started_at: string;
  current_period_end: string;
  cancelled_at: string | null;
}

export interface LedgerOrder extends LedgerRow {
  subject: string | null;
  session_type: string | null;
  duration_minutes: number | null;
  package_months: number;
  tutor_name: string | null;
  events: LedgerEvent[];
  subscription: LedgerSubscription | null;
}

export interface ConfirmationResult {
  order_id: number;
  status: LedgerStatus;
  amount_minor: number;
  currency: string;
  reference: string;
  matched: boolean;
  confirmed_at: string;
}

/** GET /admin/payments - one page of orders, newest first. */
export async function getPaymentLedger(params: {
  status?: LedgerStatus;
  currency?: string;
  search?: string;
  page?: number;
  page_size?: number;
} = {}): Promise<LedgerPage> {
  const q = new URLSearchParams();
  if (params.status) q.set("status", params.status);
  if (params.currency) q.set("currency", params.currency);
  if (params.search) q.set("search", params.search);
  q.set("page", String(params.page ?? 1));
  q.set("page_size", String(params.page_size ?? 25));
  const data = await apiGetClient<LedgerPage>(`/admin/payments?${q.toString()}`);
  if (!data) throw new Error("Failed to fetch the payment ledger");
  return data;
}

/** GET /admin/payments/{id} - everything that happened to one order. */
export async function getLedgerOrder(orderId: number): Promise<LedgerOrder> {
  const data = await apiGetClient<LedgerOrder>(`/admin/payments/${orderId}`);
  if (!data) throw new Error("Failed to fetch the order");
  return data;
}

/** POST /admin/payments/{id}/confirm - record money that arrived. */
export async function confirmPayment(
  orderId: number,
  body: { reference: string; note?: string; paid_at?: string },
): Promise<ConfirmationResult> {
  return apiSendClient<ConfirmationResult>("POST", `/admin/payments/${orderId}/confirm`, body);
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

/* — Learner ↔ tutor assignment —
   The backend refuses to place a learner with a tutor whose profile is not
   approved, and a reassignment is a single call: the learner moves without
   ever being tutor-less in between. Every move notifies the learner, both
   tutors and the admins, so the roster is only half the story. */
export interface AssignmentResult {
  student_id: number;
  student_name: string;
  tutor_id: number;
  tutor_name: string;
  assigned_at: string;
  assigned_by: number | null;
}

/** POST /admin/assign-student - place (or move) a learner with an approved tutor. */
export async function assignStudent(studentId: number, tutorId: number): Promise<AssignmentResult> {
  return apiSendClient<AssignmentResult>("POST", "/admin/assign-student", {
    student_id: studentId,
    tutor_id: tutorId,
  });
}

/** DELETE /admin/unassign-student/{id} - return a learner to the awaiting pool. */
export async function unassignStudent(studentId: number): Promise<void> {
  await apiSendClient<void>("DELETE", `/admin/unassign-student/${studentId}`);
}

/* — Matching queue —
   Auto-matching places most paid learners the night they pay; this is the
   remainder it could not decide on, each row carrying the engine's best try
   and the sentences behind it, so a human finishes the job knowing why. */
export type MatchingCandidate = {
  tutor_id: number;
  tutor_name: string;
  score: number;
  reasons: string[];
};

export type MatchingQueueRow = {
  order_id: number;
  student_id: number;
  student_name: string;
  subject: string | null;
  // null when no approved tutor qualifies - the queue saying so honestly.
  best_candidate: MatchingCandidate | null;
};

/** GET /admin/matching-queue - paid orders still waiting, with the ranking. */
export async function getMatchingQueue(): Promise<MatchingQueueRow[]> {
  const data = await apiGetClient<{ queue: MatchingQueueRow[] }>("/admin/matching-queue");
  return data?.queue ?? [];
}

/* — Class monitoring and scheduling —
   The lesson book: every class the school has ever run, plus the admin's
   scheduling action. A class always inherits the learner's assigned tutor -
   the API refuses to schedule a learner who has no tutor yet, which is why
   the schedule form only offers placed learners. */
export type ClassStatusValue = "scheduled" | "completed" | "cancelled" | "no_show";

export interface AdminClassRow {
  id: number;
  title: string;
  learner_name: string;
  tutor_name: string;
  scheduled_at: string;
  duration_minutes: number;
  status: ClassStatusValue;
  zoom_url: string | null;
  meet_url: string | null;
}

export interface AdminClassList {
  classes: AdminClassRow[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export const CLASS_STATUS_LABEL: Record<ClassStatusValue, string> = {
  scheduled: "Scheduled",
  completed: "Completed",
  cancelled: "Cancelled",
  no_show: "No-show",
};

/** GET /admin/classes - the lesson book, newest first. */
export async function getAdminClasses(params: {
  status?: ClassStatusValue;
  search?: string;
  page?: number;
  page_size?: number;
} = {}): Promise<AdminClassList> {
  const q = new URLSearchParams();
  if (params.status) q.set("status", params.status);
  if (params.search) q.set("search", params.search);
  q.set("page", String(params.page ?? 1));
  q.set("page_size", String(params.page_size ?? 25));
  const data = await apiGetClient<AdminClassList>(`/admin/classes?${q.toString()}`);
  if (!data) throw new Error("Failed to fetch the lesson book");
  return data;
}

/** POST /admin/classes - book the next lesson for a placed learner. */
export async function scheduleClass(body: {
  learner_id: number;
  title: string;
  scheduled_at: string;
  duration_minutes?: number;
}): Promise<AdminClassRow> {
  return apiSendClient<AdminClassRow>("POST", "/admin/classes", body);
}

/* — The contact inbox —
   What strangers wrote through the public form, and the answer staff give them.
   No sending service is configured, so a reply is stored against the thread and
   delivered to the sender's own notifications when that address turns out to
   belong to an account. Everyone else is reached from a staff mailbox, which is
   what the mailto handoff in the panel is for. */
export interface ContactThread {
  id: number;
  name: string;
  email: string;
  topic: string;
  message: string;
  created_at: string;
  is_handled: boolean;
  reply: string | null;
  replied_at: string | null;
  replied_by: number | null;
  replied_by_name: string | null;
}

export interface ContactInboxPage {
  messages: ContactThread[];
  total: number;
  /** Counted over every thread, not over the filtered view. */
  open: number;
  answered: number;
}

/** GET /admin/messages - the queue, newest first. */
export async function getContactInbox(params: {
  state?: "open" | "answered" | "all";
  topic?: string;
  limit?: number;
} = {}): Promise<ContactInboxPage> {
  const q = new URLSearchParams();
  if (params.state && params.state !== "all") q.set("state", params.state);
  if (params.topic) q.set("topic", params.topic);
  if (params.limit) q.set("limit", String(params.limit));
  const suffix = q.toString() ? `?${q.toString()}` : "";
  const data = await apiGetClient<ContactInboxPage>(`/admin/messages${suffix}`);
  if (!data) throw new Error("Failed to fetch the message queue");
  return data;
}

/** POST /admin/messages/{id}/reply - answer the thread and close it. */
export async function replyToMessage(id: number, reply: string): Promise<ContactThread> {
  return apiSendClient<ContactThread>("POST", `/admin/messages/${id}/reply`, { reply });
}

/** POST /admin/messages/{id}/reopen - back on the queue, with what was said kept. */
export async function reopenMessage(id: number): Promise<ContactThread> {
  return apiSendClient<ContactThread>("POST", `/admin/messages/${id}/reopen`, {});
}
