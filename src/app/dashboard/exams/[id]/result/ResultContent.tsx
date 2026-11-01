"use client";

import Link from "next/link";
import { ArrowRight, Check, Clock, X } from "lucide-react";
import type { ExamState, LearnerResult } from "@/lib/exam-data";
import { useLanguage } from "@/i18n/LanguageProvider";
import ui from "@/components/portal/bands.module.css";

/**
 * A released paper: the marks, the comments, and the level decision, all at
 * once - because the tutor's release is the single act that makes any of it
 * exist. Before that act this screen says so, and shows nothing else.
 */
export default function ResultContent({
  state,
  result,
  title,
}: {
  state: ExamState;
  result: LearnerResult | null;
  title: string;
}) {
  const { t } = useLanguage();

  if (!result) {
    // Not released yet, or it could not be read. Both are the same honest
    // sentence here: there is no mark to show, and nothing is invented to fill
    // the gap while the tutor works.
    return (
      <div className={ui.pageStack}>
        <section className={ui.band} aria-labelledby="wait-h">
          <div className={ui.bandStatement}>
            <p className={ui.bandLabel}>
              <Clock size={13} aria-hidden /> {t("learner.exam.result.waitingTitle")}
            </p>
            <h1 id="wait-h">{title}</h1>
            <p>{t(state === "submitted" ? "learner.exam.result.waitingBody" : "learner.exam.result.notSitted")}</p>
            <p>
              <Link className={ui.textLink} href="/dashboard/exams">
                {t("learner.exam.take.backToList")} <ArrowRight size={13} aria-hidden />
              </Link>
            </p>
          </div>
        </section>
      </div>
    );
  }

  const releasedAt = result.released_at
    ? new Date(result.released_at).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })
    : null;

  return (
    <div className={ui.pageStack}>
      <header className={ui.pageHeading}>
        <div>
          <p className={ui.kicker}>{t("learner.exam.result.kicker")}</p>
          <h1>{result.title}</h1>
          <p>{t("learner.exam.result.lede")}</p>
        </div>
      </header>

      <section className={ui.band} aria-labelledby="score-h">
        <div className={ui.figureRow}>
          <strong className={ui.figure}>
            {result.score}
            <span>/{result.total_points}</span>
          </strong>
          <div className={ui.figureBody}>
            <div
              className={ui.bar}
              role="progressbar"
              aria-valuenow={result.total_points ? Math.round((result.score * 100) / result.total_points) : 0}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <i style={{ width: `${result.total_points ? Math.round((result.score * 100) / result.total_points) : 0}%` }}>
                {result.total_points ? Math.round((result.score * 100) / result.total_points) : 0}%
              </i>
            </div>
            <h2 id="score-h" className={ui.vh}>{t("learner.exam.result.scoreHeading")}</h2>
            <p className={ui.figureMeta}>
              {result.auto_score !== null && (
                <span>{t("learner.exam.result.objective", { score: result.auto_score })}</span>
              )}
              {result.manual_score !== null && (
                <span>{t("learner.exam.result.marked", { score: result.manual_score })}</span>
              )}
              {releasedAt && <span>{t("learner.exam.result.released", { when: releasedAt })}</span>}
            </p>
          </div>
        </div>

        {result.level_after && (
          <dl className={ui.rows}>
            <div>
              <dt>{t("learner.exam.result.level")}</dt>
              <dd>
                {t("learner.exam.result.levelMoved", {
                  before: result.level_before ?? t("learner.exam.result.levelUnset"),
                  after: result.level_after,
                  tutor: result.tutor_name ?? t("learner.exam.result.tutorUnknown"),
                })}
              </dd>
            </div>
          </dl>
        )}
        {!result.level_after && <p className={ui.rowNote}>{t("learner.exam.result.levelUnchanged")}</p>}
      </section>

      {result.answers.map((a, i) => (
        <section key={a.question_id} className={ui.band} aria-labelledby={`a-${a.question_id}`}>
          <div className={ui.bandHead}>
            <h2 id={`a-${a.question_id}`} className={ui.bandTitle}>
              {t("learner.exam.take.question", { n: i + 1, of: result.answers.length })}
            </h2>
            <span className={`${ui.statusPill} ${a.correct === true ? ui.statusOk : a.correct === false ? ui.statusBad : ""}`}>
              {a.correct === true && <Check size={11} aria-hidden />}
              {a.correct === false && <X size={11} aria-hidden />}
              {a.awarded_points !== null
                ? t("learner.exam.result.awarded", { score: a.awarded_points, total: a.points })
                : t("learner.exam.result.unmarked")}
            </span>
          </div>
          <p className={ui.lede}>{a.prompt}</p>
          <dl className={ui.rows}>
            <div>
              <dt>{t("learner.exam.result.yourAnswer")}</dt>
              <dd className={ui.rowNote}>
                {a.type === "multiple_choice"
                  ? a.chosen_option ?? t("learner.exam.result.noAnswerGiven")
                  : a.text?.trim() ? a.text : t("learner.exam.result.noAnswerGiven")}
              </dd>
            </div>
            {a.feedback && (
              <div>
                <dt>{t("learner.exam.result.tutorFeedback")}</dt>
                <dd className={ui.rowNote}>{a.feedback}</dd>
              </div>
            )}
          </dl>
        </section>
      ))}

      <p>
        <Link className={ui.textLink} href="/dashboard/exams">
          {t("learner.exam.take.backToList")} <ArrowRight size={13} aria-hidden />
        </Link>
      </p>
    </div>
  );
}
