"use client";

import { CtaBand, Hero, PageShell, Section } from "@/components/marketing/Sections";
import { useLanguage } from "@/i18n/LanguageProvider";
import styles from "./marketing.module.css";

// The two documents share one layout: a hero, a dated column of numbered
// clauses, and a way to ask about them. Only the copy differs.
const CLAUSES = { terms: 7, privacy: 6 } as const;

export default function LegalContent({ variant }: { variant: "terms" | "privacy" }) {
  const { t } = useLanguage();
  const clauses = Array.from({ length: CLAUSES[variant] }, (_, index) => index + 1);
  const other = variant === "terms" ? "/privacy" : "/terms";

  return (
    <PageShell>
      <Hero
        kicker={t(`legal.${variant}.kicker`)}
        title={t(`legal.${variant}.title`)}
        lede={t(`legal.${variant}.lede`)}
      />

      <div className={styles.container}>
        <p className={styles.legalMeta}>{t("legal.updated")}</p>
      </div>

      <Section bare>
        <div className={styles.clauses}>
          {clauses.map((number) => (
            <section key={number} className={styles.clause}>
              <div className={styles.clauseNum}>{String(number).padStart(2, "0")}</div>
              <div>
                <h2 className={styles.clauseTitle}>{t(`legal.${variant}.s${number}.title`)}</h2>
                {/* A clause may hold two thoughts; the blank line between them
                    is a paragraph break, not decoration. */}
                {t(`legal.${variant}.s${number}.body`)
                  .split("\n")
                  .filter((paragraph) => paragraph.trim())
                  .map((paragraph) => (
                    <p key={paragraph.slice(0, 24)} className={styles.clauseBody}>
                      {paragraph}
                    </p>
                  ))}
              </div>
            </section>
          ))}
        </div>
      </Section>

      <CtaBand
        title={t(`legal.${variant}.cta.title`)}
        body={t(`legal.${variant}.cta.body`)}
        ctas={[
          { href: "/contact", label: t("footer.contact"), primary: true },
          { href: other, label: t(`legal.${variant}.cta.other`) },
        ]}
      />
    </PageShell>
  );
}
