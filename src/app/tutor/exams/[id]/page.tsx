"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Check, Clock, Lock, RotateCcw, Send, X } from "lucide-react";
import TutorPageShell from "@/components/tutor/TutorPageShell";
import type { TutorExamDetail, TutorQuestion } from "@/lib/exam-data";
import {
  closeTutorExam,
  gradeTutorExam,
  getTutorExam,
  releaseTutorExam,
  reopenTutorExam,
} from "@/lib/tutor-data";
import { useLanguage } from "@/i18n/LanguageProvider";
import ui from "@/components/portal/bands.module.css";

const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;

/** A tutor's own mark entry, editable before it is saved. */
type Mark = { awarded_points: number | null; feedback: string };

const EMPTY_MARK: Mark = { awarded_points: null, feedback: "" };

/**
 * Marking and releasing one sitting.
 *
 * Two facts shape this screen. The objective half of the paper was already
 * scored by the server when the learner submitted, so only the written answers
 * need a human; and nothing here is visible to the learner until the release
 * action runs, which is why marking and releasing are separate buttons rather
 * than one.
 */
export default function TutorExamMarkingPage() {
  const { t } = useLanguage();
  // The id comes from the route, and the page 404s on the server side if it is
  // not one of this tutor's papers - so an unparseable id is a broken link, not
  // a request to make.
  const raw = useParams<{ id: string }>();
  const examId = Number(raw?.id);
  const validId = Number.isInteger(examId) && examId > 0;
  const [detail, setDetail] = useState<TutorExamDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [marks, setMarks] = useState<Record<number, Mark>>({});
  const [dirty, setDirty] = useState(false);
  const [level, setLevel] = useState("");
  const [busy, setBusy] = useState<"none" | "save" | "release" | "close" | "reopen">("none");
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  // Bumped by every write action, so the paper on screen is re-read from the
  // server rather than patched from what the browser thinks it now says.
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    if (!validId) return;
    getTutorExam(examId)
      .then((d) => {
        setDetail(d);
        // Seed the inputs from what the tutor already saved, so a reload does
        // not quietly throw away marks that are on the server.
        const seeded: Record<number, Mark> = {};
        d.exam.attempt?.answers.forEach((a) => {
          seeded[a.question_id] = { awarded_points: a.awarded_points, feedback: a.feedback ?? "" };
        });
        setMarks(seeded);
        setDirty(false);
      })
      .catch((e: Error) => setError(e instanceof Error ? e.message : t("tutor.exam.mark.loadFail")));
  }, [examId, t, validId, refresh]);

  const exam = detail?.exam ?? null;
  const attempt = exam?.attempt ?? null;
  const questions = useMemo(() => detail?.questions ?? [], [detail]);

  // The written half is what the tutor owes a mark to; objective questions
  // already carry the server's verdict and only need an override if the tutor
  // chooses to give one.
  const written = useMemo(() => questions.filter((q) => q.type === "written"), [questions]);

  const unmarked = written.filter((q) => marks[q.id]?.awarded_points === null || marks[q.id]?.awarded_points === undefined);

  const markedTotal = useMemo(() => {
    if (!attempt) return 0;
    const manual = written.reduce((sum, q) => sum + (marks[q.id]?.awarded_points ?? 0), 0);
    return (attempt.auto_score ?? 0) + manual;
  }, [attempt, written, marks]);

  const patch = (id: number, change: Partial<Mark>) => {
    setMarks((prev) => ({ ...prev, [id]: { ...EMPTY_MARK, ...prev[id], ...change } }));
    setDirty(true);
  };

  const optionText = (q: TutorQuestion, index: number | null | undefined) =>
    index === null || index === undefined ? null : q.options?.[index] ?? null;

  const run = async (kind: "save" | "release" | "close" | "reopen", action: () => Promise<unknown>, done: string) => {
    setBusy(kind);
    setNotice(null);
    try {
      await action();
      setRefresh((n) => n + 1);
      setNotice({ ok: true, text: done });
    } catch (e) {
      setNotice({ ok: false, text: e instanceof Error ? e.message : t("tutor.exam.mark.fail") });
    } finally {
      setBusy("none");
    }
  };

  const saveMarks = () =>
    run(
      "save",
      () =>
        gradeTutorExam(
          examId,
          attempt!.id,
          // Only questions the tutor actually touched are sent: the endpoint
          // replaces what it receives and leaves the rest of the paper alone.
          Object.entries(marks)
            .filter(([, m]) => m.awarded_points !== null || m.feedback.trim() !== "")
            .map(([id, m]) => ({
              question_id: Number(id),
              awarded_points: m.awarded_points ?? 0,
              feedback: m.feedback.trim() || null,
            })),
        ),
      t("tutor.exam.mark.saved"),
    );

  const release = () =>
    run("release", () => releaseTutorExam(examId, attempt!.id, level || null), t("tutor.exam.mark.released"));

  if (!validId || error) {
    return (
      <TutorPageShell>
        <div className={ui.pageStack}>
          <p role="alert" className={ui.statusBad}>
            {validId
              ? t("tutor.exam.list.loadError", { message: error ?? "" })
              : t("tutor.exam.mark.badId")}
          </p>
          <p>
            <Link className={ui.textLink} href="/tutor/exams">
              {t("tutor.exam.mark.backToList")} <ArrowLeft size={13} aria-hidden />
            </Link>
          </p>
        </div>
      </TutorPageShell>
    );
  }

  if (!detail || !exam) {
    return (
      <TutorPageShell>
        <div className={ui.pageStack}>
          <p className={ui.lede}>{t("tutor.common.loading")}</p>
        </div>
      </TutorPageShell>
    );
  }

  const released = attempt?.status === "released";
  const open = attempt?.status === "in_progress";
  const markable = attempt !== null && !open && !released;

  return (
    <TutorPageShell>
      <div className={ui.pageStack}>
        <header className={ui.pageHeading}>
          <div>
            <p className={ui.kicker}>{t("tutor.exam.mark.kicker")}</p>
            <h1>{exam.title}</h1>
            <p>
              {exam.learner_name} · {t("tutor.exam.list.dueBy")} {new Date(exam.due_at).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}
            </p>
          </div>
          <Link className={ui.headerAction} href="/tutor/exams">
            <ArrowLeft size={14} aria-hidden /> {t("tutor.exam.mark.backToList")}
          </Link>
        </header>

        <ul className={ui.stats}>
          <li>
            <span>{t("tutor.exam.list.questions", { n: exam.question_count })}</span>
            <small>{t("tutor.exam.mark.ofPaper")}</small>
          </li>
          <li>
            <span>{t("tutor.exam.list.points", { n: exam.total_points })}</span>
            <small>{t("tutor.exam.mark.totalAvailable")}</small>
          </li>
          <li>
            <span>{t("tutor.exam.list.minutes", { n: exam.duration_minutes })}</span>
            <small>{t("tutor.exam.mark.sittingWindow")}</small>
          </li>
          <li>
            <span>{attempt ? markedTotal : "—"}</span>
            <small>{released ? t("tutor.exam.mark.published") : t("tutor.exam.mark.runningTotal")}</small>
          </li>
        </ul>

        {notice && (
          <p role="status" className={notice.ok ? ui.lede : ui.statusBad}>
            {notice.text}
          </p>
        )}

        {!attempt && (
          <section className={ui.band} aria-labelledby="wait-h">
            <div className={ui.bandStatement}>
              <p className={ui.bandLabel}>
                <Clock size={13} aria-hidden /> {t("tutor.exam.mark.notSitted")}
              </p>
              <h2 id="wait-h" className={ui.bandTitle}>{t("tutor.exam.mark.watchTitle")}</h2>
              <p>{t("tutor.exam.mark.watchBody")}</p>
              <p className={ui.rowNote}>{t("tutor.exam.mark.watchNote")}</p>
            </div>
          </section>
        )}

        {attempt && (
          <section className={ui.band} aria-labelledby="sitting-h">
            <div className={ui.bandHead}>
              <h2 id="sitting-h" className={ui.bandLabel}>{t("tutor.exam.mark.sitting")}</h2>
              <span className={`${ui.statusPill} ${released ? ui.statusOk : ""}`}>
                {t(attemptStateKey(attempt.status))}
              </span>
            </div>
            <dl className={ui.rows}>
              <div>
                <dt>{t("tutor.exam.mark.started")}</dt>
                <dd className={ui.rowNote}>{new Date(attempt.started_at).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}</dd>
              </div>
              <div>
                <dt>{t("tutor.exam.mark.ended")}</dt>
                <dd className={ui.rowNote}>
                  {attempt.submitted_at
                    ? new Date(attempt.submitted_at).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })
                    : t("tutor.exam.mark.notSubmitted")}
                </dd>
              </div>
              <div>
                <dt>{t("tutor.exam.mark.objectiveScore")}</dt>
                <dd className={ui.rowNote}>
                  {attempt.auto_score !== null
                    ? t("tutor.exam.mark.awarded", { score: attempt.auto_score, total: exam.total_points })
                    : t("tutor.exam.mark.unscored")}
                </dd>
              </div>
            </dl>
            {open && <p className={ui.rowNote}>{t("tutor.exam.mark.openNote")}</p>}
          </section>
        )}

        {questions.map((q, i) => {
          const answer = attempt?.answers.find((a) => a.question_id === q.id) ?? null;
          const mark = marks[q.id] ?? EMPTY_MARK;
          const chosen = q.type === "multiple_choice" ? optionText(q, answer?.choice_index) : null;
          const correctText = optionText(q, q.correct_index);
          return (
            <section key={q.id} className={ui.band} aria-labelledby={`q-${q.id}`}>
              <div className={ui.bandHead}>
                <h2 id={`q-${q.id}`} className={ui.bandTitle}>
                  {t("tutor.exam.mark.question", { n: i + 1, of: questions.length })}
                </h2>
                <span className={`${ui.statusPill} ${q.type === "written" ? "" : answer?.correct ? ui.statusOk : answer ? ui.statusBad : ""}`}>
                  {q.type === "written"
                    ? t("tutor.exam.mark.writtenTag")
                    : answer?.correct === true
                      ? t("tutor.exam.mark.correctTag")
                      : answer?.correct === false
                        ? t("tutor.exam.mark.wrongTag")
                        : t("tutor.exam.mark.answerTag")}
                  {" · "}
                  {t("tutor.exam.list.pointsEach", { n: q.points })}
                </span>
              </div>
              <p className={ui.lede}>{q.prompt}</p>

              <dl className={ui.rows}>
                <div>
                  <dt>{t("tutor.exam.mark.learnerAnswer")}</dt>
                  <dd className={ui.rowNote}>
                    {q.type === "multiple_choice"
                      ? chosen ?? t("tutor.exam.mark.noAnswer")
                      : answer?.text?.trim()
                        ? answer.text
                        : t("tutor.exam.mark.noAnswer")}
                  </dd>
                </div>
                {q.type === "multiple_choice" && correctText && (
                  <div>
                    <dt>{t("tutor.exam.mark.answerKey")}</dt>
                    <dd className={ui.rowNote}>
                      <Check size={12} aria-hidden /> {correctText}
                    </dd>
                  </div>
                )}
              </dl>

              {attempt && !open && (
                <div className={ui.form}>
                  <label>
                    {t("tutor.exam.mark.award")}
                    <input
                      className={ui.input}
                      type="number"
                      min={0}
                      max={q.points}
                      value={mark.awarded_points ?? ""}
                      disabled={released || !markable}
                      placeholder={q.type === "multiple_choice" ? String(attempt.auto_score !== null ? (answer?.correct ? q.points : 0) : "") : "0"}
                      onChange={(e) =>
                        patch(q.id, { awarded_points: e.target.value === "" ? null : Number(e.target.value) })
                      }
                    />
                  </label>
                  <label className={ui.wide}>
                    {t("tutor.exam.mark.feedback")}
                    <textarea
                      className={ui.textarea}
                      value={mark.feedback}
                      maxLength={4000}
                      disabled={released}
                      placeholder={t("tutor.exam.mark.feedbackPlaceholder")}
                      onChange={(e) => patch(q.id, { feedback: e.target.value })}
                    />
                  </label>
                </div>
              )}
            </section>
          );
        })}

        {attempt && markable && (
          <section className={ui.band} aria-labelledby="release-h">
            <h2 id="release-h" className={ui.bandLabel}>{t("tutor.exam.mark.releaseHeading")}</h2>
            <p className={ui.lede}>{t("tutor.exam.mark.releaseNote")}</p>

            {dirty && <p className={ui.rowNote}>{t("tutor.exam.mark.unsaved")}</p>}
            {!dirty && unmarked.length > 0 && (
              <p className={ui.rowNote}>
                {t("tutor.exam.mark.stillUnmarked", { n: unmarked.length })}
              </p>
            )}
            {unmarked.length === 0 && !dirty && (
              <p className={ui.lede}>{t("tutor.exam.mark.allMarked", { score: markedTotal, total: exam.total_points })}</p>
            )}

            <div className={ui.form}>
              <label>
                {t("tutor.exam.mark.levelChange")}
                <select className={ui.select} value={level} onChange={(e) => setLevel(e.target.value)}>
                  <option value="">{t("tutor.exam.mark.levelNone")}</option>
                  {LEVELS.map((l) => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  ))}
                </select>
              </label>
              <p className={`${ui.wide} ${ui.rowNote}`}>{t("tutor.exam.mark.levelNote")}</p>
            </div>

            <div className={ui.formActions}>
              <button
                type="button"
                className={ui.btn}
                onClick={saveMarks}
                disabled={busy !== "none" || !dirty}
              >
                {busy === "save" ? t("tutor.exam.mark.saving") : t("tutor.exam.mark.saveMarks")}
              </button>
              <button
                type="button"
                className={ui.btnCoral}
                onClick={release}
                disabled={busy !== "none" || unmarked.length > 0 || dirty}
              >
                <Send size={14} aria-hidden />
                {busy === "release" ? t("tutor.exam.mark.releasing") : t("tutor.exam.mark.release")}
              </button>
            </div>
          </section>
        )}

        {released && (
          <section className={ui.band} aria-labelledby="published-h">
            <div className={ui.bandStatement}>
              <p className={ui.bandLabel}>
                <Lock size={13} aria-hidden /> {t("tutor.exam.mark.publishedTitle")}
              </p>
              <h2 id="published-h" className={ui.bandTitle}>{exam.title}</h2>
              <p>
                {t("tutor.exam.mark.publishedBody", {
                  score: (attempt?.auto_score ?? 0) + (attempt?.manual_score ?? 0),
                  total: attempt?.total_points ?? exam.total_points,
                })}
              </p>
              {attempt?.level_after && (
                <p>
                  {t("tutor.exam.mark.levelMoved", {
                    before: attempt.level_before ?? t("tutor.exam.mark.levelUnset"),
                    after: attempt.level_after,
                  })}
                </p>
              )}
              <p>
                <button type="button" className={ui.textLink} onClick={() => void run("reopen", () => reopenTutorExam(examId, attempt!.id), t("tutor.exam.mark.reopened"))} disabled={busy !== "none"}>
                  <RotateCcw size={13} aria-hidden /> {t("tutor.exam.mark.reopen")}
                </button>
              </p>
              <p className={ui.rowNote}>{t("tutor.exam.mark.reopenNote")}</p>
            </div>
          </section>
        )}

        {exam.status === "published" && !released && (
          <section className={ui.band}>
            <div className={ui.formActions}>
              <button
                type="button"
                className={ui.btn}
                onClick={() => void run("close", () => closeTutorExam(examId), t("tutor.exam.mark.closed"))}
                disabled={busy !== "none"}
              >
                <X size={14} aria-hidden />
                {busy === "close" ? t("tutor.exam.mark.closing") : t("tutor.exam.mark.closeEarly")}
              </button>
              <p className={ui.rowNote}>{t("tutor.exam.mark.closeNote")}</p>
            </div>
          </section>
        )}
      </div>
    </TutorPageShell>
  );
}

function attemptStateKey(status: string): string {
  return status === "released"
    ? "tutor.exam.mark.state.released"
    : status === "expired"
      ? "tutor.exam.mark.state.expired"
      : status === "in_progress"
        ? "tutor.exam.mark.state.in_progress"
        : "tutor.exam.mark.state.submitted";
}
