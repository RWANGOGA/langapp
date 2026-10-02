import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getLearnerDashboard } from "@/lib/dashboard-data";
import styles from "@/components/dashboard/dashboard.module.css";

export const metadata: Metadata = { title: "My Tutor | Learner Dashboard" };

export default async function LearnerTutorPage() {
  const { tutor } = await getLearnerDashboard();
  return (
    <section className={styles.dashboardPage} aria-labelledby="tutor-title">
      <div className={styles.pageHeading}><p className={styles.kicker}>Learner dashboard</p><h1 id="tutor-title">My Tutor</h1><p>Your current tutor assignment from Nile Language.</p></div>
      {tutor ? (
        <article className={styles.profilePanel}>
          <Image src={tutor.avatar} alt={tutor.name} width={120} height={120} className={styles.portrait} />
          <div><h2>{tutor.name}</h2><p>{tutor.country}</p><Link className={styles.btnOutline} href="/dashboard/notifications">View tutor updates</Link></div>
        </article>
      ) : <p className={styles.emptyState}>No tutor has been assigned yet. An administrator will notify you when your match is ready.</p>}
    </section>
  );
}