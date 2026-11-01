"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, ClipboardList, Plus } from "lucide-react";
import type { TutorExamItem } from "@/lib/exam-data";
import { getTutorExams } from "@/lib/tutor-data";
import TutorPageShell from "@/components/tutor/TutorPageShell";
import { useLanguage } from "@/i18n/LanguageProvider";
import ui from "@/components/portal/bands.module.css";

const initials = (n: string) => n.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

/**
 * Every paper this tutor has set, with what came of it. The rollup is the
 * tutor's queue: a submitted row is marking waiting to be done, and a released
 * one is a result already published.
 */
export default function TutorExamsPage() {
  const { t } = useLanguage();
  const [rows, setRows] = useState<TutorExamItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getTutorExams()
      .then(setRows)
      .catch((e: Error) => setError(e.message));
  }, []);

  const when = (iso: string) =>
    new Date(iso).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

  // A released attempt is the only one with a score worth printing: anything
  // earlier is still the tutor's work in progress, not a number for a list.
  const outcome = (row: TutorExamItem) => {
    const a = row.attempt;
    if (!a) return t("tutor.exam.list.notSitted");
    if (a.status === "in_progress") return t("tutor.exam.list.sittingNow");
    if (a.status === "submitted") return t("tutor.exam.list.awaitingMarks");
    if (a.status === "expired") return t("tutor.exam.list.expiredWait");
    return t("tutor.exam.list.scored", {
      score: (a.auto_score ?? 0) + (a.manual_score ?? 0),
      total: a.total_points ?? 0,
    });
  };

  const stateKey: Record<string, string> = {
    published: "exam.state.published",
    closed: "exam.state.closed",
  };

  return (
    <TutorPageShell>
      <div className={ui.pageStack}>
        <header className={ui.pageHeading}>
          <div>
            <p className={ui.kicker}>{t("tutor.exam.list.kicker")}</p>
            <h1>{t("tutor.exam.list.title")}</h1>
            <p>{t("tutor.exam.list.lede")}</p>
          </div>
          <Link className={ui.headerAction} href="/tutor/exams/new">
            <Plus size={14} aria-hidden /> {t("tutor.exam.list.newPaper")}
          </Link>
        </header>

        {error && (
          <p role="alert" className={ui.statusBad}>
            {t("tutor.exam.list.loadError", { message: error })}
          </p>
        )}

        {!error && rows === null && <p className={ui.lede}>{t("tutor.exam.list.loading")}</p>}

        {!error && rows?.length === 0 && (
          <section className={ui.band} aria-label={t("tutor.exam.list.emptyAria")}>
            <div className={ui.bandStatement}>
              <p className={ui.bandLabel}>
                <ClipboardList size={13} aria-hidden /> {t("tutor.exam.list.emptyTitle")}
              </p>
              <p>{t("tutor.exam.list.emptyBody")}</p>
              <p>
                <Link className={ui.textLink} href="/tutor/exams/new">
                  {t("tutor.exam.list.newPaper")} <ArrowRight size={13} aria-hidden />
                </Link>
              </p>
            </div>
          </section>
        )}

        {(rows?.length ?? 0) > 0 && (
          <section className={ui.band} aria-labelledby="papers-h">
            <div className={ui.bandHead}>
              <h2 id="papers-h" className={ui.bandLabel}>{t("tutor.exam.list.papers")}</h2>
              <span className={ui.bandLabel}>{t("tutor.exam.list.count", { n: rows!.length })}</span>
            </div>
            <ul className={ui.sessions}>
              {rows!.map((row) => (
                <li key={row.id}>
                  <span className={ui.when}>
                    <b>{new Date(row.due_at).toLocaleDateString([], { month: "short", day: "numeric" })}</b>
                    <em>{t("tutor.exam.list.dueBy")}</em>
                  </span>
                  <span className={ui.what}>
                    <Link href={`/tutor/exams/${row.id}`}>{row.title}</Link>
                    <small>
                      <span className={ui.avatarSquare} aria-hidden>{initials(row.learner_name)}</span>{" "}
                      {row.learner_name}
                    </small>
                    <small>
                      {t("tutor.exam.list.questions", { n: row.question_count })} ·{" "}
                      {t("tutor.exam.list.points", { n: row.total_points })} ·{" "}
                      {t("tutor.exam.list.minutes", { n: row.duration_minutes })} · {when(row.due_at)}
                    </small>
                    <small>{outcome(row)}</small>
                  </span>
                  <span className={ui.actions}>
                    <span className={ui.statusPill}>{t(stateKey[row.status] ?? "exam.state.published")}</span>
                    <Link className={ui.btnCoral} href={`/tutor/exams/${row.id}`}>
                      {row.attempt && row.attempt.status !== "in_progress"
                        ? t("tutor.exam.list.mark")
                        : t("tutor.exam.list.open")}{" "}
                      <ArrowRight size={14} aria-hidden />
                    </Link>
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </TutorPageShell>
  );
}
