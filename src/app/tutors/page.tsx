import type { Metadata } from "next";
import { getTutorDirectory } from "@/lib/tutors-data";
import TutorDirectory from "./TutorDirectory";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Our Certified English Tutors | Nile Language",
  description: "Browse certified 1-on-1 English tutors for learners in Japan and Vietnam. Filter by goal, language support and rating.",
  alternates: { canonical: "/tutors" },
};

export default async function TutorsPage() {
  const tutors = await getTutorDirectory();
  return (
    <main className={styles.page}>
      <section className={styles.intro}>
        <h1>Meet Our Certified Tutors</h1>
        <p>Every tutor is TEFL/TESOL certified and vetted. Filter by your goal and find the right match.</p>
      </section>
      <TutorDirectory tutors={tutors} />
    </main>
  );
}