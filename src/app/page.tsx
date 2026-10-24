import type { Metadata } from "next";
import { CtaBand, FeatureRows, Hero, PageShell, Section } from "@/components/marketing/Sections";

export const metadata: Metadata = {
  title: "Nile Language — Learn English with Dedicated 1-on-1 Tutors",
  description:
    "Personalized online English lessons with verified tutors: one teacher, one measured goal, and a weekly cycle of live lessons and recorded progress.",
  alternates: { canonical: "/" },
};

export default function HomePage() {
  return (
    <PageShell>
      <Hero
        kicker="One-to-one English"
        title="Speak with precision."
        lede="Nile Language pairs you with a single verified tutor and builds the plan around your level, your goal and your timezone. No groups, no apps that guess — just lessons, feedback and a record of where the hours went."
        ctas={[
          { href: "/pricing", label: "See programs and prices", primary: true },
          { href: "/tutors", label: "Meet the tutors" },
        ]}
      />

      <Section kicker="The standard" title="What makes a lesson here different.">
        <FeatureRows
          items={[
            {
              label: "01",
              title: "Tutors clear eight checks before anyone studies with them.",
              body: "Identity, teaching credentials, tested English proficiency, references and an observed demo lesson — reviewed by staff. Approval is the only path to teaching here; nobody self-declares.",
            },
            {
              label: "02",
              title: "Every hour is one-to-one.",
              body: "Your tutor prepares for your goal, not a room of mixed levels. Sessions land on a fixed weekly schedule in your own timezone.",
            },
            {
              label: "03",
              title: "Progress is written down, not remembered.",
              body: "Your tutor records notes after each completed lesson. Learners see exactly how many of their planned sessions are done — a number calculated from real class history.",
            },
          ]}
        />
      </Section>

      <CtaBand
        title="Ready when you are."
        body="Create a free account, pick a program, and an approved tutor will be matched to you. Or bring your own classroom experience to a global roster of learners."
        ctas={[
          { href: "/auth/register", label: "Start learning", primary: true },
          { href: "/tutor/requirements", label: "Become a tutor" },
        ]}
      />
    </PageShell>
  );
}
