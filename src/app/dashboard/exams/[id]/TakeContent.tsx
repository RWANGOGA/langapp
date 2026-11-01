"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Clock, Save } from "lucide-react";
import type { ExamSubmitResult, LearnerPaper, LearnerQuestion } from "@/lib/exam-data";
import { apiSendClient } from "@/lib/api-client";
import Countdown from "@/components/shared/Countdown";
import { useLanguage } from "@/i18n/LanguageProvider";
import ui from "@/components/portal/bands.module.css";

type Draft = { choice_index?: number; text?: string };

/**
 * Sitting a paper.
 *
 * The countdown starts from the server's `secondsLeft` and the deadline behind
 * it was frozen when the attempt began, so reloading cannot buy time: the next
 * read returns the same `expires_at`. When the timer runs out this screen asks
 * the server to submit, and the server decides what the overrun means - it can
 * mark the paper `expired` and grade only what was actually answered.
 */
export default function TakeContent({ paper: seeded }: { paper: LearnerPaper }) {
  const { t } = useLanguage();
  const [paper, setPaper] = useState(seeded);
  const [answers, setAnswers] = useState<Record<number, Draft>>({});
  const [save, setSave] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [busy, setBusy] = useState<"none" | "start" | "submit">("none");
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const [result, setResult] = useState<ExamSubmitResult | null>(null);
  const timers = useRef<Record<number, ReturnType<typeof setTimeout>>>({});
  const closing = useRef(false);

  const answered = paper.questions.filter((q) => {
    const a = answers[q.id];
    return a && (a.choice_index !== undefined || (a.text ?? "").trim() !== "");
  }).length;

  // Re-seed only an open sitting, and only in case the tab was left open past
  // the deadline: an unstarted paper is never started by being looked at.
  useEffect(() => {
    if (seeded.state !== "in_progress") return;
    let cancelled = false;
    apiSendClient<LearnerPaper>("POST", `/learner/exams/${seeded.exam_id}/start`)
      .then((fresh) => {
        if (!cancelled && fresh.state === "in_progress") setPaper(fresh);
      })
      .catch(() => {
        // The paper on screen was read from the server seconds ago; a failed
        // refresh is not a reason to tell the learner their exam disappeared.
      });
    return () => {
      cancelled = true;
    };
    // The endpoint is resume-safe: an open sitting comes back unchanged, with
    // the deadline it was already held to.
  }, [seeded.exam_id, seeded.state]);

  // A debounced autosave must not outlive the screen: on unmount any answer
  // still waiting for its keystrokes to settle is dropped rather than sent into
  // a paper the learner has left.
  useEffect(() => {
    const pending = timers.current;
    return () => Object.values(pending).forEach(clearTimeout);
  }, []);

  const write = useCallback(
    async (question: LearnerQuestion, draft: Draft, debounce: boolean) => {
      setAnswers((prev) => ({ ...prev, [question.id]: { ...prev[question.id], ...draft } }));
      clearTimeout(timers.current[question.id]);
      if (debounce) {
        setSave("saving");
        timers.current[question.id] = setTimeout(() => void push(question, draft), 800);
        return;
      }
      await push(question, draft);

      async function push(q: LearnerQuestion, d: Draft) {
        setSave("saving");
        try {
          await apiSendClient("POST", `/learner/exams/${paper.exam_id}/answers`, {
            question_id: q.id,
            choice_index: d.choice_index ?? null,
            text: d.text ?? null,
          });
          setSave("saved");
        } catch (e) {
          // Past the deadline the server drops the write; say so plainly rather
          // than let an answer look saved when it was not taken.
          setSave("error");
          setNotice({ ok: false, text: e instanceof Error ? e.message : t("learner.exam.take.saveFail") });
        }
      }
    },
    [paper.exam_id, t],
  );

  const begin = async () => {
    setBusy("start");
    setNotice(null);
    try {
      setPaper(await apiSendClient<LearnerPaper>("POST", `/learner/exams/${paper.exam_id}/start`));
    } catch (e) {
      setNotice({ ok: false, text: e instanceof Error ? e.message : t("learner.exam.take.startFail") });
    } finally {
      setBusy("none");
    }
  };

  const finish = async () => {
    // One close per sitting: the tick and the button must not both submit.
    if (closing.current) return;
    closing.current = true;
    setBusy("submit");
    setNotice(null);
    try {
      setResult(await apiSendClient<ExamSubmitResult>("POST", `/learner/exams/${paper.exam_id}/submit`, {}));
    } catch (e) {
      // A failed call is not a closed paper - let the learner press the button.
      closing.current = false;
      setNotice({ ok: false, text: e instanceof Error ? e.message : t("learner.exam.take.submitFail") });
    } finally {
      setBusy("none");
    }
  };

  // A sitting whose time runs out is not left open: this tick asks the server to
  // close it once the deadline frozen at the start has passed, and the server
  // grades whatever had actually arrived. The browser only does the asking - the
  // deadline it compares against came from the server.
  useEffect(() => {
    if (paper.state !== "in_progress" || !paper.expires_at) return;
    const deadline = Date.parse(paper.expires_at);
    const tick = setInterval(() => {
      if (Date.now() < deadline) return;
      clearInterval(tick);
      void finish();
    }, 1000);
    return () => clearInterval(tick);
    // `finish` submits the sitting this paper describes, and the deadline it
    // watches is fixed for the life of that sitting, so re-subscribing on every
    // render would only restart the count.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paper.state, paper.expires_at]);

  /* — states that are not a sitting — */

  if (result) {
    const scored = result.auto_score !== null && result.total_points !== null;
    return (
      <div className={ui.pageStack}>
        <section className={ui.band} aria-labelledby="done-h">
          <div className={ui.bandStatement}>
            <p className={ui.bandLabel}>
              <Save size={13} aria-hidden />{" "}
              {result.status === "expired" ? t("learner.exam.take.expiredTitle") : t("learner.exam.take.submittedTitle")}
            </p>
            <h1 id="done-h">{t("learner.exam.take.title")}</h1>
            <p>{paper.title}</p>
            <p>
              {scored
                ? t("learner.exam.take.objective", { score: result.auto_score ?? 0, total: result.total_points ?? 0 })
                : t("learner.exam.take.noObjective")}
            </p>
            <p>{t("learner.exam.take.waiting")}</p>
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

  if (paper.state === "released") {
    return (
      <Closed
        title={t("learner.exam.take.releasedTitle")}
        body={t("learner.exam.take.releasedBody")}
        action={
          <Link className={ui.btnCoral} href={`/dashboard/exams/${paper.exam_id}/result`}>
            {t("learner.exam.list.result")} <ArrowRight size={14} aria-hidden />
          </Link>
        }
      />
    );
  }

  if (paper.state === "submitted" || paper.state === "expired") {
    return (
      <Closed
        title={t(paper.state === "expired" ? "learner.exam.take.expiredTitle" : "learner.exam.take.submittedTitle")}
        body={t(paper.state === "expired" ? "learner.exam.take.expiredBody" : "learner.exam.take.submittedBody")}
      />
    );
  }

  if (!paper.attempt_id) {
    // The cover: everything a learner needs before committing to a clock that
    // starts on this page and cannot be paused.
    return (
      <div className={ui.pageStack}>
        <header className={ui.pageHeading}>
          <div>
            <p className={ui.kicker}>{t("learner.exam.take.kicker")}</p>
            <h1>{paper.title}</h1>
            <p>{paper.instructions ?? t("learner.exam.take.noInstructions")}</p>
          </div>
        </header>

        {notice && (
          <p role="alert" className={ui.statusBad}>
            {notice.text}
          </p>
        )}

        <section className={ui.band} aria-labelledby="cover-h">
          <h2 id="cover-h" className={ui.bandLabel}>{t("learner.exam.take.beforeYouStart")}</h2>
          <dl className={ui.rows}>
            <div>
              <dt>{t("learner.exam.take.questions")}</dt>
              <dd>{t("learner.exam.list.questions", { n: paper.question_count })}</dd>
            </div>
            <div>
              <dt>{t("learner.exam.take.marks")}</dt>
              <dd>{t("learner.exam.list.points", { n: paper.total_points })}</dd>
            </div>
            <div>
              <dt>{t("learner.exam.take.sitting")}</dt>
              <dd>{t("learner.exam.list.minutes", { n: paper.duration_minutes })}</dd>
            </div>
            <div>
              <dt>{t("learner.exam.take.deadline")}</dt>
              <dd>{new Date(paper.due_at).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}</dd>
            </div>
            <div>
              <dt>{t("learner.exam.take.timeLeft")}</dt>
              <dd className={ui.rowNote}>
                {paper.seconds_left > 0
                  ? t("learner.exam.list.closingMinutes", { n: Math.max(1, Math.round(paper.seconds_left / 60)) })
                  : t("learner.exam.take.windowClosed")}
              </dd>
            </div>
          </dl>
          <p className={ui.rowNote}>{t("learner.exam.take.hiddenUntilStart")}</p>
          <div className={ui.formActions}>
            <button type="button" className={ui.btnCoral} onClick={begin} disabled={busy !== "none"}>
              <Clock size={15} aria-hidden />
              {busy === "start" ? t("learner.exam.take.starting") : t("learner.exam.take.begin")}
            </button>
            <Link className={ui.textLink} href="/dashboard/exams">{t("learner.exam.take.backToList")}</Link>
          </div>
          <p className={ui.rowNote}>{t("learner.exam.take.beginWarning")}</p>
        </section>
      </div>
    );
  }

  /* — the sitting itself — */

  return (
    <div className={ui.pageStack}>
      <header className={ui.pageHeading}>
        <div>
          <p className={ui.kicker}>{t("learner.exam.take.kicker")}</p>
          <h1>{paper.title}</h1>
          {paper.instructions && <p>{paper.instructions}</p>}
        </div>
      </header>

      <section className={ui.band} aria-label={t("learner.exam.take.timerAria")}>
        <div className={ui.nextRow}>
          <Countdown initialSeconds={paper.seconds_left} />
          <span className={ui.statusPill}>
            {t("learner.exam.take.answeredOf", { answered, total: paper.questions.length })}
          </span>
        </div>
        {save !== "idle" && (
          <p role="status" className={save === "error" ? ui.statusBad : ui.lede}>
            {t(
              save === "saving" ? "learner.exam.take.saving"
              : save === "saved" ? "learner.exam.take.saved"
              : "learner.exam.take.saveFail",
            )}
          </p>
        )}
      </section>

      {notice && (
        <p role="alert" className={ui.statusBad}>
          {notice.text}
        </p>
      )}

      {paper.questions.map((q, i) => (
        <section key={q.id} className={ui.band} aria-labelledby={`q-${q.id}`}>
          <div className={ui.bandHead}>
            <h2 id={`q-${q.id}`} className={ui.bandTitle}>
              {t("learner.exam.take.question", { n: i + 1, of: paper.questions.length })}
            </h2>
            <span className={ui.statusPill}>{t("learner.exam.list.pointsEach", { n: q.points })}</span>
          </div>
          <p className={ui.lede}>{q.prompt}</p>

          {q.type === "multiple_choice" ? (
            <div role="radiogroup" aria-label={t("learner.exam.take.chooseAria", { n: i + 1 })} className={ui.optionRow}>
              {(q.options ?? []).map((option, index) => (
                <label key={index} className={ui.option}>
                  <input
                    type="radio"
                    name={`q${q.id}`}
                    checked={answers[q.id]?.choice_index === index}
                    onChange={() => void write(q, { choice_index: index }, false)}
                  />{" "}
                  {option}
                </label>
              ))}
            </div>
          ) : (
            <textarea
              className={ui.textarea}
              value={answers[q.id]?.text ?? ""}
              placeholder={t("learner.exam.take.writtenPlaceholder")}
              aria-label={t("learner.exam.take.answerAria", { n: i + 1 })}
              onChange={(e) => void write(q, { text: e.target.value }, true)}
            />
          )}
        </section>
      ))}

      <section className={ui.band} aria-labelledby="submit-h">
        <h2 id="submit-h" className={ui.bandLabel}>{t("learner.exam.take.submitHeading")}</h2>
        <p className={ui.lede}>{t("learner.exam.take.submitNote")}</p>
        <div className={ui.formActions}>
          <button type="button" className={ui.btnCoral} onClick={finish} disabled={busy !== "none"}>
            {busy === "submit" ? t("learner.exam.take.submitting") : t("learner.exam.take.submit")}
          </button>
        </div>
      </section>
    </div>
  );
}

/** A paper that is not sitting-able any more, said plainly. */
function Closed({ title, body, action }: { title: string; body: string; action?: React.ReactNode }) {
  const { t } = useLanguage();
  return (
    <div className={ui.pageStack}>
      <section className={ui.band} aria-labelledby="closed-h">
        <div className={ui.bandStatement}>
          <p className={ui.bandLabel}>{title}</p>
          <h1 id="closed-h">{t("learner.exam.take.closed")}</h1>
          <p>{body}</p>
          <p>
            {action ?? (
              <Link className={ui.textLink} href="/dashboard/exams">
                {t("learner.exam.take.backToList")} <ArrowRight size={13} aria-hidden />
              </Link>
            )}
          </p>
        </div>
      </section>
    </div>
  );
}
