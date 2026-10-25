"use client";

import { CtaBand, FeatureRows, Hero, PageShell, Section } from "@/components/marketing/Sections";
import { useLanguage } from "@/i18n/LanguageProvider";

/**
 * Home page body as a client component so it can read the active language.
 * The server page wrapper keeps `export const metadata`; this renders the copy.
 */
export default function HomeContent() {
  const { t } = useLanguage();

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

      <Section kicker={t("home.standard.kicker")} title={t("home.standard.title")}>
        <FeatureRows
          items={[
            { label: "01", title: t("home.feature.1.title"), body: t("home.feature.1.body") },
            { label: "02", title: t("home.feature.2.title"), body: t("home.feature.2.body") },
            { label: "03", title: t("home.feature.3.title"), body: t("home.feature.3.body") },
          ]}
        />
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
