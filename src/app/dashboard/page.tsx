import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { apiGet } from "@/lib/api";
import Link from "next/link";
import { ArrowRight, CalendarDays, GraduationCap, Package, Search, TrendingUp } from "lucide-react";
import Calendar from "@/components/shared/Calendar";
import ClassList from "@/components/dashboard/ClassList";
import Countdown from "@/components/shared/Countdown";
import DashboardShell from "@/components/dashboard/DashboardShell";
import styles from "@/components/dashboard/dashboard.module.css";
import { getLearnerDashboard } from "@/lib/dashboard-data";
import { getPaymentSummary } from "@/lib/payment-data";
import PaymentSummary from "@/components/dashboard/PaymentSummary";

export const metadata: Metadata = { title: "Learner Dashboard" };

export default async function DashboardPage() {
  const me = await apiGet<{ role: string }>("/auth/me");
  if (me?.role === "tutor") redirect("/tutor");
  if (me?.role === "admin") redirect("/admin");
  const [{ learner, tutor, nextClass, progress, classes }, payment] = await Promise.all([getLearnerDashboard(), getPaymentSummary()]);

  return (
    <DashboardShell learner={learner}>
      <section className={styles.dashboardWelcome} aria-labelledby="dashboard-title">
        <div>
          <p className={styles.kicker}>Learner dashboard</p>
          <h1 id="dashboard-title">Welcome back, {learner.name.split(" ")[0]}</h1>
          <p>Here is your learning plan at a glance.</p>
        </div>
        <Link className={styles.headerAction} href="/tutors"><Search size={15} /> Browse tutors</Link>
      </section>

      <div className={styles.dashboardStats}>
        <div><span className={styles.dashboardStatIcon}><TrendingUp size={16} /></span><span><small>Progress</small><b>{progress.percent}%</b></span></div>
        <div><span className={styles.dashboardStatIcon}><GraduationCap size={16} /></span><span><small>Current level</small><b>{progress.level}</b></span></div>
        <div><span className={styles.dashboardStatIcon}><CalendarDays size={16} /></span><span><small>Upcoming classes</small><b>{classes.length || "None"}</b></span></div>
      </div>

      <PaymentSummary payment={payment} />

      <div className={styles.split}>
        <div className={styles.mainPane}>
          <section className={styles.band} aria-labelledby="next-h">
            <h2 id="next-h" className={styles.bandLabel}>Next class</h2>
            {nextClass ? (
              <>
                <h3 className={styles.bandTitle}>{nextClass.title}</h3>
                <div className={styles.nextRow}>
                  {tutor && (
                    <div className={styles.miniTutor}>
                      <img src={tutor.avatar} alt="" width={40} height={40} />
                      <span><strong>{tutor.name}</strong><small>{tutor.country}</small></span>
                    </div>
                  )}
                  <Countdown initialSeconds={nextClass.secondsLeft} />
                </div>
                <div className={styles.joinRow}>
                  {nextClass.zoomUrl && <a className={styles.btnCoral} href={nextClass.zoomUrl} target="_blank" rel="noopener noreferrer">Join Zoom Class</a>}
                  {nextClass.meetUrl && <a className={styles.btnCoral} href={nextClass.meetUrl} target="_blank" rel="noopener noreferrer">Join Google Meet</a>}
                </div>
                {nextClass.packageName && (
                  <p className={styles.packageNote}><Package size={14} aria-hidden /> {nextClass.packageName}</p>
                )}
              </>
            ) : (
              <div className={styles.bandEmpty}>
                <p>No class scheduled yet. Your next lesson appears here once your tutor schedules it.</p>
                <Link className={styles.textLink} href="/dashboard/tutors">{tutor ? "See your tutor" : "Browse tutors"} <ArrowRight size={13} /></Link>
              </div>
            )}
          </section>

          <section className={styles.band} aria-labelledby="pg-h">
            <div className={styles.bandHead}>
              <h2 id="pg-h" className={styles.bandLabel}>Progress</h2>
              <Link className={styles.textLink} href="/dashboard/progress">Details <ArrowRight size={13} /></Link>
            </div>
            <div className={styles.figureRow}>
              <strong className={styles.figure}>{progress.percent}<span>%</span></strong>
              <div className={styles.figureBody}>
                <div className={styles.bar} role="progressbar" aria-valuenow={progress.percent} aria-valuemin={0} aria-valuemax={100}>
                  <i style={{ width: `${progress.percent}%` }}>{progress.percent}%</i>
                </div>
                <p className={styles.figureMeta}>
                  <span>{progress.total ? `${progress.completed} of ${progress.total} lessons completed` : "Progress starts after your first lesson."}</span>
                  <span>Level {progress.level === "Not set" ? "not set" : progress.level}</span>
                </p>
              </div>
            </div>
          </section>

          <section className={styles.band} aria-labelledby="up-h">
            <h2 id="up-h" className={styles.bandLabel}>Upcoming lessons</h2>
            <ClassList classes={classes} />
          </section>
        </div>

        <aside className={styles.sidePane}>
          <section className={styles.band} aria-labelledby="tutor-h">
            <h2 id="tutor-h" className={styles.bandLabel}>My tutor</h2>
            {tutor ? (
              <>
                <div className={styles.tutorWho}>
                  <img src={tutor.avatar} alt="" width={56} height={56} />
                  <span><strong>{tutor.name}</strong><small>{tutor.country}</small></span>
                </div>
                <Link className={styles.textLink} href="/dashboard/tutors">View tutor <ArrowRight size={13} /></Link>
              </>
            ) : (
              <div className={styles.bandEmpty}>
                <p>No tutor assigned yet. An administrator will match you after your payment is confirmed.</p>
                <Link className={styles.textLink} href="/tutors">Browse tutors <ArrowRight size={13} /></Link>
              </div>
            )}
          </section>

          <section className={styles.band} aria-label="Scheduled classes">
            <Calendar title="Scheduled classes" events={classes} />
          </section>
        </aside>
      </div>
    </DashboardShell>
  );
}
