import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { apiGet } from "@/lib/api";
import Image from "next/image";
import Link from "next/link";
import { Award, BookOpen, CalendarDays, Package, Search, TrendingUp, Clock, Users } from "lucide-react";
import Calendar from "@/components/dashboard/Calendar";
import Countdown from "@/components/dashboard/Countdown";
import DashboardShell from "@/components/dashboard/DashboardShell";
import styles from "@/components/dashboard/dashboard.module.css";
import { getLearnerDashboard } from "@/lib/dashboard-data";
import { getPaymentSummary } from "@/lib/payment-data";
import PaymentSummary from "@/components/dashboard/PaymentSummary";

export const metadata: Metadata = { title: "Learner Dashboard" };

const fmt = (iso: string) =>
  new Intl.DateTimeFormat("en-US", { weekday: "short", day: "numeric", timeZone: "UTC" }).format(new Date(iso + "T00:00:00Z"));

export default async function DashboardPage() {
  const me = await apiGet<{ role: string }>("/auth/me");
  if (me?.role === "tutor") redirect("/tutor");
  if (me?.role === "admin") redirect("/admin");
  const [{ learner, tutor, nextClass, progress, today, classes }, payment] = await Promise.all([getLearnerDashboard(), getPaymentSummary()]);
  const upcoming = classes.filter((c) => c.date > today);

  return (
    <DashboardShell learner={learner}>
      <section className={styles.dashboardWelcome} aria-labelledby="dashboard-title">
        <div><p className={styles.kicker}>Learner dashboard</p><h1 id="dashboard-title">Welcome back, {learner.name.split(" ")[0]}</h1><p>Here is your learning plan at a glance.</p></div>
        <Link className={styles.headerAction} href="/tutors"><Search size={16} /> Find a tutor</Link>
      </section>
      <div className={styles.dashboardStats}>
        <div><span className={styles.dashboardStatIcon}><TrendingUp size={18} /></span><span><small>Progress</small><b>{progress.percent}% complete</b></span></div>
        <div><span className={styles.dashboardStatIcon}><BookOpen size={18} /></span><span><small>Current level</small><b>{progress.level}</b></span></div>
        <div><span className={styles.dashboardStatIcon}><CalendarDays size={18} /></span><span><small>Upcoming classes</small><b>{upcoming.length || "None scheduled"}</b></span></div>
      </div>
      <PaymentSummary payment={payment} />
      <div className={styles.grid}>
        <section className={`${styles.card} ${styles.tutorCard}`} aria-labelledby="tutor-h">
          <h3 id="tutor-h" className={styles.cardTitle}>My Tutor</h3>
          {tutor ? (
            <>
              <Image src={tutor.avatar} alt={tutor.name} width={100} height={100} className={styles.portrait} />
              <strong className={styles.tutorName}>{tutor.name}</strong>
              <small>{tutor.country}</small>
              <Link className={styles.btnOutline} href="/dashboard/tutors">View tutor profile</Link>
              <Link className={styles.btnOutline} href="/dashboard/notifications">View updates</Link>
            </>
          ) : (
            <div className={styles.cardEmptyState}>
              <strong className={styles.tutorName}>No tutor assigned yet</strong>
              <small>An administrator will notify you when your tutor is matched.</small>
              <a className={styles.btnOutline} href="/tutors">Browse tutors</a>
            </div>
          )}
        </section>

        <section className={`${styles.card} ${styles.upcoming}`} aria-labelledby="up-h">
          <div className={styles.cardTop}>
            <h3 id="up-h" className={styles.cardTitle}>My Upcoming Class</h3>
            <Clock size={26} className={styles.clockRing} aria-hidden />
          </div>
          {nextClass && tutor ? (
            <>
              <small>Title:</small>
              <h4 className={styles.classTitle}>{nextClass.title}</h4>
              <div className={styles.classRow}>
                <div className={styles.miniTutor}>
                  <Image src={tutor.avatar} alt="" width={56} height={56} />
                  <strong>{tutor.name}</strong><small>{tutor.country}</small>
                </div>
                <Countdown initialSeconds={nextClass.secondsLeft} />
              </div>
              <div className={styles.joinRow}>
                {nextClass.zoomUrl && <a className={styles.btnCoral} href={nextClass.zoomUrl} target="_blank" rel="noopener noreferrer">Join Zoom Class</a>}
                {nextClass.meetUrl && <a className={styles.btnCoral} href={nextClass.meetUrl} target="_blank" rel="noopener noreferrer">Join Google Meet</a>}
              </div>
              <div className={styles.pkgRow}>
                <span className={styles.pkg}><Package size={18} aria-hidden /> {nextClass.packageName || "Class package"}</span>
                <Award size={26} className={styles.award} aria-hidden />
              </div>
            </>
          ) : (
            <div className={styles.cardEmptyState}><span className={styles.cardEmptyIcon}><CalendarDays size={24} /></span><strong>No class scheduled yet</strong><small>Your next lesson will appear here once it is booked.</small><Link className={styles.btnCoral} href="/tutors">Explore tutors</Link></div>
          )}
        </section>

        <section className={`${styles.card} ${styles.calendar}`}>
          <Calendar today={today} classes={classes} />
          <hr className={styles.rule} />
          <h3 className={styles.subTitle}>Upcoming Classes</h3>
          <ul className={styles.upList}>
            {upcoming.map((c) => (
              <li key={c.date + c.time}>{fmt(c.date)} | {c.time} - {c.title}</li>
            ))}
            {upcoming.length === 0 && <li className={styles.listEmpty}>No classes scheduled yet. Your calendar will fill up as lessons are booked.</li>}
          </ul>
        </section>

        <section className={`${styles.card} ${styles.progress}`} aria-labelledby="pg-h">
          <div className={styles.progressHeader}><h3 id="pg-h" className={styles.cardTitle}><TrendingUp size={22} className={styles.tealIcon} aria-hidden /> Learning Progress</h3><Link href="/dashboard/progress">View details <TrendingUp size={14} /></Link></div>
          <div className={styles.bar} role="progressbar" aria-valuenow={progress.percent} aria-valuemin={0} aria-valuemax={100}>
            <i style={{ width: `${progress.percent}%` }}>{progress.percent}%</i>
          </div>
          <div className={styles.progMeta}>
            <span>LEARNING PROGRESS (Level {progress.level})</span>
            <span>{progress.total ? `Completed Units: ${progress.completed}/${progress.total}` : "Progress starts after your first lesson."}</span>
          </div>
        </section>
      </div>
    </DashboardShell>
  );
}