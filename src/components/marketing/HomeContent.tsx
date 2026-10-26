"use client";

import Link from "next/link";
import type { Testimonial } from "@/lib/testimonials-data";
import {
  CtaBand,
  FeatureRows,
  Hero,
  PageShell,
  Section,
} from "@/components/marketing/Sections";
import { useLanguage } from "@/i18n/LanguageProvider";
import styles from "./marketing.module.css";

const REGIONS = ["1", "2", "3", "4", "5", "6"] as const;

/**
 * Home page body as a client component so it can read the active language.
 * The server page wrapper keeps `export const metadata`; this renders the copy.
 *
 * The "who we teach" band is the page's spine: the school exists to teach
 * English to people whose first language is not English, so that is said plainly
 * and then followed by the regions it is actually carried out in. The voice
 * strip underneath it is real data from the testimonial wall, pilot notes
 * included - never written-in placeholders.
 */
export default function HomeContent({ testimonials = [] }: { testimonials?: Testimonial[] }) {
  const { t } = useLanguage();

  const kindLabel = (voice: Testimonial) =>
    voice.kind === "TUTOR"
      ? t("testimonials.kind.tutor")
      : voice.kind === "PILOT"
        ? t("testimonials.kind.pilot")
        : t("testimonials.kind.learner");

  const voices = testimonials.slice(0, 3);

  return (
    <PageShell>
      <Hero
        kicker={t("home.hero.kicker")}
        title={t("home.hero.title")}
        lede={t("home.hero.lede")}
        ctas={[
          { href: "/pricing", label: t("home.hero.ctaPrograms"), primary: true },
          { href: "/tutors", label: t("home.hero.ctaTutors") },
        ]}
      />

      <Section kicker={t("home.reach.kicker")} title={t("home.reach.title")}>
        <div className={styles.reachGrid}>
          <div>
            <p className={styles.reachLede}>
              <strong>{t("home.reach.pull")}</strong>
            </p>
            <p className={styles.reachLede}>{t("home.reach.p1")}</p>
            <p className={styles.reachLede}>{t("home.reach.p2")}</p>
          </div>
          <ul className={styles.regionList}>
            {REGIONS.map((n) => (
              <li key={n} className={styles.regionItem}>
                <span className={styles.regionName}>{t(`home.reach.${n}.name`)}</span>
                <span className={styles.regionNote}>{t(`home.reach.${n}.note`)}</span>
              </li>
            ))}
          </ul>
        </div>
      </Section>

      <Section kicker={t("home.standard.kicker")} title={t("home.standard.title")}>
        <FeatureRows
          items={[
            { label: "01", title: t("home.feature.1.title"), body: t("home.feature.1.body") },
            { label: "02", title: t("home.feature.2.title"), body: t("home.feature.2.body") },
            { label: "03", title: t("home.feature.3.title"), body: t("home.feature.3.body") },
          ]}
        />
      </Section>

      <Section kicker={t("home.voices.kicker")} title={t("home.voices.title")}>
        {voices.length === 0 ? (
          <p className={styles.wallNote}>{t("home.voices.empty")}</p>
        ) : (
          <>
            <div className={styles.voiceStrip}>
              {voices.map((voice) => (
                <div key={voice.id} className={styles.voiceStripItem}>
                  <p className={styles.voiceStripText}>{"“"}{voice.quote}{"”"}</p>
                  <p className={styles.voiceStripBy}>
                    <strong>{voice.name}</strong> · {kindLabel(voice)}
                    {/* Marked here exactly as it is on the wall: a pilot note must
                        not read like a customer's review even in a teaser. */}
                    {voice.isPilotNote && (
                      <span className={styles.voicePilot}>{t("testimonials.pilot.badge")}</span>
                    )}
                  </p>
                </div>
              ))}
            </div>
            <p className={styles.wallNote}>
              <Link href="/testimonials" className={styles.asideLink}>
                {t("home.voices.more")}
              </Link>
            </p>
          </>
        )}
      </Section>

      <CtaBand
        title={t("home.cta.title")}
        body={t("home.cta.body")}
        ctas={[
          { href: "/auth/register", label: t("home.cta.learn"), primary: true },
          { href: "/tutor/requirements", label: t("home.cta.teach") },
        ]}
      />
    </PageShell>
  );
}
