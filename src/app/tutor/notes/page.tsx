"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, NotebookPen } from "lucide-react";
import TutorPageShell from "@/components/tutor/TutorPageShell";
import { getTutorNotes, TutorNoteRow } from "@/lib/tutor-data";
import ui from "@/components/portal/bands.module.css";

const fullDate = (iso: string) =>
  new Date(iso).toLocaleDateString([], { weekday: "short", month: "long", day: "numeric", year: "numeric" }) +
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

  const count = notes?.length ?? 0;

  return (
    <TutorPageShell>
      <div className={ui.pageStack}>
        <header className={ui.pageHeading}>
          <div>
            <p className={ui.kicker}>Lesson notes</p>
            <h1>The archive</h1>
            <p>
              Every lesson you have finished teaching, with the notes and feedback you recorded
              for the learner. Nothing here can be edited after the fact.
            </p>
          </div>
          <Link className={ui.headerAction} href="/tutor">
            Back to dashboard <ArrowRight size={14} aria-hidden />
          </Link>
        </header>

        <section className={ui.band} aria-labelledby="archive-h">
          <div className={ui.bandHead}>
            <h2 id="archive-h" className={ui.bandLabel}>
              Completed lessons
            </h2>
            <span className={ui.bandLabel}>
              {count} {count === 1 ? "entry" : "entries"}
            </span>
          </div>

          {error && (
            <p role="alert" className={ui.statusBad}>
              Could not load your notes: {error}
            </p>
          )}
          {!error && notes === null && <p className={ui.lede}>Loading your archive…</p>}

          {!error && notes?.length === 0 && (
            <div className={ui.bandStatement}>
              <p className={ui.bandLabel}>
                <NotebookPen size={13} aria-hidden /> Empty for now
              </p>
              <p>
                The archive begins after your first lesson. Notes you write when marking a session
                complete are kept here for both you and the learner.
              </p>
            </div>
          )}

          {!error &&
            notes?.map((n) => (
              <article key={n.id} className={ui.noteItem}>
                <p className={ui.bandLabel}>{fullDate(n.startsAt)}</p>
                <h3 className={ui.noteTitle}>{n.topic || n.title}</h3>
                <p className={ui.noteMeta}>
                  {n.learner}
                  {n.topic && n.topic !== n.title ? ` · ${n.title}` : ""}
                </p>
                <p className={ui.noteBody}>
                  {n.notes || "No feedback was written for this lesson."}
                </p>
              </article>
            ))}
        </section>
      </div>
    </TutorPageShell>
  );
}
