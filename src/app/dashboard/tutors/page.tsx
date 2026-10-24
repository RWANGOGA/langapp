import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Globe2, Search, UserRound } from "lucide-react";
import { getLearnerDashboard } from "@/lib/dashboard-data";
import DashboardShell from "@/components/dashboard/DashboardShell";
import styles from "@/components/dashboard/dashboard.module.css";

export const metadata: Metadata = { title: "My Tutor | Learner Dashboard" };

export default async function LearnerTutorPage() {
  const { learner, tutor, progress, nextClass } = await getLearnerDashboard();
  return (
    <DashboardShell learner={learner}>
      <section className={styles.dashboardPage} aria-labelledby="tutor-title">
        <header className={styles.pageHeading}>
          <div>
            <p className={styles.kicker}>Your learning team</p>
            <h1 id="tutor-title">My tutor</h1>
            <p>Your current tutor assignment and how your plan is going.</p>
          </div>
          <Link className={styles.headerAction} href="/tutors"><Search size={15} /> Browse tutors</Link>
        </header>

        {tutor ? (
          <>
            <div className={styles.tutorHead}>
              <img src={tutor.avatar} alt="" width={88} height={88} />
              <div>
                <span className={styles.statusPill}>Assigned tutor</span>
                <h2>{tutor.name}</h2>
                <p className={styles.muted}><Globe2 size={14} aria-hidden /> {tutor.country}</p>
              </div>
            </div>

            <dl className={styles.rows}>
              <div><dt>Lessons completed</dt><dd>{progress.total ? `${progress.completed} of ${progress.total}` : "None yet — your first lesson is ahead"}</dd></div>
              <div><dt>Current level</dt><dd>{progress.level}</dd></div>
              <div><dt>Next lesson</dt><dd>{nextClass ? nextClass.title : "Not scheduled yet"}</dd></div>
            </dl>

            <p className={styles.rowsNote}>
              Lessons are scheduled by your tutor and matched by our team. <Link href="/dashboard/notifications">Check notifications</Link> for updates about your assignment.
            </p>
          </>
        ) : (
          <div className={styles.emptyState}>
            <span className={styles.emptyIcon}><UserRound size={26} /></span>
            <h2>Your tutor match is on the way</h2>
            <p>No tutor has been assigned yet. Our team assigns tutors after your payment is confirmed — meanwhile you can browse the approved faculty.</p>
            <Link className={styles.btnPrimary} href="/tutors">Browse tutors <ArrowRight size={15} /></Link>
          </div>
        )}
      </section>
    </DashboardShell>
  );
}
