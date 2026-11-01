"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Plus, Trash2 } from "lucide-react";
import TutorPageShell from "@/components/tutor/TutorPageShell";
import {
  createTutorExam,
  getTutorLearners,
  type ExamDraft,
  type ExamDraftQuestion,
  type TutorLearnerRow,
} from "@/lib/tutor-data";
import { useLanguage } from "@/i18n/LanguageProvider";
import ui from "@/components/portal/bands.module.css";

/**
 * The option list is edited as text and emptied rows are dropped on the way
 * out, so a tutor can add a fifth box and leave four blanks without the payload
 * carrying the blanks.
 */
type DraftRow = {
  key: number;
  type: "multiple_choice" | "written";
  prompt: string;
  points: number;
  options: string[];
  correct_index: number | null;
};

const emptyRow = (key: number): DraftRow => ({
  key,
  type: "multiple_choice",
  prompt: "",
  points: 1,
  options: ["", "", ""],
  correct_index: null,
});

/**
 * Composing a paper. There is no draft state behind this form: the create call
 * publishes, so the validation below runs before anything leaves the browser -
 * a half-filled paper must not become a live exam on a learner's dashboard.
 */
export default function TutorExamBuilderPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const [learners, setLearners] = useState<TutorLearnerRow[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [learnerId, setLearnerId] = useState("");
  const [title, setTitle] = useState("");
  const [instructions, setInstructions] = useState("");
  const [duration, setDuration] = useState("30");
  const [dueAt, setDueAt] = useState("");
  const [shuffle, setShuffle] = useState(true);
  const [rows, setRows] = useState<DraftRow[]>([emptyRow(0)]);
  const [nextKey, setNextKey] = useState(1);
  const [problems, setProblems] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);

  useEffect(() => {
    getTutorLearners()
      .then((d) => setLearners(d.learners))
      .catch((e: Error) => setLoadError(e.message));
  }, []);

  const totalPoints = useMemo(() => rows.reduce((sum, r) => sum + (r.points || 0), 0), [rows]);

  const patch = (key: number, change: Partial<DraftRow>) =>
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...change } : r)));

  const addRow = () => {
    setRows((prev) => [...prev, emptyRow(nextKey)]);
    setNextKey((k) => k + 1);
  };

  const removeRow = (key: number) =>
    setRows((prev) => (prev.length > 1 ? prev.filter((r) => r.key !== key) : prev));

  /**
   * Everything the server would reject, collected in one pass so the tutor sees
   * the whole list instead of fixing one row per attempt.
   */
  const validate = (): string[] => {
    const out: string[] = [];
    if (!learnerId) out.push(t("tutor.exam.build.needLearner"));
    if (!title.trim()) out.push(t("tutor.exam.build.needTitle"));
    const minutes = Number(duration);
    if (!Number.isInteger(minutes) || minutes < 1 || minutes > 480) out.push(t("tutor.exam.build.needDuration"));
    const due = dueAt ? new Date(dueAt) : null;
    if (!due || Number.isNaN(due.getTime())) out.push(t("tutor.exam.build.needDue"));
    else if (due.getTime() <= Date.now()) out.push(t("tutor.exam.build.duePast"));

    rows.forEach((row, i) => {
      const label = t("tutor.exam.build.problemRow", { n: i + 1 });
      if (!row.prompt.trim()) out.push(t("tutor.exam.build.problemPrompt", { row: label }));
      if (!Number.isInteger(row.points) || row.points < 0) out.push(t("tutor.exam.build.problemPoints", { row: label }));
      if (row.type === "multiple_choice") {
        const filled = row.options.map((o) => o.trim()).filter(Boolean);
        if (filled.length < 2) out.push(t("tutor.exam.build.problemOptions", { row: label }));
        // The key is chosen by index, so it has to point at an option that
        // survived the empty-row filter.
        if (row.correct_index === null || !row.options[row.correct_index]?.trim())
          out.push(t("tutor.exam.build.problemKey", { row: label }));
      }
    });
    return out;
  };

  const submit = async () => {
    const found = validate();
    setProblems(found);
    setFailed(null);
    if (found.length) return;

    const questions: ExamDraftQuestion[] = rows.map((row, i) => {
      const base = { position: i, type: row.type, prompt: row.prompt.trim(), points: row.points };
      if (row.type !== "multiple_choice") return base;
      // Rebuild the option list without blanks, then re-point the key at its
      // new index - the answer itself travels with its text, not its slot.
      const kept = row.options
        .map((text, index) => ({ text: text.trim(), index }))
        .filter((o) => o.text !== "");
      const correct = kept.findIndex((o) => o.index === row.correct_index);
      return { ...base, options: kept.map((o) => o.text), correct_index: correct };
    });

    const draft: ExamDraft = {
      learner_id: Number(learnerId),
      title: title.trim(),
      instructions: instructions.trim() || null,
      duration_minutes: Number(duration),
      // datetime-local gives wall-clock in the tutor's timezone; toISOString()
      // converts it to the explicit UTC instant the server stores.
      due_at: new Date(dueAt).toISOString(),
      shuffle_questions: shuffle,
      questions,
    };

    setBusy(true);
    try {
      const created = await createTutorExam(draft);
      router.push(`/tutor/exams/${created.exam_id}`);
    } catch (e) {
      setFailed(e instanceof Error ? e.message : t("tutor.exam.build.fail"));
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

  return (
    <TutorPageShell>
      <div className={ui.pageStack}>
        <header className={ui.pageHeading}>
          <div>
            <p className={ui.kicker}>{t("tutor.exam.build.kicker")}</p>
            <h1>{t("tutor.exam.build.title")}</h1>
            <p>{t("tutor.exam.build.lede")}</p>
          </div>
          <Link className={ui.headerAction} href="/tutor/exams">
            {t("tutor.exam.build.backToList")} <ArrowRight size={14} aria-hidden />
          </Link>
        </header>

        <section className={ui.band} aria-labelledby="paper-h">
          <h2 id="paper-h" className={ui.bandLabel}>{t("tutor.exam.build.paperHeading")}</h2>
          <div className={ui.form}>
            <label>
              {t("tutor.exam.build.learner")}
              <select
                className={ui.select}
                value={learnerId}
                onChange={(e) => setLearnerId(e.target.value)}
                required
              >
                <option value="">
                  {learners === null ? t("tutor.common.loading") : t("tutor.exam.build.learnerPick")}
                </option>
                {(learners ?? []).map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name} · {l.level || t("common.notSet")}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {t("tutor.exam.build.titleField")}
              <input
                className={ui.input}
                value={title}
                maxLength={200}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t("tutor.exam.build.titlePlaceholder")}
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
        </section>

        <section className={ui.band} aria-labelledby="questions-h">
          <div className={ui.bandHead}>
            <h2 id="questions-h" className={ui.bandLabel}>{t("tutor.exam.build.questionsHeading")}</h2>
            <span className={ui.bandLabel}>
              {t("tutor.exam.build.totalPoints", { n: totalPoints })}
            </span>
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

        <section className={ui.band} aria-labelledby="publish-h">
          <h2 id="publish-h" className={ui.bandLabel}>{t("tutor.exam.build.publishHeading")}</h2>
          <p className={ui.lede}>{t("tutor.exam.build.publishNote")}</p>

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
            <button type="button" className={ui.btnCoral} onClick={submit} disabled={busy || learners?.length === 0}>
              {busy ? t("tutor.exam.build.publishing") : t("tutor.exam.build.publish")}
            </button>
            <Link className={ui.textLink} href="/tutor/exams">
              {t("tutor.exam.build.cancel")}
            </Link>
          </div>
          {learners?.length === 0 && (
            <p className={ui.rowNote}>{t("tutor.exam.build.noLearners")}</p>
          )}
        </section>
      </div>
    </TutorPageShell>
  );
}
