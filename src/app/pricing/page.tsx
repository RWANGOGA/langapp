import type { Metadata } from "next";
import Link from "next/link";
import { Check } from "lucide-react";
import { CtaBand, Faq, Hero, PageShell, Section } from "@/components/marketing/Sections";
import { getPlans } from "@/lib/packages-data";
import styles from "@/components/marketing/marketing.module.css";

export const metadata: Metadata = {
  title: "Pricing | Nile Language",
  description:
    "One-to-one English programs with a verified tutor. Published prices, local payment methods, no hidden fees.",
};

const usd = (n: number) => `$${n.toLocaleString("en-US")}`;

export default async function PricingPage() {
  const plans = await getPlans();

  return (
    <PageShell>
      <Hero
        kicker="Programs"
        title="Priced plainly. No surprises."
        lede="Three durations, one price each. Every program is entirely one-to-one with your assigned, verified tutor — live lessons, written feedback after each class, and a record of your progress."
        ctas={[{ href: "#plans", label: "View the programs", primary: true }]}
      />

      <Section bare>
        <div id="plans" className={styles.plans}>
          {plans.map((plan) => (
            <article key={plan.id} className={`${styles.plan} ${plan.popular ? styles.planFeatured : ""}`}>
              {plan.popular ? (
                <span className={styles.planBadge}>Most chosen</span>
              ) : (
                <span className={styles.planBadgeSpacer} aria-hidden />
              )}
              <h3 className={styles.planName}>{plan.name}</h3>
              <div className={styles.planPrice}>{usd(plan.price.USD)}</div>
              <div className={styles.planTerm}>for {plan.months} month{plan.months > 1 ? "s" : ""} of one-to-one lessons</div>
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
                Choose {plan.name.split(" (")[0]}
              </Link>
            </article>
          ))}
        </div>
        <p className={styles.pricingNote}>
          Prices are shown in USD with indicative local-currency equivalents; the exact amount and the payment
          methods available to you are confirmed at checkout based on your region.
        </p>
      </Section>

      <Section kicker="Before you decide" title="The questions that matter at checkout.">
        <Faq
          items={[
            {
              q: "What is included in every program?",
              a: "One-to-one live lessons with your assigned tutor, written feedback after every completed session, rescheduling under the 24-hour policy, and a dashboard record of everything you have done.",
            },
            {
              q: "Can I pay in my local currency?",
              a: "Checkout supports region-appropriate payment methods and shows what is available for your location before you commit.",
            },
            {
              q: "What happens after I buy?",
              a: "Your order moves into matching. An administrator assigns a verified tutor for your level and goals, and you are notified the moment that happens — then you put the first lesson on the calendar.",
            },
            {
              q: "Does the program expire?",
              a: "Each program runs for its stated duration from activation. Choose the length that matches the plan you can actually keep — consistency beats intensity.",
            },
          ]}
        />
      </Section>

      <CtaBand
        title="Pick the rhythm you can keep."
        body="One purchase, one tutor, one clear path. Checkout takes less than a minute."
        ctas={[
          { href: "/checkout", label: "Go to checkout", primary: true },
          { href: "/tutors", label: "Meet the tutors first" },
        ]}
      />
    </PageShell>
  );
}
