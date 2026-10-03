import type { Metadata } from "next";
import { Award, BookOpen, CheckCircle2, Target } from "lucide-react";
import { getLearnerDashboard } from "@/lib/dashboard-data";
import styles from "@/components/dashboard/dashboard.module.css";

export const metadata: Metadata = { title: "Progress | Learner Dashboard" };

export default async function LearnerProgressPage() {
  const { progress } = await getLearnerDashboard();
  return (
    <section className={styles.dashboardPage} aria-labelledby="progress-title">
      <div className={styles.pageHeading}><div><p className={styles.kicker}>Your learning journey</p><h1 id="progress-title">Learning Progress</h1><p>See how your lessons are building confidence over time.</p></div></div>
      <div className={styles.statGrid}>
        <div className={styles.statCard}><span className={styles.statIcon}><Target size={18} /></span><small>Current level</small><strong>{progress.level}</strong></div>
        <div className={styles.statCard}><span className={styles.statIcon}><CheckCircle2 size={18} /></span><small>Units completed</small><strong>{progress.completed} <em>of {progress.total || 0}</em></strong></div>
        <div className={styles.statCard}><span className={styles.statIcon}><Award size={18} /></span><small>Overall progress</small><strong>{progress.percent}%</strong></div>
      </div>
      <article className={styles.progressPanel}>
        <div className={styles.panelHeading}><div><span className={styles.kicker}>Curriculum overview</span><h2>Keep your momentum</h2></div><BookOpen size={22} /></div>
        <div className={styles.bar} role="progressbar" aria-valuenow={progress.percent} aria-valuemin={0} aria-valuemax={100}><i style={{ width: `${progress.percent}%` }}>{progress.percent}%</i></div>
        <div className={styles.progMeta}><span>{progress.total ? `${progress.completed} of ${progress.total} units completed` : "No units recorded yet"}</span><span>{progress.percent ? "Great work so far" : "Your first lesson starts here"}</span></div>
      </article>
    </section>
  );
}