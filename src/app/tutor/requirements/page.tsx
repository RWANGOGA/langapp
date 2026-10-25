import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, Check } from "lucide-react";
import ApplicantFrame from "@/components/tutor/ApplicantFrame";
import ui from "@/components/portal/bands.module.css";
import { getTutorRequirements } from "@/lib/tutor-requirements-server";
import { getApplicantState, statementFor, type ApplicationStatusView } from "@/lib/application-status";
import { utcInstant } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Become a tutor — requirements, review and your progress",
  description:
    "Documents, checks and agreements needed to teach on Nile Language - and, once you have applied, where your application stands.",
};

export const dynamic = "force-dynamic";

/** Day-month-year, fixed locale: this renders on the server, where the
 *  machine's own locale would otherwise decide how a date reads. */
const fileDate = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

const RAIL_LABEL: Record<ApplicationStatusView["stages"][number]["state"], string> = {
  complete: "Done",
  current: "Now",
  upcoming: "Not started",
};

function StatusBand({ view }: { view: ApplicationStatusView }) {
  const statement = statementFor(view);
  const updated = view.last_update ? fileDate.format(new Date(utcInstant(view.last_update))) : null;
  return (
    <section className={ui.band} aria-labelledby="status-heading">
      <div className={ui.bandHead}>
        <span className={ui.bandLabel}>{statement.kicker}</span>
        {updated && <span className={ui.bandLabel}>File updated {updated}</span>}
      </div>
      <h2 id="status-heading" className={ui.bandTitle}>
        {statement.headline}
      </h2>
      <p className={ui.bandEmpty}>{statement.body}</p>
      {statement.action && (
        <p className={ui.joinRow}>
          <Link href={statement.action.href} className={ui.btnCoral}>
            {statement.action.label}
          </Link>
        </p>
      )}

      {view.stages.length > 0 && (
        <>
          <span className={ui.subHead} id="rail-heading">
            Where your file stands
          </span>
          <ol className={ui.rail} aria-labelledby="rail-heading">
            {view.stages.map((stage) => (
              <li
                key={stage.key}
                className={
                  stage.state === "complete"
                    ? ui.railComplete
                    : stage.state === "current"
                      ? ui.railCurrent
                      : undefined
                }
              >
                <span className={ui.railMark} aria-hidden />
                <div>
                  <p className={ui.railTitle}>{stage.title}</p>
                  <p className={ui.railDesc}>{stage.description}</p>
                </div>
                <span className={ui.railWhen}>
                  {stage.state === "upcoming" ? stage.indicative_days : RAIL_LABEL[stage.state]}
                </span>
              </li>
            ))}
          </ol>
        </>
      )}

      {view.has_application && (
        <>
          <span className={ui.subHead} id="checks-heading">
            Evidence on file
          </span>
          <dl className={ui.rows} aria-labelledby="checks-heading">
            {view.checks.map((check) => (
              <div key={check.id}>
                <dt>{check.label}</dt>
                <dd>
                  <span
                    className={`${ui.statusPill} ${
                      check.state === "verified"
                        ? ui.statusOk
                        : check.state === "failed"
                          ? ui.statusBad
                          : ""
                    }`}
                  >
                    {check.state}
                  </span>
                </dd>
              </div>
            ))}
          </dl>
        </>
      )}
    </section>
  );
}

export default async function TutorRequirementsPage() {
  const [requirements, state] = await Promise.all([getTutorRequirements(), getApplicantState()]);

  if (!requirements) {
    return (
      <ApplicantFrame>
        <section className={ui.band}>
          <span className={ui.bandLabel}>Unavailable</span>
          <h1 className={ui.bandTitle}>The tutor requirements are not loading</h1>
          <p className={ui.bandEmpty}>
            We could not read the current requirements. Please try again shortly.
          </p>
        </section>
      </ApplicantFrame>
    );
  }

  const view = state.kind === "ok" ? state.view : null;
  // The rail and the published list describe the same process; showing both
  // would let one screen state it twice.
  const railShown = Boolean(view && view.stages.length > 0);

  return (
    <ApplicantFrame signedIn={view !== null}>
      <div className={ui.pageHeading}>
        <div>
          <span className={ui.kicker}>Becoming a tutor</span>
          <h1>Become a tutor</h1>
          <p>
            {view
              ? "Below is everything we ask of a tutor and what happens to a file at each stage - the same list your application is being read against."
              : "Teaching on Nile Language is a reviewed process. Here is everything you will need to provide, and what we check. Most applicants finish in one sitting."}
          </p>
        </div>
      </div>

      {state.kind === "unavailable" && (
        <section className={ui.band}>
          <span className={ui.bandLabel}>Not loaded</span>
          <h2 className={ui.bandTitle}>We could not read your application</h2>
          <p className={ui.bandEmpty}>
            Your session is recognised, but the review file did not come back. Nothing has been
            lost - reload this page, or sign in again if it persists.
          </p>
          <p className={ui.joinRow}>
            <Link href="/auth/login?callbackUrl=%2Ftutor%2Frequirements" className={ui.btn}>
              Sign in again
            </Link>
          </p>
        </section>
      )}

      {view && <StatusBand view={view} />}

      <section className={ui.bandStatement} role="note">
        <span className={ui.bandLabel}>Before you start</span>
        <h2 className={ui.bandTitle}>Submitting is not approval</h2>
        <p>{requirements.disclaimer}</p>
      </section>

      <section className={ui.band} aria-labelledby="eligibility-heading">
        <div className={ui.bandHead}>
          <h2 id="eligibility-heading" className={ui.bandTitle}>
            Who can apply
          </h2>
          <span className={ui.bandLabel}>All must hold</span>
        </div>
        <ul className={ui.ticks}>
          {requirements.eligibility.map((item) => (
            <li key={item}>
              <Check size={16} strokeWidth={2.4} aria-hidden />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className={ui.band} aria-labelledby="documents-heading">
        <div className={ui.bandHead}>
          <h2 id="documents-heading" className={ui.bandTitle}>
            What you will provide
          </h2>
          <span className={ui.bandLabel}>{requirements.documents.length} items</span>
        </div>
        <dl className={ui.rows}>
          {requirements.documents.map((doc) => (
            <div key={doc.id}>
              <dt>{doc.title}</dt>
              <dd>
                {doc.description}
                <span className={ui.rowNoteUnder}>
                  {doc.required ? "Required" : "Optional"}
                  {doc.accepted_formats.length > 0 && ` · ${doc.accepted_formats.join(", ")}`}
                  {doc.max_size_mb ? ` · max ${doc.max_size_mb} MB` : ""}
                  {doc.examples.length > 0 && ` · e.g. ${doc.examples.join(", ")}`}
                </span>
              </dd>
            </div>
          ))}
        </dl>
      </section>

      {!railShown && (
        <section className={ui.band} aria-labelledby="review-heading">
          <div className={ui.bandHead}>
            <h2 id="review-heading" className={ui.bandTitle}>
              What happens after you submit
            </h2>
            <span className={ui.bandLabel}>Reviewed by a person</span>
          </div>
          <ol className={ui.rail}>
            {requirements.review_stages.map((stage) => (
              <li key={stage.key}>
                <span className={ui.railMark} aria-hidden />
                <div>
                  <p className={ui.railTitle}>{stage.title}</p>
                  <p className={ui.railDesc}>{stage.description}</p>
                </div>
                <span className={ui.railWhen}>{stage.indicative_days}</span>
              </li>
            ))}
          </ol>
        </section>
      )}

      <section className={ui.band} aria-labelledby="policies-heading">
        <div className={ui.bandHead}>
          <h2 id="policies-heading" className={ui.bandTitle}>
            Agreements you will accept
          </h2>
          <span className={ui.bandLabel}>Part of your tutor agreement</span>
        </div>
        <dl className={ui.rows}>
          {requirements.policies.map((policy) => (
            <div key={policy.id}>
              <dt>{policy.title}</dt>
              <dd>
                <span className={ui.rowNote}>{policy.summary}</span>
              </dd>
            </div>
          ))}
        </dl>
      </section>

      {!view && (
        <section className={ui.bandStatement} aria-labelledby="start-heading">
          <span className={ui.bandLabel}>
            <AlertTriangle size={14} aria-hidden /> Ready when you are
          </span>
          <h2 id="start-heading" className={ui.bandTitle}>
            {requirements.total_steps} steps, one sitting
          </h2>
          <p>
            An account is not a tutor account. You get tutor access only after every document has
            been reviewed and the demo lesson has been passed - and this page will tell you where
            your file stands at every stage in between.
          </p>
          <p className={ui.joinRow}>
            <Link href="/auth/register?intent=tutor" className={ui.btnCoral}>
              Start my application
            </Link>
            <Link href="/tutors" className={ui.btn}>
              Browse tutors instead
            </Link>
          </p>
        </section>
      )}

      <p className={ui.bandLabel}>Requirements version {requirements.version}</p>
    </ApplicantFrame>
  );
}
