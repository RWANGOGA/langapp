"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, NotebookPen } from "lucide-react";
import TutorPageShell from "@/components/tutor/TutorPageShell";
import { getTutorNotes, TutorNoteRow } from "@/lib/tutor-data";
import { useLanguage } from "@/i18n/LanguageProvider";
import ui from "@/components/portal/bands.module.css";

const fullDate = (iso: string) =>
  new Date(iso).toLocaleDateString([], { weekday: "short", month: "long", day: "numeric", year: "numeric" }) +
  " · " +
  new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

export default function TutorNotesPage() {
  const { t } = useLanguage();
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
            <p className={ui.kicker}>{t("tutor.notes.kicker")}</p>
            <h1>{t("tutor.notes.title")}</h1>
            <p>{t("tutor.notes.lede")}</p>
          </div>
          <Link className={ui.headerAction} href="/tutor">
            {t("tutor.common.backToDash")} <ArrowRight size={14} aria-hidden />
          </Link>
        </header>

        <section className={ui.band} aria-labelledby="archive-h">
          <div className={ui.bandHead}>
            <h2 id="archive-h" className={ui.bandLabel}>
              {t("tutor.notes.completedLessons")}
            </h2>
            <span className={ui.bandLabel}>
              {t(count === 1 ? "tutor.notes.entryOne" : "tutor.notes.entryOther", { n: count })}
            </span>
          </div>

          {error && (
            <p role="alert" className={ui.statusBad}>
              {t("tutor.notes.loadError", { message: error })}
            </p>
          )}
          {!error && notes === null && <p className={ui.lede}>{t("tutor.notes.loading")}</p>}

          {!error && notes?.length === 0 && (
            <div className={ui.bandStatement}>
              <p className={ui.bandLabel}>
                <NotebookPen size={13} aria-hidden /> {t("tutor.notes.emptyTitle")}
              </p>
              <p>{t("tutor.notes.emptyBody")}</p>
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
                  {n.notes || t("tutor.notes.noFeedback")}
                </p>
              </article>
            ))}
        </section>
      </div>
    </TutorPageShell>
  );
}
