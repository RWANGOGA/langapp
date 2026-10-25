"use client";

import { useCallback, useEffect, useState } from "react";
import { Search } from "lucide-react";
import {
  getAdminClasses,
  scheduleClass,
  type AdminClassList,
  type AdminClassRow,
  type ClassStatusValue,
  type StudentSummary,
} from "@/lib/admin-data";
import { useLanguage } from "@/i18n/LanguageProvider";
import ui from "@/components/portal/bands.module.css";
import styles from "./classes.module.css";

const FILTERS: { key: ClassStatusValue | "all"; labelKey: string }[] = [
  { key: "all", labelKey: "admin.class.filterAll" },
  { key: "scheduled", labelKey: "admin.class.filterScheduled" },
  { key: "completed", labelKey: "admin.class.filterCompleted" },
  { key: "cancelled", labelKey: "admin.class.filterCancelled" },
  { key: "no_show", labelKey: "admin.class.filterNoShow" },
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
  const { t } = useLanguage();
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
      .catch((err) => setError(err instanceof Error ? err.message : t("admin.class.loadError")));
  }, [filter, debounced, t]);

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
      setFlash(t("admin.class.booked", { title: result.title, tutor: result.tutor_name, time: localTime(result.scheduled_at) }));
      setForm({ learner_id: "", title: "", when: "", duration: "60" });
      load();
      onReload();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("admin.class.bookError"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <section className={ui.band} aria-labelledby="lesson-book-h">
        <div className={ui.bandHead}>
          <h2 id="lesson-book-h" className={ui.bandLabel}>{t("admin.class.title")}</h2>
          <span className={ui.bandLabel}>
            {data ? t(data.total === 1 ? "admin.class.countOne" : "admin.class.countOther", { n: data.total }) : t("admin.class.loading")}
          </span>
        </div>

        <div className={ui.rosterTools}>
          <div className={styles.filters} role="group" aria-label={t("admin.class.filterAria")}>
            {FILTERS.map((f) => (
              <button
                key={f.key}
                type="button"
                className={`${styles.filter} ${filter === f.key ? styles.filterOn : ""}`}
                onClick={() => setFilter(f.key)}
              >
                {t(f.labelKey)}
              </button>
            ))}
          </div>
          <label className={ui.search}>
            <Search size={14} aria-hidden />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("admin.class.searchPlaceholder")}
              aria-label={t("admin.class.searchAria")}
            />
          </label>
        </div>

        {error && <p role="alert" className={styles.error}>{error}</p>}
        {flash && <p role="status" className={styles.flash}>{flash}</p>}

        {!data && !error ? (
          <p className={ui.lede}>{t("admin.class.loadingBody")}</p>
        ) : data && data.classes.length === 0 ? (
          <div className={ui.bandStatement}>
            <p className={ui.bandLabel}>{t("admin.class.emptyTitle")}</p>
            <p>
              {debounced || filter !== "all"
                ? t("admin.class.noMatch")
                : t("admin.class.noneScheduled")}
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
                  <small>{cls.learner_name} · {cls.tutor_name} · {t("admin.class.durationMin", { n: cls.duration_minutes })}</small>
                  {(cls.zoom_url || cls.meet_url) && (
                    <small>
                      <a
                        className={ui.textLink}
                        href={(cls.zoom_url ?? cls.meet_url) as string}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {cls.zoom_url ? t("admin.class.openZoom") : t("admin.class.openMeet")}
                      </a>
                    </small>
                  )}
                </span>
                <span className={statusClass(cls.status)}>{t(`admin.classstatus.${cls.status}`)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={ui.band} aria-labelledby="schedule-lesson-h">
        <div className={ui.bandHead}>
          <h2 id="schedule-lesson-h" className={ui.bandLabel}>{t("admin.class.bookTitle")}</h2>
          <span className={ui.bandLabel}>
            {t(placed.length === 1 ? "admin.class.placedOne" : "admin.class.placedOther", { n: placed.length })}
          </span>
        </div>

        {placed.length === 0 ? (
          <p className={ui.rowNote}>
            {t("admin.class.needsAssigned")}
          </p>
        ) : (
          <form className={styles.scheduleForm} onSubmit={submit}>
            <label>
              {t("admin.class.learner")}
              <select
                className={ui.select}
                required
                value={form.learner_id}
                onChange={(e) => setForm({ ...form, learner_id: e.target.value })}
              >
                <option value="">{t("admin.class.chooseLearner")}</option>
                {placed.map((student) => (
                  <option key={student.id} value={student.id}>
                    {student.name} · {student.tutor_name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {t("admin.class.lessonTitle")}
              <input
                className={ui.input}
                required
                placeholder={t("admin.class.titlePlaceholder")}
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </label>
            <label>
              {t("admin.class.starts")}
              <input
                className={ui.input}
                type="datetime-local"
                required
                value={form.when}
                onChange={(e) => setForm({ ...form, when: e.target.value })}
              />
            </label>
            <label>
              {t("admin.class.minutesLabel")}
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
                {submitting ? t("admin.class.booking") : t("admin.class.schedule")}
              </button>
            </div>
          </form>
        )}
      </section>
    </>
  );
}
