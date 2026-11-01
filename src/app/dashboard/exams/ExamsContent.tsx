"use client";

import Link from "next/link";
import { ArrowRight, ClipboardList, Lock } from "lucide-react";
import type { LearnerExamRow } from "@/lib/exam-data";
import { useLanguage } from "@/i18n/LanguageProvider";
import ui from "@/components/portal/bands.module.css";

// The API sends explicit UTC instants; the learner reads them in their own time.
const whenFmt = (iso: string) =>
  new Date(iso).toLocaleString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

/** How long a window still holds, spoken loosely: nobody needs the seconds here. */
function remaining(minutes: number, t: (k: string, p?: Record<string, string | number>) => string) {
  if (minutes >= 60) return t("learner.exam.list.closingHours", { n: Math.round(minutes / 60) });
  return t("learner.exam.list.closingMinutes", { n: Math.max(1, Math.round(minutes)) });
}

/**
 * The papers a tutor has set, each in exactly one state the server decided.
 * Nothing here reveals an outcome: a submitted paper is honestly "with your
 * tutor", because the release is the tutor's act and no part of a mark exists
 * before it.
 */
export default function ExamsContent({ exams }: { exams: LearnerExamRow[] }) {
  const { t } = useLanguage();

  const stateKey: Record<string, string> = {
    available: "exam.state.available",
    in_progress: "exam.state.inProgress",
    submitted: "exam.state.submitted",
    released: "exam.state.released",
    expired: "exam.state.expired",
  };

  // Only an open paper earns a call to action. A submitted one is waiting on
  // the tutor, and a released one opens on its own result page.
  const action = (e: LearnerExamRow) => {
    if (e.state === "available" || e.state === "in_progress") {
      return (
        <Link className={ui.btnCoral} href={`/dashboard/exams/${e.id}`}>
          {t(e.state === "in_progress" ? "learner.exam.list.resume" : "learner.exam.list.open")}
          <ArrowRight size={14} aria-hidden />
        </Link>
      );
    }
    if (e.state === "released") {
      return (
        <Link className={ui.btnCoral} href={`/dashboard/exams/${e.id}/result`}>
          {t("learner.exam.list.result")} <ArrowRight size={14} aria-hidden />
        </Link>
      );
    }
    return (
      <span className={ui.statusPill}>
        <Lock size={11} aria-hidden /> {t("learner.exam.list.withTutor")}
      </span>
    );
  };

  return (
    <div className={ui.pageStack}>
      <header className={ui.pageHeading}>
        <div>
          <p className={ui.kicker}>{t("learner.exam.list.kicker")}</p>
          <h1>{t("learner.exam.list.title")}</h1>
          <p>{t("learner.exam.list.lede")}</p>
        </div>
      </header>

      {exams.length === 0 ? (
        <section className={ui.band} aria-label={t("learner.exam.list.emptyAria")}>
          <div className={ui.bandStatement}>
            <p className={ui.bandLabel}>
              <ClipboardList size={13} aria-hidden /> {t("learner.exam.list.emptyTitle")}
            </p>
            <p>{t("learner.exam.list.emptyBody")}</p>
          </div>
        </section>
      ) : (
        <section className={ui.band} aria-labelledby="papers-h">
          <div className={ui.bandHead}>
            <h2 id="papers-h" className={ui.bandLabel}>{t("learner.exam.list.papers")}</h2>
            <span className={ui.bandLabel}>{t("learner.exam.list.count", { n: exams.length })}</span>
          </div>
          <ul className={ui.sessions}>
            {exams.map((e) => {
              const minutes = Math.round(e.seconds_left / 60);
              const counting = (e.state === "available" || e.state === "in_progress") && e.seconds_left > 0;
              return (
                <li key={e.id}>
                  <span className={ui.when}>
                    <b>{new Date(e.due_at).toLocaleDateString([], { month: "short", day: "numeric" })}</b>
                    <em>{t("learner.exam.list.due")}</em>
                  </span>
                  <span className={ui.what}>
                    {e.title}
                    <small>
                      {t("learner.exam.list.questions", { n: e.question_count })} ·{" "}
                      {t("learner.exam.list.points", { n: e.total_points })} ·{" "}
                      {t("learner.exam.list.minutes", { n: e.duration_minutes })}
                    </small>
                    <small>
                      {whenFmt(e.due_at)}
                      {counting && ` · ${remaining(minutes, t)}`}
                    </small>
                  </span>
                  <span className={ui.actions}>
                    <span className={`${ui.statusPill} ${e.state === "released" ? ui.statusOk : ""}`}>
                      {t(stateKey[e.state] ?? "exam.state.available")}
                    </span>
                    {action(e)}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
