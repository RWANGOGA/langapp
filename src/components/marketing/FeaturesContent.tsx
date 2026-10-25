"use client";

import { CtaBand, FeatureRows, Faq, Hero, PageShell, ProofBand, Section, Steps } from "@/components/marketing/Sections";
import { useLanguage } from "@/i18n/LanguageProvider";

export default function FeaturesContent() {
  const { t } = useLanguage();

  return (
    <PageShell>
      <Hero
        kicker={t("features.hero.kicker")}
        title={t("features.hero.title")}
        lede={t("features.hero.lede")}
        ctas={[
          { href: "/pricing", label: t("home.hero.ctaPrograms"), primary: true },
          { href: "/tutors", label: t("home.hero.ctaTutors") },
        ]}
      />

      <Section kicker={t("features.steps.kicker")} title={t("features.steps.title")}>
        <Steps
          items={[
            { num: "01", title: t("features.step.1.title"), body: t("features.step.1.body") },
            { num: "02", title: t("features.step.2.title"), body: t("features.step.2.body") },
            { num: "03", title: t("features.step.3.title"), body: t("features.step.3.body") },
          ]}
        />
      </Section>

      <Section kicker={t("features.built.kicker")} title={t("features.built.title")}>
        <FeatureRows
          items={[
            { label: t("features.feat.verification.label"), title: t("features.feat.verification.title"), body: t("features.feat.verification.body") },
            { label: t("features.feat.onetoone.label"), title: t("features.feat.onetoone.title"), body: t("features.feat.onetoone.body") },
            { label: t("features.feat.clock.label"), title: t("features.feat.clock.title"), body: t("features.feat.clock.body") },
            { label: t("features.feat.feedback.label"), title: t("features.feat.feedback.title"), body: t("features.feat.feedback.body") },
            { label: t("features.feat.rules.label"), title: t("features.feat.rules.title"), body: t("features.feat.rules.body") },
            { label: t("features.feat.access.label"), title: t("features.feat.access.title"), body: t("features.feat.access.body") },
          ]}
        />
      </Section>

      <ProofBand
        stats={[
          { value: "4.9", label: t("features.proof.rating") },
          { value: "2,000+", label: t("features.proof.reviews") },
          { value: "100%", label: t("features.proof.certified") },
          { value: "EFEC", label: t("features.proof.accredited") },
        ]}
      />

      <Section kicker={t("features.faq.kicker")} title={t("features.faq.title")}>
        <Faq
          items={[
            { q: t("features.faq.1.q"), a: t("features.faq.1.a") },
            { q: t("features.faq.2.q"), a: t("features.faq.2.a") },
            { q: t("features.faq.3.q"), a: t("features.faq.3.a") },
            { q: t("features.faq.4.q"), a: t("features.faq.4.a") },
          ]}
        />
      </Section>

      <CtaBand
        title={t("features.cta.title")}
        body={t("features.cta.body")}
        ctas={[
          { href: "/pricing", label: t("features.cta.choose"), primary: true },
          { href: "/auth/register", label: t("features.cta.account") },
        ]}
      />
    </PageShell>
  );
}
