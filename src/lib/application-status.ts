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

export type StatusStatement = {
  kicker: string;
  headline: string;
  body: string;
  /** The one action worth offering from this state. */
  action: { href: string; label: string } | null;
};

/**
 * One sentence per state, in the applicant's terms. Derived from the view
 * rather than stored next to it, so the page cannot say "in review" while the
 * record says otherwise.
 */
export function statementFor(view: ApplicationStatusView): StatusStatement {
  if (!view.has_application) {
    return {
      kicker: "Not started",
      headline: "You have not applied yet",
      body:
        "Nothing is on file for this account. The application covers identity, " +
        "qualifications, English evidence, your teaching profile and references - " +
        "eight steps in one sitting. Have your documents to hand: the form keeps " +
        "your answers only once you submit them.",
      action: { href: "/tutor/apply", label: "Start my application" },
    };
  }

  if (view.status === "approved") {
    return {
      kicker: "Approved",
      headline: "Your tutor account is live",
      body:
        "Your profile is published and you can accept classes. Availability, " +
        "learners and schedule all live in the tutor portal.",
      action: { href: "/tutor", label: "Open my tutor portal" },
    };
  }

  if (view.status === "rejected") {
    return {
      kicker: "Closed",
      headline: "Your application was not approved",
      body:
        "Our review team decided not to move your application forward. You are " +
        "welcome to apply again when you have stronger evidence to show - a new " +
        "submission is reviewed from the beginning.",
      action: view.can_reapply ? { href: "/tutor/apply", label: "Apply again" } : null,
    };
  }

  if (view.status === "withdrawn") {
    return {
      kicker: "Withdrawn",
      headline: "You withdrew this application",
      body:
        "The file is closed and is no longer with our review team. If this was a " +
        "mistake, contact support and we will tell you whether it can be reopened.",
      action: null,
    };
  }

  if (!view.submitted) {
    return {
      kicker: "Draft",
      headline: "Your application is not submitted",
      body: view.action_required ?? "Some steps are still outstanding.",
      action: { href: "/tutor/apply", label: "Continue my application" },
    };
  }

  if (view.waiting_on === "you") {
    return {
      kicker: "Your turn",
      headline: "One step needs you",
      body: view.action_required ?? "Our review team is waiting on you.",
      action: { href: "/tutor/apply", label: "Open my application" },
    };
  }

  return {
    kicker: "With our team",
    headline: "Your application is in review",
    body:
      "Everything needed is on file and a person is checking it. Documents, the " +
      "English assessment and the demo lesson are each reviewed by staff. This " +
      "page reads your file as it stands, so you can check back whenever you like.",
    action: null,
  };
}
