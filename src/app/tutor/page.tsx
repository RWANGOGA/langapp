"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Clock, PackageCheck } from "lucide-react";
import Calendar from "@/components/tutor/Calendar";
import Countdown from "@/components/tutor/Countdown";
import DashboardLayout from "@/components/tutor/DashboardLayout";
import DashboardShell from "@/components/tutor/DashboardShell";
import { useAuth } from "@/lib/auth";
import { getTutorDashboard, TutorDashboard } from "@/lib/tutor-data";
import styles from "@/components/tutor/tutor.module.css";

export default function TutorPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading, isTutor } = useAuth();
  const [dashboard, setDashboard] = useState<TutorDashboard | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.push(`/auth/login?callbackUrl=${encodeURIComponent("/tutor")}`);
      } else if (!isTutor) {
        router.push("/dashboard");
      }
    }
  }, [isAuthenticated, isTutor, isLoading, router]);

  useEffect(() => {
    if (isAuthenticated && isTutor) {
      getTutorDashboard()
        .then(setDashboard)
        .catch((err) => setError(err.message));
    }
  }, [isAuthenticated, isTutor]);

  if (isLoading || !isAuthenticated || !isTutor) {
    return (
      <div className={styles.loading}>
        <div className={styles.loadingSpinner}>Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.loading}>
        <div className={styles.loadingSpinner}>Error: {error}</div>
      </div>
    );
  }

  if (!dashboard) {
    return (
      <div className={styles.loading}>
        <div className={styles.loadingSpinner}>Loading dashboard...</div>
      </div>
    );
  }

  const { tutor, next, learners, today, sessions, packageSummary } = dashboard;
  const todays = sessions.filter((s) => s.date === today);

  const initials = (n: string) => n.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

  return (
    <DashboardLayout>
      <DashboardShell tutor={tutor}>
        <div className={styles.tGrid}>
          <section className={`${styles.card} ${styles.roster}`} aria-labelledby="roster-h">
            <div className={styles.cardHead}>
              <h3 id="roster-h" className={styles.cardTitle}>Assigned Learners</h3>
              <Link href="/tutor/learners" className={styles.linkMore}>View all</Link>
            </div>
            <ul className={styles.learnerList}>
              {learners.map((l) => (
                <li key={l.id} className={styles.learnerItem}>
                  <span className={styles.initials} aria-hidden>{initials(l.name)}</span>
                  <div><strong>{l.name}</strong><small>{l.nativeLanguage} · {l.goal}</small></div>
                  <span className={styles.level}>{l.level}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className={`${styles.card} ${styles.next}`} aria-labelledby="next-h">
            <div className={styles.cardTop}>
              <h3 id="next-h" className={styles.cardTitle}>Next Session</h3>
              <Clock size={26} className={styles.clockRing} aria-hidden />
            </div>
            <h4 className={styles.nextTitle}>{next.topic}</h4>
            <div className={styles.nextRow}>
              <div className={styles.nextLearner}>
                <span className={styles.initials} aria-hidden>{initials(next.learner)}</span>
                <strong>{next.learner}</strong>
              </div>
              <Countdown initialSeconds={next.secondsLeft} />
            </div>

            {next.meetingUrl ? (
              <a className={`${styles.btnCoral} ${styles.startLink}`} href={next.meetingUrl} target="_blank" rel="noopener noreferrer">Start class</a>
            ) : (
              <form className={styles.linkForm} method="post" action="/api/tutor/meeting-link">
                <input type="hidden" name="sessionId" value={next.sessionId} />
                <select className={styles.select} name="provider" aria-label="Meeting provider" defaultValue="Google Meet">
                  <option>Google Meet</option><option>Zoom</option><option>MS Teams</option>
                </select>
                <button type="submit" className={styles.btnCoral}>Generate link</button>
              </form>
            )}

            <h4 className={styles.subTitle}>Today&apos;s Sessions</h4>
            <ul className={styles.todayList}>
              {todays.map((s) => (
                <li key={s.id} className={styles.sessionRow}>
                  <time>{s.time}</time>
                  <span><strong>{s.learner}</strong> · {s.topic}</span>
                  {s.meetingUrl && <a className={styles.linkMore} href={s.meetingUrl} target="_blank" rel="noopener noreferrer">{s.provider}</a>}
                </li>
              ))}
              {todays.length === 0 && <li className={styles.sessionRow}>No sessions today.</li>}
            </ul>
          </section>

          <section className={`${styles.card} ${styles.calendar}`}>
            <Calendar today={today} events={sessions} />
            <hr className={styles.rule} />
            <h3 className={styles.subTitle}>Upcoming</h3>
            <ul className={styles.upList}>
              {sessions.filter((s) => s.date > today).map((s) => (
                <li key={s.id} className={styles.learnerItem}>{s.date.slice(5)} | {s.time} - {s.learner}</li>
              ))}
            </ul>
          </section>

          <section className={`${styles.card} ${styles.notes}`} aria-labelledby="notes-h">
            <h3 id="notes-h" className={styles.cardTitle}>Lesson Notes & Feedback</h3>
            <form className={styles.form} method="post" action="/api/tutor/feedback">
              <label>Learner
                <select className={styles.select} name="learnerId" required defaultValue="">
                  <option value="" disabled>Select learner</option>
                  {learners.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </label>
              <label>Lesson topic
                <input className={styles.input} name="topic" placeholder="e.g. Unit 7 - Conversation Practice" required />
              </label>
              <label className={styles.wide}>Feedback for the learner
                <textarea className={styles.textarea} name="feedback" placeholder="Strengths, areas to improve, homework…" required />
              </label>
              <button type="submit" className={styles.submit}>Send feedback</button>
            </form>
          </section>
          <section className={`${styles.card} ${styles.notes}`} aria-labelledby="packages-h">
            <h3 id="packages-h" className={styles.cardTitle}><PackageCheck size={20} className={styles.tealIcon} /> Learner Packages</h3>
            <p className={styles.packagePrivacy}>Only packages belonging to your assigned learners are shown.</p>
            <ul className={styles.packageList}>{packageSummary.map((item) => <li key={`${item.student_id}-${item.started_at}`}><span><strong>{item.student_name}</strong><small>{item.package_name} · {item.tier || "one-time"} · {item.subject || "Learning plan"}</small><small>Started {new Date(item.started_at).toLocaleDateString()} · Expires {item.expires_at ? new Date(item.expires_at).toLocaleDateString() : "Not set"}</small></span><b>{item.status}</b></li>)}{packageSummary.length === 0 && <li>No assigned learner packages yet.</li>}</ul>
          </section>
        </div>
      </DashboardShell>
    </DashboardLayout>
  );
}