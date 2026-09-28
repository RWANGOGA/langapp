"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Clock } from "lucide-react";
import Calendar from "@/components/tutor/Calendar";
import Countdown from "@/components/tutor/Countdown";
import DashboardLayout from "@/components/tutor/DashboardLayout";
import DashboardShell from "@/components/tutor/DashboardShell";
import { useAuth } from "@/lib/auth";
import { getTutorDashboard } from "@/lib/tutor-data";
import styles from "@/components/tutor/tutor.module.css";

export default function TutorPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading, isTutor } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.push(`/auth/login?callbackUrl=${encodeURIComponent("/tutor")}`);
      } else if (!isTutor) {
        router.push("/auth/login");
      }
    }
  }, [isAuthenticated, isTutor, isLoading, router]);

  const { tutor, next, learners, today, sessions } = getTutorDashboard();
  const todays = sessions.filter((s) => s.date === today);

  if (isLoading || !isAuthenticated || !isTutor) {
    return (
      <div className={styles.loading}>
        <div className={styles.loadingSpinner}>Loading...</div>
      </div>
    );
  }

  const initials = (n: string) => n.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

  return (
    <DashboardLayout>
      <DashboardShell tutor={tutor}>
        <div className={styles.tGrid}>
          {/* Assigned learners */}
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

          {/* Next session + meeting link generator + today's list */}
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

          {/* Calendar with events */}
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

          {/* Lesson notes & feedback (plain form -> your API route) */}
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
        </div>
      </DashboardShell>
    </DashboardLayout>
  );
}