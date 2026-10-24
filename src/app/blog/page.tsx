import type { Metadata } from "next";
import { CtaBand, Hero, PageShell, Section } from "@/components/marketing/Sections";
import styles from "@/components/marketing/marketing.module.css";

export const metadata: Metadata = {
  title: "Journal | Nile Language",
  description: "Short, practical notes on learning English — written by the people who teach it.",
};

const NOTES = [
  {
    title: "Choose a goal you can picture",
    body: "Start from the situation you want English to unlock — the meeting, the application, the airport — then make the goal specific enough to practise on Tuesday.",
    meta: "Method",
  },
  {
    title: "What makes feedback worth hearing",
    body: "The best corrections arrive while the sentence is still fresh, point at one concrete thing, and connect to something you were trying to say. That is what a lesson note is for.",
    meta: "Feedback",
  },
  {
    title: "Consistency beats intensity",
    body: "A realistic weekly rhythm gives new language enough repetition to become automatic. The heroic weekend of study is measurable in enthusiasm, not in fluency.",
    meta: "Habit",
  },
];

export default function BlogPage() {
  return (
    <PageShell>
      <Hero
        kicker="Journal"
        title="Notes on learning properly."
        lede="Short, practical writing from the people who teach and learn with Nile Language. No listicles, no ten tips — the few things that actually change outcomes."
      />

      <Section bare>
        <div className={styles.notes}>
          {NOTES.map((n) => (
            <article key={n.title} className={styles.note}>
              <h2 className={styles.noteTitle}>{n.title}</h2>
              <p className={styles.noteBody}>{n.body}</p>
              <div className={styles.noteMeta}>{n.meta}</div>
            </article>
          ))}
        </div>
      </Section>

      <CtaBand
        title="Reading about it is step one."
        body="A verified tutor turns these ideas into your plan — starting with one lesson."
        ctas={[
          { href: "/pricing", label: "Choose a program", primary: true },
          { href: "/resources", label: "Practice habits" },
        ]}
      />
    </PageShell>
  );
}
