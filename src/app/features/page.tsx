import type { Metadata } from "next";
import { CtaBand, FeatureRows, Faq, Hero, PageShell, ProofBand, Section, Steps } from "@/components/marketing/Sections";

export const metadata: Metadata = {
  title: "Features | Nile Language",
  description:
    "A verified tutor, a measured goal and a weekly cycle of live lessons, written feedback and recorded progress.",
};

export default function FeaturesPage() {
  return (
    <PageShell>
      <Hero
        kicker="The approach"
        title="Fluency, engineered."
        lede="Nile Language treats English as a system, not a scramble of apps and luck: one verified tutor, one measured goal, and a weekly cycle of live lessons, written feedback and recorded progress. Systems beat willpower."
        ctas={[
          { href: "/pricing", label: "See programs and prices", primary: true },
          { href: "/tutors", label: "Meet the tutors" },
        ]}
      />

      <Section kicker="How it works" title="Three decisions. Then you are learning.">
        <Steps
          items={[
            { num: "01", title: "Choose a program", body: "Pick the duration that fits the next months of your life. Every program is one-to-one; nothing is shared with a group." },
            { num: "02", title: "Get matched", body: "An approved tutor is assigned around your level, your goals and your timezone — and you are notified the moment it happens." },
            { num: "03", title: "Learn, then measure", body: "Live lessons on a fixed schedule. Notes land after each one. Your record shows exactly where the hours went." },
          ]}
        />
      </Section>

      <Section kicker="What it takes" title="Built the way serious learning is built.">
        <FeatureRows
          items={[
            {
              label: "Verification",
              title: "Tutors are vetted, not hired.",
              body: "Before anyone teaches here, they clear an eight-step review: identity and credentials, English proficiency testing, and a live demo lesson observed before approval. You study with evidence, not profiles.",
            },
            {
              label: "One to one",
              title: "Every minute is yours.",
              body: "A dedicated tutor. A syllabus shaped around the English you actually need — work, study, or moving somewhere new. No breakout rooms, no waiting for your turn.",
            },
            {
              label: "Your clock",
              title: "Lessons in your timezone, always.",
              body: "Sessions are scheduled in UTC and rendered in your local time — Nairobi, Tokyo or Toronto. The countdown, the reminders and the calendar all agree on your clock, not the server's.",
            },
            {
              label: "Feedback",
              title: "Every lesson ends with notes.",
              body: "The moment a tutor closes a session, your personalized feedback — what worked, what to drill next — is written to your dashboard and sent as a notification. Not someday. After class.",
            },
            {
              label: "Fair rules",
              title: "A schedule that respects both sides.",
              body: "Cancel well ahead and it is simply cancelled. Inside 24 hours, a reason is required so your tutor can plan. Miss a lesson and it is recorded as a no-show, not quietly erased.",
            },
            {
              label: "Access",
              title: "Pricing and payment that cross borders.",
              body: "Plans are published in USD with local equivalents, and checkout supports region-appropriate payment methods. Learning should not be gated by which bank you hold.",
            },
          ]}
        />
      </Section>

      <ProofBand
        stats={[
          { value: "4.9", label: "Average rating" },
          { value: "2,000+", label: "Learner reviews" },
          { value: "100%", label: "Certified tutors" },
          { value: "EFEC", label: "Accredited" },
        ]}
      />

      <Section kicker="Questions" title="Answers before you ask.">
        <Faq
          items={[
            {
              q: "How are tutors approved?",
              a: "Every application passes identity and credential checks, an English proficiency test, and a demo lesson reviewed by our team. Only then can someone take learners.",
            },
            {
              q: "What happens if I need to cancel a lesson?",
              a: "More than 24 hours before the lesson, cancel freely from your dashboard. Inside 24 hours, give a reason — your tutor decides, and you will both see the record. Once a lesson has started it can no longer be cancelled.",
            },
            {
              q: "Where do I see my progress?",
              a: "Completed sessions, your current level and package status are recorded on your dashboard. Your tutor writes notes after every lesson, and they stay there.",
            },
            {
              q: "Which payment methods can I use?",
              a: "Checkout adapts to your region with locally relevant payment methods. Prices are shown in USD with local-currency equivalents on the pricing page.",
            },
          ]}
        />
      </Section>

      <CtaBand
        title="Start with one lesson."
        body="Choose a program, get matched with a verified tutor, and put the first session on the calendar this week."
        ctas={[
          { href: "/pricing", label: "Choose a program", primary: true },
          { href: "/auth/register", label: "Create an account" },
        ]}
      />
    </PageShell>
  );
}
