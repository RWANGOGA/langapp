import type { Metadata } from "next";
import { CtaBand, Hero, PageShell, Section, Steps } from "@/components/marketing/Sections";

export const metadata: Metadata = {
  title: "Practice | Nile Language",
  description: "Habits that do the heavy lifting between one-to-one English lessons.",
};

export default function ResourcesPage() {
  return (
    <PageShell>
      <Hero
        kicker="Practice"
        title="Lessons build it. Practice keeps it."
        lede="The hour with your tutor sets the direction; what you do in the fifty minutes after decides whether it sticks. Four habits, no apps required — your tutor can turn them into a weekly plan shaped to your level."
        ctas={[
          { href: "/pricing", label: "Get a tutor", primary: true },
          { href: "/tutors", label: "Browse tutors" },
        ]}
      />

      <Section bare>
        <Steps
          items={[
            { num: "01", title: "Keep a speaking log", body: "Write down one phrase you needed in every real conversation — and use it on purpose the next day. Language you had to reach for is language worth keeping." },
            { num: "02", title: "Review in ten minutes", body: "Ten focused minutes daily beats a heroic three-hour session once a month. Short cycles give new words the repetition they need to become automatic." },
            { num: "03", title: "Bring real questions", body: "Save the sentences that confused you at work, online or in transit. Unanswered questions are the best lesson plan neither of you could have written in advance." },
          ]}
        />
      </Section>

      <Section
        kicker="Habit four"
        title="Use it before you study it."
        lede="Switch one thing you already do into English — a phone, a game, the news app you read every morning. Fluency grows fastest where the language stops being a subject and becomes a tool you pick up anyway. Tell your tutor which tool you chose; lesson three will be better for it."
      />

      <CtaBand
        title="Practice with feedback is faster."
        body="A verified tutor turns these habits into a plan and checks the work every week — starting with one lesson."
        ctas={[
          { href: "/pricing", label: "Choose a program", primary: true },
          { href: "/features", label: "See how it works" },
        ]}
      />
    </PageShell>
  );
}
