"use client";

import type { Testimonial } from "@/lib/testimonials-data";
import { CtaBand, Hero, PageShell, Section, Steps } from "@/components/marketing/Sections";
import { useLanguage } from "@/i18n/LanguageProvider";
import styles from "./marketing.module.css";

// The track holds the list three times over and the animation carries it by a
// third of its own height, so the wrap happens off-screen and nothing visible
// ever jumps into place.
const COPIES = [0, 1, 2];
// Roughly twelve seconds for one quote to travel past a point on the screen.
const SECONDS_PER_VOICE = 12;

/**
 * The wall of voices.
 *
 * It rises by itself - a visitor reads the fourth quote without touching
 * anything - and it stops under the pointer for anyone who wants to finish a
 * sentence. Hover is not the only way to hold it: focusing anything inside does
 * the same, and `prefers-reduced-motion` turns the movement off entirely and
 * lays the quotes out as a plain column.
 */
export default function TestimonialsContent({ testimonials }: { testimonials: Testimonial[] }) {
  const { t } = useLanguage();

  const kindLabel = (voice: Testimonial) =>
    voice.kind === "TUTOR"
      ? t("testimonials.kind.tutor")
      : voice.kind === "PILOT"
        ? t("testimonials.kind.pilot")
        : t("testimonials.kind.learner");

  // The track carries one copy's worth of height per cycle, so the seconds a
  // single quote spends in view is the duration divided by the number of voices.
  const duration = `${Math.max(
    Math.round(testimonials.length * SECONDS_PER_VOICE),
    30,
  )}s`;

  return (
    <PageShell>
      <Hero
        kicker={t("testimonials.hero.kicker")}
        title={t("testimonials.hero.title")}
        lede={t("testimonials.hero.lede")}
      />

      <Section
        kicker={t("testimonials.wall.kicker")}
        title={t("testimonials.wall.title")}
        lede={t("testimonials.wall.lede")}
      >
        {testimonials.length === 0 ? (
          <p className={styles.wallNote}>
            <strong>{t("testimonials.empty.title")}</strong> {t("testimonials.empty.body")}
          </p>
        ) : (
          <div className={styles.wall} role="region" aria-label={t("testimonials.wall.aria")}>
            <div className={styles.wallTrack} style={{ animationDuration: duration }}>
              {COPIES.map((copy) => (
                // Only the first pass is announced; the repeats are the loop's
                // seam and would read the same quotes two more times. With
                // reduced motion the seam is switched off entirely, so the extra
                // passes are hidden rather than left stacked under the first.
                <div
                  key={copy}
                  className={copy > 0 ? styles.wallRepeat : undefined}
                  aria-hidden={copy > 0 ? "true" : undefined}
                >
                  {testimonials.map((voice) => (
                    <figure key={`${copy}-${voice.id}`} className={styles.voice}>
                      <blockquote className={styles.voiceQuote}>{voice.quote}</blockquote>
                      <figcaption className={styles.voiceBy}>
                        <span className={styles.voiceName}>{voice.name}</span>
                        <span className={styles.voiceKind}>{kindLabel(voice)}</span>
                        {voice.region && <span className={styles.voiceRegion}>{voice.region}</span>}
                        {voice.kind === "PILOT" && (
                          <span className={styles.voicePilot}>{t("testimonials.pilot.badge")}</span>
                        )}
                      </figcaption>
                    </figure>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}

        <p className={styles.wallNote}>{t("testimonials.wall.pause")}</p>
        <p className={styles.wallNote}>
          <strong>{t("testimonials.pilot.noteTitle")}</strong> {t("testimonials.pilot.noteBody")}
        </p>
      </Section>

      <Section kicker={t("testimonials.how.kicker")} title={t("testimonials.how.title")}>
        <Steps
          items={[
            { num: "01", title: t("testimonials.how.1.title"), body: t("testimonials.how.1.body") },
            { num: "02", title: t("testimonials.how.2.title"), body: t("testimonials.how.2.body") },
            { num: "03", title: t("testimonials.how.3.title"), body: t("testimonials.how.3.body") },
            { num: "04", title: t("testimonials.how.4.title"), body: t("testimonials.how.4.body") },
          ]}
        />
      </Section>

      <CtaBand
        title={t("testimonials.cta.title")}
        body={t("testimonials.cta.body")}
        ctas={[
          { href: "/dashboard", label: t("testimonials.cta.learner"), primary: true },
          { href: "/tutor", label: t("testimonials.cta.tutor") },
        ]}
      />
    </PageShell>
  );
}
