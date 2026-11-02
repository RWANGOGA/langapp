"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowRight, Lock, Plus, Trash2 } from "lucide-react";
import TutorPageShell from "@/components/tutor/TutorPageShell";
import type { TutorExamDetail } from "@/lib/exam-data";
import {
  getTutorExam,
  updateTutorExam,
  type ExamDraftQuestion,
  type ExamPatch,
} from "@/lib/tutor-data";
import { useLanguage } from "@/i18n/LanguageProvider";
import ui from "@/components/portal/bands.module.css";

/**
 * The same row shape the builder uses, so an edit and a first draft are checked
 * by one set of rules instead of two.
 */
type DraftRow = {
  key: number;
  type: "multiple_choice" | "written";
  prompt: string;
  points: number;
  options: string[];
  correct_index: number | null;
};

/**
 * The paper arrives as a UTC instant and the field is a wall-clock one: the
 * browser shows the tutor their own clock, and the save converts it back.
 */
function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * Rows as the server wants them: blanks dropped and the key re-pointed at the
 * option that survived the filter, because the answer travels with its text and
 * not with its slot.
 */
function asDraft(rows: DraftRow[]): ExamDraftQuestion[] {
  return rows.map((row, i) => {
    const base = { position: i, type: row.type, prompt: row.prompt.trim(), points: row.points };
    if (row.type !== "multiple_choice") return base;
    const kept = row.options
      .map((text, index) => ({ text: text.trim(), index }))
      .filter((o) => o.text !== "");
    const correct = kept.findIndex((o) => o.index === row.correct_index);
    return { ...base, options: kept.map((o) => o.text), correct_index: correct };
  });
}

/** The same shape, so a stored paper and an untouched form compare equal. */
function asSignature(list: { type: string; prompt: string; points: number; options?: string[] | null; correct_index?: number | null }[]): string {
  return JSON.stringify(
    list.map((q) => [
      q.type,
      q.prompt.trim(),
      q.points,
      q.options?.length ? q.options : null,
      q.options?.length ? (q.correct_index ?? null) : null,
    ])
  );
}

/**
 * Changing a paper that is already out.
 *
 * The deadline is the reason this page exists: a learner who was away asks for
 * another day, and the answer should be one field, not a rebuilt paper. Two
 * limits are inherited from the server rather than decided here - the window of
 * a sitting under way belongs to the learner who started it, and questions stop
 * moving once anybody has answered one.
 */
export default function TutorExamEditPage() {
  const { t } = useLanguage();
  const raw = useParams<{ id: string }>();
  const examId = Number(raw?.id);
  const validId = Number.isInteger(examId) && examId > 0;
  const router = useRouter();

  const [detail, setDetail] = useState<TutorExamDetail | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [instructions, setInstructions] = useState("");
  const [duration, setDuration] = useState("30");
  const [dueAt, setDueAt] = useState("");
  const [shuffle, setShuffle] = useState(false);
  const [rows, setRows] = useState<DraftRow[]>([]);
  const [nextKey, setNextKey] = useState(0);
  const [problems, setProblems] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);

  // The values as they were loaded, so the save sends only what was touched.
  const [seed, setSeed] = useState<{ title: string; instructions: string; duration: number; dueMs: number; shuffle: boolean } | null>(null);

  useEffect(() => {
    if (!validId) return;
    getTutorExam(examId)
      .then((d) => {
        setDetail(d);
        const e = d.exam;
        setTitle(e.title);
        setInstructions(e.instructions ?? "");
        setDuration(String(e.duration_minutes));
        setDueAt(toLocalInput(e.due_at));
        setShuffle(e.shuffle_questions);
        setRows(
          d.questions.map((q, i) => ({
            key: i,
            type: q.type,
            prompt: q.prompt,
            points: q.points,
            options: q.options ?? [],
            correct_index: q.correct_index,
          }))
        );
        setNextKey(d.questions.length);
        setSeed({
          title: e.title,
          instructions: e.instructions ?? "",
          duration: e.duration_minutes,
          dueMs: new Date(e.due_at).getTime(),
          shuffle: e.shuffle_questions,
        });
      })
      .catch((e: Error) => setLoadError(e instanceof Error ? e.message : t("tutor.exam.mark.loadFail")));
  }, [examId, t, validId]);

  const attempt = detail?.exam.attempt ?? null;
  const locked = attempt !== null;
  const dueMoved = seed !== null && dueAt !== "" && new Date(dueAt).getTime() !== seed.dueMs;
  const totalPoints = useMemo(() => rows.reduce((sum, r) => sum + (r.points || 0), 0), [rows]);

  const patch = (key: number, change: Partial<DraftRow>) =>
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...change } : r)));

  const addRow = () => {
    setRows((prev) => [...prev, { key: nextKey, type: "multiple_choice", prompt: "", points: 1, options: ["", "", ""], correct_index: null }]);
    setNextKey((k) => k + 1);
  };

  const removeRow = (key: number) =>
    setRows((prev) => (prev.length > 1 ? prev.filter((r) => r.key !== key) : prev));

  /**
   * One pass, whole list, before anything leaves the browser - the same rule the
   * builder applies, minus the fields this page does not offer.
   */
  const validate = (): string[] => {
    const out: string[] = [];
    if (!title.trim()) out.push(t("tutor.exam.build.needTitle"));
    const minutes = Number(duration);
    if (!Number.isInteger(minutes) || minutes < 1 || minutes > 480) out.push(t("tutor.exam.build.needDuration"));
    const due = dueAt ? new Date(dueAt) : null;
    if (!due || Number.isNaN(due.getTime())) out.push(t("tutor.exam.build.needDue"));
    // Only a moved deadline is held to the future: a paper whose window has
    // passed must still be savable for its wording, and extending it is checked
    // by the server as well.
    else if (dueMoved && due.getTime() <= Date.now()) out.push(t("tutor.exam.build.duePast"));

    if (!locked) {
      rows.forEach((row, i) => {
        const label = t("tutor.exam.build.problemRow", { n: i + 1 });
        if (!row.prompt.trim()) out.push(t("tutor.exam.build.problemPrompt", { row: label }));
        if (!Number.isInteger(row.points) || row.points < 0) out.push(t("tutor.exam.build.problemPoints", { row: label }));
        if (row.type === "multiple_choice") {
          const filled = row.options.map((o) => o.trim()).filter(Boolean);
          if (filled.length < 2) out.push(t("tutor.exam.build.problemOptions", { row: label }));
          if (row.correct_index === null || !row.options[row.correct_index]?.trim())
            out.push(t("tutor.exam.build.problemKey", { row: label }));
        }
      });
    }
    return out;
  };

  const save = async () => {
    if (!seed) return;
    const found = validate();
    setProblems(found);
    setFailed(null);
    if (found.length) return;

    const body: ExamPatch = {};
    if (title.trim() !== seed.title) body.title = title.trim();
    if (instructions.trim() !== seed.instructions) body.instructions = instructions.trim() || null;
    if (Number(duration) !== seed.duration) body.duration_minutes = Number(duration);
    if (dueMoved) body.due_at = new Date(dueAt).toISOString();
    if (shuffle !== seed.shuffle) body.shuffle_questions = shuffle;
    // Questions replace wholesale on the server, so they are only sent when the
    // tutor really changed one: an untouched list must not be rewritten into
    // fresh rows every time somebody fixes a title.
    if (!locked && asSignature(rows) !== asSignature(detail!.questions)) {
      body.questions = asDraft(rows);
    }

    if (Object.keys(body).length === 0) {
      setFailed(t("tutor.exam.edit.nothingChanged"));
      return;
    }

    setBusy(true);
    try {
      await updateTutorExam(examId, body);
      router.push(`/tutor/exams/${examId}`);
    } catch (e) {
      setFailed(e instanceof Error ? e.message : t("tutor.exam.edit.fail"));
      setBusy(false);
    }
  };

  if (loadError) {
    return (
      <TutorPageShell>
        <div className={ui.pageStack}>
          <p role="alert" className={ui.statusBad}>
            {t("tutor.exam.list.loadError", { message: loadError })}
          </p>
        </div>
      </TutorPageShell>
    );
  }

  if (!detail) {
    return (
      <TutorPageShell>
        <div className={ui.pageStack}>
          <p className={ui.lede}>{t("tutor.common.loading")}</p>
        </div>
      </TutorPageShell>
    );
  }

  const exam = detail.exam;
  const stateKey = exam.status === "closed" ? "exam.state.closed" : "exam.state.published";

  return (
    <TutorPageShell>
      <div className={ui.pageStack}>
        <header className={ui.pageHeading}>
          <div>
            <p className={ui.kicker}>{t("tutor.exam.build.kicker")}</p>
            <h1>{t("tutor.exam.edit.title")}</h1>
            <p>{t("tutor.exam.edit.for", { name: exam.learner_name })} · {t("tutor.exam.list.dueBy")} {new Date(exam.due_at).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}</p>
          </div>
          <Link className={ui.headerAction} href={`/tutor/exams/${examId}`}>
            {t("tutor.exam.edit.backToPaper")} <ArrowRight size={14} aria-hidden />
          </Link>
        </header>

        <section className={ui.band} aria-labelledby="paper-h">
          <div className={ui.bandHead}>
            <h2 id="paper-h" className={ui.bandLabel}>{t("tutor.exam.build.paperHeading")}</h2>
            <span className={ui.statusPill}>{t(stateKey)}</span>
          </div>
          <p className={ui.lede}>{t("tutor.exam.edit.lede")}</p>
          <div className={ui.form}>
            <label>
              {t("tutor.exam.build.titleField")}
              <input
                className={ui.input}
                value={title}
                maxLength={200}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </label>
            <label>
              {t("tutor.exam.build.duration")}
              <input
                className={ui.input}
                type="number"
                min={1}
                max={480}
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                required
              />
            </label>
            <label>
              {t("tutor.exam.build.due")}
              <input
                className={ui.input}
                type="datetime-local"
                value={dueAt}
                onChange={(e) => setDueAt(e.target.value)}
                required
              />
            </label>
            <label className={ui.wide}>
              {t("tutor.exam.build.instructions")}
              <textarea
                className={ui.textarea}
                value={instructions}
                maxLength={4000}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder={t("tutor.exam.build.instructionsPlaceholder")}
              />
            </label>
            <div className={`${ui.wide} ${ui.rowNote}`}>
              <label style={{ textTransform: "none", letterSpacing: "normal", fontWeight: 500 }}>
                <input
                  type="checkbox"
                  checked={shuffle}
                  onChange={(e) => setShuffle(e.target.checked)}
                />{" "}
                {t("tutor.exam.build.shuffle")}
              </label>
              <p className={ui.rowNote}>{t("tutor.exam.build.shuffleNote")}</p>
            </div>
          </div>
          <p className={ui.rowNote}>{dueMoved ? t("tutor.exam.edit.movingNote") : t("tutor.exam.edit.deadlineNote")}</p>
          {attempt?.status === "in_progress" && (
            <p className={ui.rowNote}>{t("tutor.exam.edit.sittingNote", { name: exam.learner_name })}</p>
          )}
          {exam.status === "closed" && (
            <p className={ui.rowNote}>{t("tutor.exam.edit.closedNote")}</p>
          )}
          {attempt?.status === "released" && (
            <p className={ui.rowNote}>{t("tutor.exam.edit.releasedNote")}</p>
          )}
        </section>

        {locked ? (
          <section className={ui.band} aria-labelledby="locked-h">
            <h2 id="locked-h" className={ui.bandLabel}>
              <Lock size={13} aria-hidden /> {t("tutor.exam.edit.lockedTitle")}
            </h2>
            <p className={ui.lede}>{t("tutor.exam.edit.lockedBody", { name: exam.learner_name })}</p>
            <ul className={ui.ticks}>
              {detail.questions.map((q, i) => (
                <li key={q.id}>
                  {t("tutor.exam.build.question", { n: i + 1, of: detail.questions.length })} · {q.prompt} · {t("tutor.exam.list.pointsEach", { n: q.points })}
                </li>
              ))}
            </ul>
          </section>
        ) : (
          <section className={ui.band} aria-labelledby="questions-h">
            <div className={ui.bandHead}>
              <h2 id="questions-h" className={ui.bandLabel}>{t("tutor.exam.build.questionsHeading")}</h2>
              <span className={ui.bandLabel}>{t("tutor.exam.build.totalPoints", { n: totalPoints })}</span>
            </div>

            {rows.map((row, i) => (
              <div key={row.key} className={ui.questionCard}>
                <div className={ui.bandHead}>
                  <p className={ui.bandLabel}>
                    {t("tutor.exam.build.question", { n: i + 1, of: rows.length })}
                  </p>
                  {rows.length > 1 && (
                    <button type="button" className={ui.textLink} onClick={() => removeRow(row.key)}>
                      <Trash2 size={13} aria-hidden /> {t("tutor.exam.build.remove")}
                    </button>
                  )}
                </div>

                <div className={ui.form}>
                  <label>
                    {t("tutor.exam.build.type")}
                    <select
                      className={ui.select}
                      value={row.type}
                      onChange={(e) =>
                        patch(row.key, { type: e.target.value as DraftRow["type"], options: e.target.value === "written" ? [] : ["", "", ""], correct_index: null })
                      }
                    >
                      <option value="multiple_choice">{t("tutor.exam.build.typeObjective")}</option>
                      <option value="written">{t("tutor.exam.build.typeWritten")}</option>
                    </select>
                  </label>
                  <label>
                    {t("tutor.exam.build.points")}
                    <input
                      className={ui.input}
                      type="number"
                      min={0}
                      max={100}
                      value={row.points}
                      onChange={(e) => patch(row.key, { points: Number(e.target.value) })}
                    />
                  </label>
                  <label className={ui.wide}>
                    {t("tutor.exam.build.prompt")}
                    <textarea
                      className={ui.textarea}
                      value={row.prompt}
                      maxLength={5000}
                      onChange={(e) => patch(row.key, { prompt: e.target.value })}
                      placeholder={t("tutor.exam.build.promptPlaceholder")}
                    />
                  </label>
                </div>

                {row.type === "multiple_choice" && (
                  <div className={ui.optionRow}>
                    <p className={ui.bandLabel}>{t("tutor.exam.build.optionsHeading")}</p>
                    {row.options.map((option, index) => (
                      <div key={index} className={ui.option}>
                        <input
                          type="radio"
                          name={`key-${row.key}`}
                          aria-label={t("tutor.exam.build.markCorrect", { n: index + 1 })}
                          checked={row.correct_index === index}
                          onChange={() => patch(row.key, { correct_index: index })}
                        />
                        <input
                          className={ui.input}
                          value={option}
                          maxLength={500}
                          placeholder={t("tutor.exam.build.optionPlaceholder")}
                          onChange={(e) =>
                            patch(row.key, { options: row.options.map((o, k) => (k === index ? e.target.value : o)) })
                          }
                        />
                        {row.options.length > 2 && (
                          <button
                            type="button"
                            className={ui.textLink}
                            aria-label={t("tutor.exam.build.removeOption", { n: index + 1 })}
                            onClick={() =>
                              patch(row.key, {
                                options: row.options.filter((_, k) => k !== index),
                                correct_index:
                                  row.correct_index === index
                                    ? null
                                    : (row.correct_index ?? 0) > index
                                      ? row.correct_index! - 1
                                      : row.correct_index,
                              })
                            }
                          >
                            <Trash2 size={13} aria-hidden />
                          </button>
                        )}
                      </div>
                    ))}
                    <div className={ui.formActions}>
                      {row.options.length < 10 && (
                        <button
                          type="button"
                          className={ui.btn}
                          onClick={() => patch(row.key, { options: [...row.options, ""] })}
                        >
                          <Plus size={14} aria-hidden /> {t("tutor.exam.build.addOption")}
                        </button>
                      )}
                      <p className={ui.rowNote}>{t("tutor.exam.build.keyNote")}</p>
                    </div>
                  </div>
                )}
              </div>
            ))}

            <div className={ui.formActions}>
              <button type="button" className={ui.btn} onClick={addRow}>
                <Plus size={14} aria-hidden /> {t("tutor.exam.build.addQuestion")}
              </button>
            </div>
          </section>
        )}

        <section className={ui.band} aria-labelledby="save-h">
          <h2 id="save-h" className={ui.bandLabel}>{t("tutor.exam.edit.saveHeading")}</h2>
          <p className={ui.lede}>{t("tutor.exam.edit.saveNote")}</p>

          {problems.length > 0 && (
            <ul role="alert" className={ui.ticks}>
              {problems.map((p) => (
                <li key={p} style={{ color: "var(--p-danger)" }}>
                  {p}
                </li>
              ))}
            </ul>
          )}
          {failed && (
            <p role="alert" className={ui.statusBad}>
              {failed}
            </p>
          )}

          <div className={ui.formActions}>
            <button type="button" className={ui.btnCoral} onClick={save} disabled={busy}>
              {busy ? t("tutor.exam.edit.saving") : t("tutor.exam.edit.save")}
            </button>
            <Link className={ui.textLink} href={`/tutor/exams/${examId}`}>
              {t("tutor.exam.build.cancel")}
            </Link>
          </div>
        </section>
      </div>
    </TutorPageShell>
  );
}
