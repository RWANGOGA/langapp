"use client";

import { useCallback, useEffect, useState } from "react";
import { Search } from "lucide-react";
import {
  CLASS_STATUS_LABEL,
  getAdminClasses,
  scheduleClass,
  type AdminClassList,
  type AdminClassRow,
  type ClassStatusValue,
  type StudentSummary,
} from "@/lib/admin-data";
import ui from "@/components/portal/bands.module.css";
import styles from "./classes.module.css";

const FILTERS: { key: ClassStatusValue | "all"; label: string }[] = [
  { key: "all", label: "All lessons" },
  { key: "scheduled", label: "Scheduled" },
  { key: "completed", label: "Completed" },
  { key: "cancelled", label: "Cancelled" },
  { key: "no_show", label: "No-shows" },
];

const statusClass = (status: ClassStatusValue) =>
  status === "completed"
    ? `${ui.statusPill} ${ui.statusOk}`
    : status === "scheduled"
      ? ui.statusPill
      : `${ui.statusPill} ${ui.statusBad}`;

const localTime = (iso: string) =>
  new Date(iso).toLocaleString(undefined, {
    weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
  });

interface Props {
  students: StudentSummary[];
  /** The overview KPIs shift when a lesson is booked; the parent refetches. */
  onReload: () => void;
}

export default function ClassMonitor({ students, onReload }: Props) {
  const [filter, setFilter] = useState<ClassStatusValue | "all">("all");
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [data, setData] = useState<AdminClassList | null>(null);
  const [error, setError] = useState<string | null>(null);

  // A search term settles 400ms after typing stops before it hits the API.
  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(search.trim()), 400);
    return () => window.clearTimeout(t);
  }, [search]);

  const load = useCallback(() => {
    getAdminClasses({
      status: filter === "all" ? undefined : filter,
      search: debounced || undefined,
      page_size: 50,
    })
      .then((result) => { setData(result); setError(null); })
      .catch((err) => setError(err instanceof Error ? err.message : "The lesson book could not be loaded."));
  }, [filter, debounced]);

  useEffect(() => { load(); }, [load]);

  /* — Scheduling: the step that turns an assignment into teaching — */
  const placed = students.filter((student) => student.tutor_name);
  const [form, setForm] = useState({ learner_id: "", title: "", when: "", duration: "60" });
  const [submitting, setSubmitting] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.learner_id || !form.title.trim() || !form.when) return;
    setSubmitting(true);
    setError(null);
    setFlash(null);
    try {
      // datetime-local carries no zone; Date reads it as the admin's local
      // time and the ISO string hands the backend an explicit UTC instant.
      const result = await scheduleClass({
        learner_id: Number(form.learner_id),
        title: form.title.trim(),
        scheduled_at: new Date(form.when).toISOString(),
        duration_minutes: Number(form.duration) || 60,
      });
      setFlash(`${result.title} booked with ${result.tutor_name} for ${localTime(result.scheduled_at)}.`);
      setForm({ learner_id: "", title: "", when: "", duration: "60" });
      load();
      onReload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "The lesson could not be booked.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <section className={ui.band} aria-labelledby="lesson-book-h">
        <div className={ui.bandHead}>
          <h2 id="lesson-book-h" className={ui.bandLabel}>The lesson book</h2>
          <span className={ui.bandLabel}>
            {data ? `${data.total} lesson${data.total === 1 ? "" : "s"}` : "Loading…"}
          </span>
        </div>

        <div className={ui.rosterTools}>
          <div className={styles.filters} role="group" aria-label="Filter lessons by status">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                type="button"
                className={`${styles.filter} ${filter === f.key ? styles.filterOn : ""}`}
                onClick={() => setFilter(f.key)}
              >
                {f.label}
              </button>
            ))}
          </div>
          <label className={ui.search}>
            <Search size={14} aria-hidden />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search learner, tutor or lesson"
              aria-label="Search lessons"
            />
          </label>
        </div>

        {error && <p role="alert" className={styles.error}>{error}</p>}
        {flash && <p role="status" className={styles.flash}>{flash}</p>}

        {!data && !error ? (
          <p className={ui.lede}>Loading the lesson book…</p>
        ) : data && data.classes.length === 0 ? (
          <div className={ui.bandStatement}>
            <p className={ui.bandLabel}>Nothing here</p>
            <p>
              {debounced || filter !== "all"
                ? "No lesson matches this filter."
                : "No lesson has been scheduled yet. Book the first one below."}
            </p>
          </div>
        ) : (
          <ul className={ui.sessions}>
            {data?.classes.map((cls: AdminClassRow) => (
              <li key={cls.id}>
                <span className={ui.when}>
                  <b>{new Date(cls.scheduled_at).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}</b>
                  <em>{new Date(cls.scheduled_at).toLocaleDateString(undefined, { day: "numeric", month: "short" })}</em>
                </span>
                <span className={ui.what}>
                  {cls.title}
                  <small>{cls.learner_name} · {cls.tutor_name} · {cls.duration_minutes} min</small>
                  {(cls.zoom_url || cls.meet_url) && (
                    <small>
                      <a
                        className={ui.textLink}
                        href={(cls.zoom_url ?? cls.meet_url) as string}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {cls.zoom_url ? "Open Zoom link" : "Open Google Meet"}
                      </a>
                    </small>
                  )}
                </span>
                <span className={statusClass(cls.status)}>{CLASS_STATUS_LABEL[cls.status]}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={ui.band} aria-labelledby="schedule-lesson-h">
        <div className={ui.bandHead}>
          <h2 id="schedule-lesson-h" className={ui.bandLabel}>Book the next lesson</h2>
          <span className={ui.bandLabel}>{placed.length} placed learner{placed.length === 1 ? "" : "s"}</span>
        </div>

        {placed.length === 0 ? (
          <p className={ui.rowNote}>
            Only a learner who already has a tutor can be scheduled. Assign one on
            the Learners page first.
          </p>
        ) : (
          <form className={styles.scheduleForm} onSubmit={submit}>
            <label>
              Learner
              <select
                className={ui.select}
                required
                value={form.learner_id}
                onChange={(e) => setForm({ ...form, learner_id: e.target.value })}
              >
                <option value="">Choose a placed learner…</option>
                {placed.map((student) => (
                  <option key={student.id} value={student.id}>
                    {student.name} · {student.tutor_name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Lesson title
              <input
                className={ui.input}
                required
                placeholder="Unit 9 - Conversation Practice"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </label>
            <label>
              Starts
              <input
                className={ui.input}
                type="datetime-local"
                required
                value={form.when}
                onChange={(e) => setForm({ ...form, when: e.target.value })}
              />
            </label>
            <label>
              Minutes
              <input
                className={ui.input}
                type="number"
                min={15}
                step={5}
                value={form.duration}
                onChange={(e) => setForm({ ...form, duration: e.target.value })}
              />
            </label>
            <div className={styles.scheduleAction}>
              <button type="submit" className={ui.btnCoral} disabled={submitting}>
                {submitting ? "Booking…" : "Schedule lesson"}
              </button>
            </div>
          </form>
        )}
      </section>
    </>
  );
}
