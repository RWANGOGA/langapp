"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Calendar from "@/components/shared/Calendar";
import TutorPageShell from "@/components/tutor/TutorPageShell";
import { getTutorSchedule, TutorScheduleSession } from "@/lib/tutor-data";
import styles from "@/components/tutor/tutor.module.css";

const localDay = (iso: string) => new Date(iso).toLocaleDateString("en-CA");
const dayLabel = (iso: string) =>
  new Date(iso).toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" });
const localTime = (iso: string) =>
  new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

export default function TutorSchedulePage() {
  const [sessions, setSessions] = useState<TutorScheduleSession[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getTutorSchedule(90)
      .then((d) => setSessions(d.sessions))
      .catch((e) => setError(e.message));
  }, []);

  // Group by the tutor's local calendar day; API order is already soonest-first.
  const byDay = useMemo(() => {
    const map = new Map<string, TutorScheduleSession[]>();
    for (const s of sessions ?? []) {
      const key = localDay(s.startsAt);
      (map.get(key) ?? map.set(key, []).get(key)!).push(s);
    }
    return [...map.entries()];
  }, [sessions]);

  return (
    <TutorPageShell>
      <div className={styles.tGrid}>
        <section className={styles.card} aria-labelledby="sched-cal-h">
          <Calendar title="Schedule" events={(sessions ?? []).map((s) => ({ startsAt: s.startsAt }))} />
        </section>
        <section className={styles.card} aria-labelledby="sched-list-h">
          <div className={styles.cardHead}>
            <h1 id="sched-list-h" className={styles.cardTitle}>Next 90 days</h1>
            <Link href="/tutor" className={styles.linkMore}>Back to dashboard</Link>
          </div>
          {error && <p className={styles.subTitle}>Could not load the schedule: {error}</p>}
          {!error && sessions === null && <p className={styles.subTitle}>Loading…</p>}
          {!error && sessions?.length === 0 && (
            <p className={styles.subTitle}>Nothing booked. Your future sessions will appear here.</p>
          )}
          {byDay.map(([day, items]) => (
            <div key={day}>
              <h2 className={styles.subTitle}>{dayLabel(items[0].startsAt)}</h2>
              <ul className={styles.upList}>
                {items.map((s) => (
                  <li key={s.id} className={styles.sessionRow}>
                    <span className={styles.level}>{localTime(s.startsAt)}</span>
                    <div className={styles.nextTitle}>
                      <strong>{s.title}</strong>
                      <small>{s.learner} · {s.durationMinutes} min</small>
                    </div>
                  </li>
                ))}
              </ul>
              <hr className={styles.rule} />
            </div>
          ))}
        </section>
      </div>
    </TutorPageShell>
  );
}
