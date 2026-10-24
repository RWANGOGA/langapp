import type { Metadata } from "next";
import styles from "@/components/marketing/marketing.module.css";
import { getTutorDirectory } from "@/lib/tutors-data";
import TutorDirectory from "./TutorDirectory";

export const metadata: Metadata = {
  title: "Our Certified English Tutors | Nile Language",
  description:
    "Browse the real Nile Language faculty — every tutor cleared identity checks, credential review, tested English proficiency and an observed demo lesson.",
  alternates: { canonical: "/tutors" },
};

export default async function TutorsPage() {
  const tutors = await getTutorDirectory();
  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <section className={styles.hero}>
          <p className={styles.kicker}>The faculty</p>
          <h1 className={styles.display}>Meet the tutors you will actually study with.</h1>
          <p className={styles.lede}>
            Everyone on this page cleared the full review pipeline: identity,
            teaching credentials, tested English proficiency, references and an
            observed demo lesson. Ratings below come from real learners after
            completed sessions — an unrated tutor was simply approved recently.
          </p>
        </section>
      </div>
      <TutorDirectory tutors={tutors} />
    </main>
  );
}
