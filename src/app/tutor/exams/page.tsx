"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, ClipboardList, Plus } from "lucide-react";
import type { TutorExamItem } from "@/lib/exam-data";
import { getTutorExams } from "@/lib/tutor-data";
import TutorPageShell from "@/components/tutor/TutorPageShell";
import { useLanguage } from "@/i18n/LanguageProvider";
import ui from "@/components/portal/bands.module.css";

const initials = (n: string) => n.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

/**
 * Where a paper stands, in the one thing a tutor cares about: what is still
 * asked of them. An expired sitting belongs with the submitted one for the same
 * reason - the marks are owed either way.
 */
type Stage = "notSat" | "sitting" | "waiting" | "released" | "closed";

const STAGES: Stage[] = ["notSat", "sitting", "waiting", "released", "closed"];

/**
 * Every paper this tutor has set and what came of it: who it went to, whether
 * they sat it, the marks it drew and the day it was published. The record is the
 * tutor's, so the objective total is printed as soon as the server has it, even
 * while the learner is still owed nothing - release is a separate act.
 */
export default function TutorExamsPage() {
  const { t } = useLanguage();
  const [rows, setRows] = useState<TutorExamItem[] | null>(null);
  // The clock is read when the record arrives, not while it renders: a paper
  // whose window happens to close between two paints must not change stage
  // under the tutor, and the list it sees is the list the server just gave it.
  const [readAt, setReadAt] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [learner, setLearner] = useState("");
  const [stage, setStage] = useState("");

  useEffect(() => {
    getTutorExams()
      .then((d) => {
        setRows(d);
        setReadAt(Date.now());
      })
      .catch((e: Error) => setError(e.message));
  }, []);

  const when = (iso: string) =>
    new Date(iso).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

  const lapsed = (row: TutorExamItem) =>
    row.status === "closed" || new Date(row.due_at).getTime() <= readAt;

  const stageOf = (row: TutorExamItem): Stage => {
    const a = row.attempt;
    if (!a) return lapsed(row) ? "closed" : "notSat";
    if (a.status === "in_progress") return "sitting";
    if (a.status === "released") return "released";
    return "waiting";
  };

  const stageLabel: Record<Stage, string> = {
    notSat: "tutor.exam.list.filter.notSat",
    sitting: "tutor.exam.list.filter.sitting",
    waiting: "tutor.exam.list.filter.waiting",
    released: "tutor.exam.list.filter.released",
    closed: "tutor.exam.list.filter.closed",
  };

  // What the paper is worth to the tutor right now. Before release the number is
  // theirs alone: the objective half the server scored, minus the written marks
  // they have not given yet.
  const outcome = (row: TutorExamItem) => {
    const a = row.attempt;
    if (!a) return lapsed(row) ? t("tutor.exam.list.neverSitted") : t("tutor.exam.list.notSitted");
    if (a.status === "in_progress") return t("tutor.exam.list.sittingNow");
    if (a.status === "released")
      return t("tutor.exam.list.scored", {
        score: (a.auto_score ?? 0) + (a.manual_score ?? 0),
        total: a.total_points ?? 0,
      });
    return t("tutor.exam.list.objectiveMarked", {
      score: a.auto_score ?? 0,
      total: a.total_points ?? 0,
    });
  };

  const learners = useMemo(() => {
    const seen = new Map<number, string>();
    (rows ?? []).forEach((r) => seen.set(r.learner_id, r.learner_name));
    return [...seen.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [rows]);

  const shown = useMemo(
    () =>
      (rows ?? []).filter(
        (r) => (!learner || String(r.learner_id) === learner) && (!stage || stageOf(r) === stage)
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rows, learner, stage, readAt]
  );

  const filtering = learner !== "" || stage !== "";

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
              <span className={ui.bandLabel}>
                {filtering
                  ? t("tutor.exam.list.filter.showing", { n: shown.length, total: rows!.length })
                  : t("tutor.exam.list.count", { n: rows!.length })}
              </span>
            </div>

            {(learners.length > 1 || (rows?.length ?? 0) > 4) && (
              <div className={ui.filterBar}>
                <label>
                  {t("tutor.exam.list.filter.learner")}
                  <select className={ui.select} value={learner} onChange={(e) => setLearner(e.target.value)}>
                    <option value="">{t("tutor.exam.list.filter.allLearners")}</option>
                    {learners.map(([id, name]) => (
                      <option key={id} value={id}>{name}</option>
                    ))}
                  </select>
                </label>
                <label>
                  {t("tutor.exam.list.filter.stage")}
                  <select className={ui.select} value={stage} onChange={(e) => setStage(e.target.value)}>
                    <option value="">{t("tutor.exam.list.filter.allStages")}</option>
                    {STAGES.map((s) => (
                      <option key={s} value={s}>{t(stageLabel[s])}</option>
                    ))}
                  </select>
                </label>
                {filtering && (
                  <button
                    type="button"
                    className={ui.textLink}
                    onClick={() => {
                      setLearner("");
                      setStage("");
                    }}
                  >
                    {t("tutor.exam.list.filter.clear")}
                  </button>
                )}
              </div>
            )}

            {shown.length === 0 ? (
              <p className={ui.lede}>{t("tutor.exam.list.filter.noMatch")}</p>
            ) : (
              <ul className={ui.sessions}>
                {shown.map((row) => (
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
                      {/* The two dates that make a record, not a to-do list. */}
                      {row.attempt?.submitted_at && (
                        <small>
                          {t("tutor.exam.list.submittedOn", { date: when(row.attempt.submitted_at) })}
                          {row.attempt.released_at && (
                            <> · {t("tutor.exam.list.releasedOn", { date: when(row.attempt.released_at) })}</>
                          )}
                        </small>
                      )}
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
            )}
          </section>
        )}
      </div>
    </TutorPageShell>
  );
}
