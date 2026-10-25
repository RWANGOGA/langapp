"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Users } from "lucide-react";
import TutorPageShell from "@/components/tutor/TutorPageShell";
import { getTutorLearners, TutorLearnerRow } from "@/lib/tutor-data";
import { useLanguage } from "@/i18n/LanguageProvider";
import ui from "@/components/portal/bands.module.css";

const initials = (n: string) => n.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

export default function TutorLearnersPage() {
  const { t } = useLanguage();
  const [learners, setLearners] = useState<TutorLearnerRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const localDate = (iso: string | null) =>
    iso ? new Date(iso).toLocaleDateString([], { month: "short", day: "numeric" }) : t("tutor.learners.noLessons");
  const localDateTime = (iso: string | null) =>
    iso
      ? new Date(iso).toLocaleDateString([], { month: "short", day: "numeric" }) +
        " · " +
        new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      : t("tutor.learners.nothingBooked");

  useEffect(() => {
    getTutorLearners()
      .then((d) => setLearners(d.learners))
      .catch((e) => setError(e.message));
  }, []);

  const count = learners?.length ?? 0;

  return (
    <TutorPageShell>
      <div className={ui.pageStack}>
        <header className={ui.pageHeading}>
          <div>
            <p className={ui.kicker}>{t("tutor.learners.kicker")}</p>
            <h1>
              {count === 0
                ? t("tutor.learners.titleZero")
                : t(count === 1 ? "tutor.learners.titleOne" : "tutor.learners.titleOther", { n: count })}
            </h1>
            <p>{t("tutor.learners.lede")}</p>
          </div>
          <Link className={ui.headerAction} href="/tutor/schedule">
            {t("tutor.common.openSchedule")} <ArrowRight size={14} aria-hidden />
          </Link>
        </header>

        {error && (
          <p role="alert" className={ui.statusBad}>
            {t("tutor.learners.loadError", { message: error })}
          </p>
        )}

        {!error && learners === null && <p className={ui.lede}>{t("tutor.learners.loading")}</p>}

        {!error && learners?.length === 0 && (
          <section className={ui.band} aria-label={t("tutor.learners.emptyAria")}>
            <div className={ui.bandStatement}>
              <p className={ui.bandLabel}>
                <Users size={13} aria-hidden /> {t("tutor.learners.emptyTitle")}
              </p>
              <p>{t("tutor.learners.emptyBody")}</p>
              <p>
                <Link className={ui.textLink} href="/tutor/settings">
                  {t("tutor.learners.setAvailability")} <ArrowRight size={13} aria-hidden />
                </Link>
              </p>
            </div>
          </section>
        )}

        {count > 0 && (
          <section className={ui.band} aria-labelledby="roster-h">
            <div className={ui.bandHead}>
              <h2 id="roster-h" className={ui.bandLabel}>
                {t("tutor.learners.roster")}
              </h2>
              <span className={ui.bandLabel}>
                {t("tutor.learners.assignedN", { n: count })}
              </span>
            </div>
            <ul className={ui.sessions}>
              {learners!.map((l) => (
                <li key={l.id}>
                  <span className={ui.avatarSquare} aria-hidden>
                    {initials(l.name)}
                  </span>
                  <span className={ui.what}>
                    {l.name}
                    <small>
                      {l.nativeLanguage ? `${t("tutor.learners.speaker", { language: l.nativeLanguage })} · ` : ""}
                      {t("tutor.learners.completedUpcoming", { completed: l.completed, upcoming: l.upcoming })}
                    </small>
                    <small>
                      {t("tutor.learners.nextLesson", { when: localDateTime(l.nextSessionAt) })} · {t("tutor.learners.lastLesson", { when: localDate(l.lastCompletedAt) })}
                    </small>
                  </span>
                  <span className={ui.statusPill}>{l.level}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </TutorPageShell>
  );
}

