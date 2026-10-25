"use client";

import Link from "next/link";
import { Check } from "lucide-react";
import { Faq, Hero, PageShell, Section, CtaBand } from "@/components/marketing/Sections";
import type { Plan } from "@/lib/packages-data";
import { useLanguage } from "@/i18n/LanguageProvider";
import styles from "@/components/marketing/marketing.module.css";

const usd = (n: number) => `$${n.toLocaleString("en-US")}`;

/**
 * Pricing UI chrome is translated; the plans themselves (name, feature labels,
 * prices) come from the backend and are passed in as serializable props.
 */
export default function PricingContent({ plans }: { plans: Plan[] }) {
  const { t } = useLanguage();

  return (
    <PageShell>
      <Hero
        kicker={t("pricing.hero.kicker")}
        title={t("pricing.hero.title")}
        lede={t("pricing.hero.lede")}
        ctas={[{ href: "#plans", label: t("pricing.hero.cta"), primary: true }]}
      />

      <Section bare>
        <div id="plans" className={styles.plans}>
          {plans.map((plan) => (
            <article key={plan.id} className={`${styles.plan} ${plan.popular ? styles.planFeatured : ""}`}>
              {plan.popular ? (
                <span className={styles.planBadge}>{t("pricing.badge.popular")}</span>
              ) : (
                <span className={styles.planBadgeSpacer} aria-hidden />
              )}
              <h3 className={styles.planName}>{plan.name}</h3>
              <div className={styles.planPrice}>{usd(plan.price.USD)}</div>
              <div className={styles.planTerm}>
                {t(plan.months > 1 ? "pricing.termOther" : "pricing.termOne", { n: plan.months })}
              </div>
              <div className={styles.planAlt}>≈ ¥{plan.price.JPY.toLocaleString("en-US")} · ₫{plan.price.VND.toLocaleString("en-US")}</div>
              <ul className={styles.planFeatures}>
                {plan.features.map((f) => (
                  <li key={f.label} className={styles.planFeature}>
                    <Check size={16} aria-hidden />
                    {f.label}
                  </li>
                ))}
              </ul>
              <Link href="/checkout" className={`${styles.btnPrimary} ${styles.planCta}`}>
                {t("pricing.choose", { name: plan.name.split(" (")[0] })}
              </Link>
            </article>
          ))}
        </div>
        <p className={styles.pricingNote}>{t("pricing.note")}</p>
      </Section>

      <Section kicker={t("pricing.faq.kicker")} title={t("pricing.faq.title")}>
        <Faq
          items={[
            { q: t("pricing.faq.1.q"), a: t("pricing.faq.1.a") },
            { q: t("pricing.faq.2.q"), a: t("pricing.faq.2.a") },
            { q: t("pricing.faq.3.q"), a: t("pricing.faq.3.a") },
            { q: t("pricing.faq.4.q"), a: t("pricing.faq.4.a") },
          ]}
        />
      </Section>

      <CtaBand
        title={t("pricing.cta.title")}
        body={t("pricing.cta.body")}
        ctas={[
          { href: "/checkout", label: t("pricing.cta.checkout"), primary: true },
          { href: "/tutors", label: t("pricing.cta.tutors") },
        ]}
      />
    </PageShell>
  );
}
