"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { NotebookPen } from "lucide-react";
import TutorPageShell from "@/components/tutor/TutorPageShell";
import { getTutorNotes, TutorNoteRow } from "@/lib/tutor-data";
import styles from "@/components/tutor/tutor.module.css";

const fullDate = (iso: string) =>
  new Date(iso).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric", year: "numeric" }) +
  " · " +
  new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

export default function TutorNotesPage() {
  const [notes, setNotes] = useState<TutorNoteRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getTutorNotes()
      .then((d) => setNotes(d.notes))
      .catch((e) => setError(e.message));
  }, []);

  return (
    <TutorPageShell>
      <section className={styles.card} aria-labelledby="notes-h">
        <div className={styles.cardHead}>
          <h1 id="notes-h" className={styles.cardTitle}>
            <NotebookPen size={20} className={styles.tealIcon} aria-hidden /> Lesson Notes
          </h1>
          <Link href="/tutor" className={styles.linkMore}>Back to dashboard</Link>
        </div>
        {error && <p className={styles.subTitle}>Could not load your notes: {error}</p>}
        {!error && notes === null && <p className={styles.subTitle}>Loading…</p>}
        {!error && notes?.length === 0 && (
          <p className={styles.subTitle}>
            No completed lessons yet. Notes you write when marking a session done are archived here.
          </p>
        )}
        <ul className={styles.learnerList}>
          {(notes ?? []).map((n) => (
            <li key={n.id} className={styles.learnerItem}>
              <div className={styles.nextTitle}>
                <strong>{n.title}</strong>
                <small>{n.learner} · {fullDate(n.startsAt)}</small>
                <p>{n.notes || "No notes were recorded for this lesson."}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </TutorPageShell>
  );
}
