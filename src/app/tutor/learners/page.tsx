"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import TutorPageShell from "@/components/tutor/TutorPageShell";
import { getTutorLearners, TutorLearnerRow } from "@/lib/tutor-data";
import styles from "@/components/tutor/tutor.module.css";

const localDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString([], { month: "short", day: "numeric" }) : "—";
const localDateTime = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString([], { month: "short", day: "numeric" }) +
      " · " +
      new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : "—";
const initials = (n: string) => n.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

export default function TutorLearnersPage() {
  const [learners, setLearners] = useState<TutorLearnerRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getTutorLearners()
      .then((d) => setLearners(d.learners))
      .catch((e) => setError(e.message));
  }, []);

  return (
    <TutorPageShell>
      <section className={styles.card} aria-labelledby="learners-h">
        <div className={styles.cardHead}>
          <h1 id="learners-h" className={styles.cardTitle}>My Learners</h1>
          <Link href="/tutor" className={styles.linkMore}>Back to dashboard</Link>
        </div>
        {error && <p className={styles.subTitle}>Could not load your learners: {error}</p>}
        {!error && learners === null && <p className={styles.subTitle}>Loading…</p>}
        {!error && learners?.length === 0 && (
          <p className={styles.subTitle}>
            No learners yet. They appear here once an order is matched to you.
          </p>
        )}
        {!error && !!learners?.length && (
          <ul className={styles.learnerList}>
            {learners.map((l) => (
              <li key={l.id} className={styles.learnerItem}>
                <span className={styles.initials} aria-hidden>{initials(l.name)}</span>
                <div>
                  <strong>{l.name}</strong>
                  <small>
                    {l.nativeLanguage ? `${l.nativeLanguage} speaker · ` : ""}
                    {l.completed} completed · {l.upcoming} upcoming
                  </small>
                </div>
                <span className={styles.level}>{l.level}</span>
                <div className={styles.nextLearner}>
                  <small>Next lesson</small>
                  <strong>{localDateTime(l.nextSessionAt)}</strong>
                  <small>Last done · {localDate(l.lastCompletedAt)}</small>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </TutorPageShell>
  );
}
