"use client";

import { CtaBand, Hero, PageShell, Section, Steps } from "@/components/marketing/Sections";
import { useLanguage } from "@/i18n/LanguageProvider";

export default function ResourcesContent() {
  const { t } = useLanguage();

  return (
    <PageShell>
      <Hero
        kicker={t("resources.hero.kicker")}
        title={t("resources.hero.title")}
        lede={t("resources.hero.lede")}
        ctas={[
          { href: "/pricing", label: t("resources.hero.ctaTutor"), primary: true },
          { href: "/tutors", label: t("resources.hero.ctaBrowse") },
        ]}
      />

      <Section bare>
        <Steps
          items={[
            { num: "01", title: t("resources.step.1.title"), body: t("resources.step.1.body") },
            { num: "02", title: t("resources.step.2.title"), body: t("resources.step.2.body") },
            { num: "03", title: t("resources.step.3.title"), body: t("resources.step.3.body") },
          ]}
        />
      </Section>

      <Section
        kicker={t("resources.habit4.kicker")}
        title={t("resources.habit4.title")}
        lede={t("resources.habit4.lede")}
      />

      <CtaBand
        title={t("resources.cta.title")}
        body={t("resources.cta.body")}
        ctas={[
          { href: "/pricing", label: t("features.cta.choose"), primary: true },
          { href: "/features", label: t("resources.cta.how") },
        ]}
      />
    </PageShell>
  );
}
