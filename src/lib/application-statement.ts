import type { ApplicationStatusView } from "@/lib/application-status";

export type StatusStatement = {
  kickerKey: string;
  headlineKey: string;
  /** Static body; resolved through the dictionary by the client. */
  bodyKey?: string;
  /** Backend-provided instruction, already human language - shown as-is. */
  bodyRaw?: string;
  /** The one action worth offering from this state. */
  action: { href: string; labelKey: string } | null;
};

/**
 * One statement per state, in the applicant's terms, returned as translation
 * keys so the page localizes it. Derived from the view rather than stored next
 * to it, so the page cannot say "in review" while the record says otherwise.
 *
 * Kept apart from application-status.ts because that module reads cookies
 * through next/headers: importing it from a client component would drag the
 * server API into the browser bundle.
 */
export function statementFor(view: ApplicationStatusView): StatusStatement {
  if (!view.has_application) {
    return {
      kickerKey: "req.st.none.kicker",
      headlineKey: "req.st.none.headline",
      bodyKey: "req.st.none.body",
      action: { href: "/tutor/apply", labelKey: "req.st.none.action" },
    };
  }

  if (view.status === "approved") {
    return {
      kickerKey: "req.st.approved.kicker",
      headlineKey: "req.st.approved.headline",
      bodyKey: "req.st.approved.body",
      action: { href: "/tutor", labelKey: "req.st.approved.action" },
    };
  }

  if (view.status === "rejected") {
    return {
      kickerKey: "req.st.rejected.kicker",
      headlineKey: "req.st.rejected.headline",
      bodyKey: "req.st.rejected.body",
      action: view.can_reapply ? { href: "/tutor/apply", labelKey: "req.st.rejected.action" } : null,
    };
  }

  if (view.status === "withdrawn") {
    return {
      kickerKey: "req.st.withdrawn.kicker",
      headlineKey: "req.st.withdrawn.headline",
      bodyKey: "req.st.withdrawn.body",
      action: null,
    };
  }

  if (!view.submitted) {
    return {
      kickerKey: "req.st.draft.kicker",
      headlineKey: "req.st.draft.headline",
      bodyKey: "req.st.draft.body",
      bodyRaw: view.action_required ?? undefined,
      action: { href: "/tutor/apply", labelKey: "req.st.draft.action" },
    };
  }

  if (view.waiting_on === "you") {
    return {
      kickerKey: "req.st.yours.kicker",
      headlineKey: "req.st.yours.headline",
      bodyKey: "req.st.yours.body",
      bodyRaw: view.action_required ?? undefined,
      action: { href: "/tutor/apply", labelKey: "req.st.yours.action" },
    };
  }

  return {
    kickerKey: "req.st.review.kicker",
    headlineKey: "req.st.review.headline",
    bodyKey: "req.st.review.body",
    action: null,
  };
}
