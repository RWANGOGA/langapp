import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CalendarDays, Globe2, GraduationCap, Search, TrendingUp, UserRound } from "lucide-react";
import { getLearnerDashboard } from "@/lib/dashboard-data";
import DashboardShell from "@/components/dashboard/DashboardShell";
import styles from "@/components/dashboard/dashboard.module.css";

export const metadata: Metadata = { title: "My Tutor | Learner Dashboard" };

export default async function LearnerTutorPage() {
  const { learner, tutor, progress, nextClass } = await getLearnerDashboard();
  return (
    <DashboardShell learner={learner}>
    <section className={styles.dashboardPage} aria-labelledby="tutor-title">
      <div className={styles.pageHeading}>
        <div>
          <p className={styles.kicker}>Your learning team</p>
          <h1 id="tutor-title">My Tutor</h1>
          <p>Your current tutor assignment and learning relationship.</p>
        </div>
        <Link className={styles.headerAction} href="/tutors"><Search size={16} /> Browse tutors</Link>
      </div>
      {tutor ? (
        <article className={styles.tutorProfile}>
          <div className={styles.profilePanel}>
            <img src={tutor.avatar} alt={tutor.name} width={120} height={120} className={styles.portrait} />
            <div><span className={styles.statusPill}>Assigned tutor</span><h2>{tutor.name}</h2><p><Globe2 size={15} /> {tutor.country}</p></div>
          </div>
          <div className={styles.profileActions}><Link className={styles.btnPrimary} href="/dashboard/notifications">View tutor updates <ArrowRight size={16} /></Link></div>
          <div className={styles.detailGrid}>
            <div><TrendingUp size={18} /><span><b>Lessons completed</b>{progress.total ? `${progress.completed} of ${progress.total}` : "None yet — your first lesson is ahead"}</span></div>
            <div><GraduationCap size={18} /><span><b>Current level</b>{progress.level}</span></div>
            <div><CalendarDays size={18} /><span><b>Next lesson</b>{nextClass ? nextClass.title : "Not scheduled yet"}</span></div>
          </div>
        </article>
      ) : <div className={styles.emptyState}><span className={styles.emptyIcon}><UserRound size={28} /></span><h2>Your tutor match is on the way</h2><p>No tutor has been assigned yet. Our team assigns tutors after your payment is confirmed — you can browse the approved faculty meanwhile.</p><Link className={styles.btnPrimary} href="/tutors">Browse tutors <ArrowRight size={16} /></Link></div>}
    </section>
    </DashboardShell>
  );
}