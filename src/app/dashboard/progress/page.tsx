import type { Metadata } from "next";
import { getLearnerDashboard } from "@/lib/dashboard-data";
import DashboardShell from "@/components/dashboard/DashboardShell";
import styles from "@/components/dashboard/dashboard.module.css";

export const metadata: Metadata = { title: "Progress | Learner Dashboard" };

export default async function LearnerProgressPage() {
  const { learner, progress } = await getLearnerDashboard();
  const scheduled = Math.max(0, progress.total - progress.completed);
  return (
    <DashboardShell learner={learner}>
      <section className={styles.dashboardPage} aria-labelledby="progress-title">
        <header className={styles.pageHeading}>
          <div>
            <p className={styles.kicker}>Your learning journey</p>
            <h1 id="progress-title">Learning progress</h1>
            <p>How far through your plan you are, and what the number counts.</p>
          </div>
        </header>

        <section className={styles.panel} aria-label="Progress breakdown">
          <div className={`${styles.figureRow} ${styles.figureRowAligned}`}>
            <strong className={styles.figure}>{progress.percent}<span>%</span></strong>
            <div className={styles.figureBody}>
              <div className={styles.bar} role="progressbar" aria-valuenow={progress.percent} aria-valuemin={0} aria-valuemax={100}>
                <i style={{ width: `${progress.percent}%` }}>{progress.percent}%</i>
              </div>
              <p className={styles.figureMeta}>
                <span>{progress.completed} of {progress.total} lessons completed</span>
                <span>{scheduled} still scheduled</span>
              </p>
            </div>
          </div>

          <dl className={styles.rows}>
            <div><dt>Current level</dt><dd>{progress.level === "Not set" ? "Not set — placement pending" : progress.level}</dd></div>
            <div><dt>Lessons completed</dt><dd>{progress.completed}</dd></div>
            <div><dt>Lessons still scheduled</dt><dd>{scheduled}</dd></div>
            <div><dt>How this is measured</dt><dd className={styles.rowNote}>Completed lessons over completed plus scheduled. Cancelled and missed lessons are excluded from both sides of the ratio.</dd></div>
          </dl>
        </section>
      </section>
    </DashboardShell>
  );
}
