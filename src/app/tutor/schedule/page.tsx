"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import Calendar from "@/components/shared/Calendar";
import TutorPageShell from "@/components/tutor/TutorPageShell";
import { getTutorSchedule, TutorScheduleSession } from "@/lib/tutor-data";
import { useLanguage } from "@/i18n/LanguageProvider";
import ui from "@/components/portal/bands.module.css";

const localDay = (iso: string) => new Date(iso).toLocaleDateString("en-CA");
const dayLabel = (iso: string) =>
  new Date(iso).toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" });
const localTime = (iso: string) =>
  new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

export default function TutorSchedulePage() {
  const { t } = useLanguage();
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

  const count = sessions?.length ?? 0;

  return (
    <TutorPageShell>
      <div className={ui.pageStack}>
        <header className={ui.pageHeading}>
          <div>
            <p className={ui.kicker}>{t("tutor.schedule.kicker")}</p>
            <h1>{t("tutor.schedule.title")}</h1>
            <p>{t("tutor.schedule.lede")}</p>
          </div>
          <Link className={ui.headerAction} href="/tutor/settings">
            {t("tutor.schedule.availability")} <ArrowRight size={14} aria-hidden />
          </Link>
        </header>

        <div className={ui.split}>
          <div className={ui.mainPane}>
            <section className={ui.band} aria-labelledby="booked-h">
              <div className={ui.bandHead}>
                <h2 id="booked-h" className={ui.bandLabel}>
                  {t("tutor.schedule.bookedSessions")}
                </h2>
                <span className={ui.bandLabel}>
                  {t(count === 1 ? "tutor.schedule.sessionOne" : "tutor.schedule.sessionOther", { n: count })}
                </span>
              </div>

              {error && (
                <p role="alert" className={ui.statusBad}>
                  {t("tutor.schedule.loadError", { message: error })}
                </p>
              )}
              {!error && sessions === null && <p className={ui.lede}>{t("tutor.schedule.loading")}</p>}

              {!error && sessions?.length === 0 && (
                <div className={ui.bandStatement}>
                  <p className={ui.bandLabel}>{t("tutor.schedule.emptyTitle")}</p>
                  <p>{t("tutor.schedule.emptyBody")}</p>
                </div>
              )}

              {byDay.map(([day, items]) => (
                <div key={day} className={ui.dayGroup}>
                  <p className={ui.dayLabel}>{dayLabel(items[0].startsAt)}</p>
                  <ul className={ui.sessions}>
                    {items.map((s) => (
                      <li key={s.id}>
                        <span className={ui.when}>
                          <b>{localTime(s.startsAt)}</b>
                          <em>{t("tutor.schedule.minutes", { n: s.durationMinutes })}</em>
                        </span>
                        <span className={ui.what}>
                          {s.title}
                          <small>{s.learner}</small>
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </section>
          </div>

          <aside className={ui.sidePane}>
            <section className={ui.band} aria-label={t("tutor.schedule.bookedClasses")}>
              <Calendar
                title={t("tutor.schedule.bookedClasses")}
                events={(sessions ?? []).map((s) => ({ startsAt: s.startsAt }))}
              />
            </section>
          </aside>
        </div>
      </div>
    </TutorPageShell>
  );
}
