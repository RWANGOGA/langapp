import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BookOpen, Globe2, Search, UserRound } from "lucide-react";
import { getLearnerDashboard } from "@/lib/dashboard-data";
import styles from "@/components/dashboard/dashboard.module.css";

export const metadata: Metadata = { title: "My Tutor | Learner Dashboard" };

export default async function LearnerTutorPage() {
  const { tutor } = await getLearnerDashboard();
  return (
    <section className={styles.dashboardPage} aria-labelledby="tutor-title">
      <div className={styles.pageHeading}>
        <div>
          <p className={styles.kicker}>Your learning team</p>
          <h1 id="tutor-title">My Tutor</h1>
          <p>Your current tutor assignment and learning relationship.</p>
        </div>
        <Link className={styles.headerAction} href="/tutors"><Search size={16} /> Find a tutor</Link>
      </div>
      {tutor ? (
        <article className={styles.tutorProfile}>
          <div className={styles.profilePanel}>
            <Image src={tutor.avatar} alt={tutor.name} width={120} height={120} className={styles.portrait} />
            <div><span className={styles.statusPill}>Assigned tutor</span><h2>{tutor.name}</h2><p><Globe2 size={15} /> {tutor.country}</p></div>
          </div>
          <div className={styles.profileActions}><Link className={styles.btnPrimary} href="/dashboard/notifications">View tutor updates <ArrowRight size={16} /></Link></div>
          <div className={styles.detailGrid}><div><BookOpen size={18} /><span><b>Learning plan</b>Personalized lessons</span></div><div><UserRound size={18} /><span><b>Next step</b>Check your notifications</span></div></div>
        </article>
      ) : <div className={styles.emptyState}><span className={styles.emptyIcon}><UserRound size={28} /></span><h2>Your tutor match is on the way</h2><p>No tutor has been assigned yet. Browse available tutors while our team prepares your match.</p><Link className={styles.btnPrimary} href="/tutors">Browse tutors <ArrowRight size={16} /></Link></div>}
    </section>
  );
}