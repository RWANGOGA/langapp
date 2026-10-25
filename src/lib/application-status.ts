import { apiReadOptional } from "@/lib/api";

/** Mirrors ApplicationStatusView in the backend. */
export interface StageView {
  key: string;
  title: string;
  description: string;
  /** Where the school's process sits, not what the applicant has done. */
  state: "complete" | "current" | "upcoming";
  indicative_days: string;
}

export interface CheckView {
  id: string;
  label: string;
  state: "pending" | "verified" | "failed";
}

export interface ApplicationStatusView {
  has_application: boolean;
  status: string | null;
  /** Every field the submit gate asks for is on file. */
  submitted: boolean;
  waiting_on: "you" | "school" | "nobody";
  action_required: string | null;
  can_reapply: boolean;
  stages: StageView[];
  checks: CheckView[];
  last_update: string | null;
}

/**
 * The three honest answers to "where is my application": we do not know who
 * you are, we could not read your file, or here is your file. Collapsing the
 * last two into "you have not applied" would send someone who has already
 * submitted back to the start of the form.
 */
export type ApplicantState =
  | { kind: "anonymous" }
  | { kind: "unavailable" }
  | { kind: "ok"; view: ApplicationStatusView };

export async function getApplicantState(): Promise<ApplicantState> {
  const read = await apiReadOptional<ApplicationStatusView>("/tutor/applications/me/status");
  if (read.kind === "anonymous") return { kind: "anonymous" };
  if (read.kind === "error") return { kind: "unavailable" };
  return { kind: "ok", view: read.value };
}

// statementFor lives in application-statement.ts (pure, client-safe) and is
// re-exported here so server callers keep a single import.
export { statementFor } from "@/lib/application-statement";
export type { StatusStatement } from "@/lib/application-statement";
