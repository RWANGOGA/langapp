import type { Metadata } from "next";
import { getLearnerDashboard } from "@/lib/dashboard-data";
import styles from "@/components/dashboard/dashboard.module.css";

export const metadata: Metadata = { title: "Progress | Learner Dashboard" };

export default async function LearnerProgressPage() {
  const { progress } = await getLearnerDashboard();
  return (
    <section className={styles.dashboardPage} aria-labelledby="progress-title">
      <div className={styles.pageHeading}><p className={styles.kicker}>Learner dashboard</p><h1 id="progress-title">Learning Progress</h1><p>Your progress will update as lessons and curriculum units are recorded.</p></div>
      <article className={styles.progressPanel}>
        <div className={styles.bar} role="progressbar" aria-valuenow={progress.percent} aria-valuemin={0} aria-valuemax={100}><i style={{ width: `${progress.percent}%` }}>{progress.percent}%</i></div>
        <div className={styles.progMeta}><span>Current level: {progress.level}</span><span>{progress.total ? `${progress.completed}/${progress.total} units completed` : "No units recorded yet"}</span></div>
      </article>
    </section>
  );
}