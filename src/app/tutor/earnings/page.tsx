"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Banknote } from "lucide-react";
import TutorPageShell from "@/components/tutor/TutorPageShell";
import { getTutorEarnings, type TutorEarnings } from "@/lib/tutor-data";
import { formatMinorExact, utcInstant } from "@/lib/utils";
import { useLanguage } from "@/i18n/LanguageProvider";
import ui from "@/components/portal/bands.module.css";

/** A lesson date, read as the UTC instant it was stored as. */
const heldOn = (iso: string) =>
  new Date(utcInstant(iso)).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

/** A month key ("2026-10") as a human month, in the reader's language. */
const monthName = (key: string, locale: string) => {
  const [year, month] = key.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString(locale, {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
};

/**
 * The tutor's side of the money: what each completed lesson was worth at the
 * school's hourly rate. Nothing here is a payout record - the school settles
 * with the tutor directly, so the page reports what is owed, not what was sent.
 */
export default function TutorEarningsPage() {
  const { t, locale } = useLanguage();
  const [data, setData] = useState<TutorEarnings | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getTutorEarnings()
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);

  const money = (cents: number) => formatMinorExact(cents, "USD");
  const length = (minutes: number) =>
    minutes >= 60
      ? t("tutor.pay.lengthHm", { h: Math.floor(minutes / 60), m: minutes % 60 })
      : t("tutor.pay.lengthM", { m: minutes });
  const lessonsLabel = (n: number) =>
    t(n === 1 ? "tutor.pay.lessonOne" : "tutor.pay.lessonOther", { n });

  return (
    <TutorPageShell>
      <div className={ui.pageStack}>
        <header className={ui.pageHeading}>
          <div>
            <p className={ui.kicker}>{t("tutor.pay.kicker")}</p>
            <h1>{t("tutor.pay.title")}</h1>
            <p>{t("tutor.pay.lede")}</p>
          </div>
          <Link className={ui.headerAction} href="/tutor">
            {t("tutor.common.backToDash")} <ArrowRight size={14} aria-hidden />
          </Link>
        </header>

        {error && (
          <p role="alert" className={ui.statusBad}>
            {t("tutor.pay.loadError", { message: error })}
          </p>
        )}
        {!error && !data && <p className={ui.lede}>{t("tutor.pay.loading")}</p>}

        {data && (
          <>
            <section className={ui.band} aria-labelledby="statement-h">
              <div className={ui.bandHead}>
                <h2 id="statement-h" className={ui.bandLabel}>
                  {t("tutor.pay.statement")}
                </h2>
                <span className={ui.bandLabel}>{lessonsLabel(data.totals.all_time_lessons)}</span>
              </div>

              <ul className={ui.stats}>
                <li>
                  <span>
                    <small>{t("tutor.pay.thisMonth")}</small>
                    <b>{money(data.totals.this_month_cents)}</b>
                  </span>
                </li>
                <li>
                  <span>
                    <small>{t("tutor.pay.lastMonth")}</small>
                    <b>{money(data.totals.last_month_cents)}</b>
                  </span>
                </li>
                <li>
                  <span>
                    <small>{t("tutor.pay.allTime")}</small>
                    <b>{money(data.totals.all_time_cents)}</b>
                  </span>
                </li>
              </ul>

              <h3 className={ui.subHead}>{t("tutor.pay.rateTitle")}</h3>
              <dl className={ui.rows}>
                <div>
                  <dt>{t("tutor.pay.rate")}</dt>
                  <dd>
                    {t("tutor.pay.rateValue", {
                      amount: money(data.rate.amount_cents),
                      minutes: data.rate.per_minutes,
                    })}
                  </dd>
                </div>
                <div>
                  <dt>{t("tutor.pay.proRated")}</dt>
                  <dd>{t("tutor.pay.proRatedBody")}</dd>
                </div>
                <div>
                  <dt>{t("tutor.pay.taught")}</dt>
                  <dd>{t("tutor.pay.taughtBody", { length: length(data.totals.all_time_minutes) })}</dd>
                </div>
                <div>
                  <dt>{t("tutor.pay.settled")}</dt>
                  <dd>{t("tutor.pay.settledBody")}</dd>
                </div>
              </dl>
            </section>

            <section className={ui.band} aria-labelledby="months-h">
              <div className={ui.bandHead}>
                <h2 id="months-h" className={ui.bandLabel}>
                  {t("tutor.pay.monthsTitle")}
                </h2>
              </div>

              {data.months.length === 0 ? (
                <div className={ui.bandStatement}>
                  <p className={ui.bandLabel}>
                    <Banknote size={13} aria-hidden /> {t("tutor.pay.emptyTitle")}
                  </p>
                  <p>{t("tutor.pay.emptyBody")}</p>
                </div>
              ) : (
                <dl className={ui.rows}>
                  {data.months.map((row) => (
                    <div key={row.month}>
                      <dt>{monthName(row.month, locale)}</dt>
                      <dd>
                        {money(row.amount_cents)}
                        <small className={ui.rowNoteUnder}>
                          {lessonsLabel(row.lessons)} · {length(row.minutes)}
                        </small>
                      </dd>
                    </div>
                  ))}
                </dl>
              )}
            </section>

            {data.lessons.length > 0 && (
              <section className={ui.band} aria-labelledby="lessons-h">
                <div className={ui.bandHead}>
                  <h2 id="lessons-h" className={ui.bandLabel}>
                    {t("tutor.pay.lessonsTitle")}
                  </h2>
                  <span className={ui.bandLabel}>
                    {t("tutor.pay.lessonsShown", { n: data.lessons.length })}
                  </span>
                </div>

                <ul className={ui.sessions}>
                  {data.lessons.map((lesson) => (
                    <li key={lesson.id}>
                      <span className={ui.when}>
                        <b>{money(lesson.amount_cents)}</b>
                        <em>{heldOn(lesson.held_at)}</em>
                      </span>
                      <span className={ui.what}>
                        {lesson.learner}
                        <small>
                          {lesson.topic} · {length(lesson.minutes)}
                        </small>
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </>
        )}
      </div>
    </TutorPageShell>
  );
}
