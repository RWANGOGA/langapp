"use client";

import type { LearnerDashboard } from "@/lib/dashboard-data";
import { useLanguage } from "@/i18n/LanguageProvider";
import styles from "@/components/dashboard/dashboard.module.css";

export default function ProgressContent({ progress }: { progress: LearnerDashboard["progress"] }) {
  const { t } = useLanguage();
  const scheduled = Math.max(0, progress.total - progress.completed);

  return (
    <section className={styles.dashboardPage} aria-labelledby="progress-title">
      <header className={styles.pageHeading}>
        <div>
          <p className={styles.kicker}>{t("learner.progress.kicker")}</p>
          <h1 id="progress-title">{t("learner.progress.title")}</h1>
          <p>{t("learner.progress.lede")}</p>
        </div>
      </header>

      <section className={styles.panel} aria-label={t("learner.progress.aria")}>
        <div className={`${styles.figureRow} ${styles.figureRowAligned}`}>
          <strong className={styles.figure}>{progress.percent}<span>%</span></strong>
          <div className={styles.figureBody}>
            <div className={styles.bar} role="progressbar" aria-valuenow={progress.percent} aria-valuemin={0} aria-valuemax={100}>
              <i style={{ width: `${progress.percent}%` }}>{progress.percent}%</i>
            </div>
            <p className={styles.figureMeta}>
              <span>{t("learner.progress.completedOf", { completed: progress.completed, total: progress.total })}</span>
              <span>{t("learner.progress.stillScheduled", { n: scheduled })}</span>
            </p>
          </div>
        </div>

        <dl className={styles.rows}>
          <div><dt>{t("learner.progress.currentLevel")}</dt><dd>{progress.level === "Not set" ? t("learner.progress.notSet") : progress.level}</dd></div>
          <div><dt>{t("learner.progress.lessonsCompleted")}</dt><dd>{progress.completed}</dd></div>
          <div><dt>{t("learner.progress.lessonsScheduled")}</dt><dd>{scheduled}</dd></div>
          <div><dt>{t("learner.progress.measured")}</dt><dd className={styles.rowNote}>{t("learner.progress.measuredNote")}</dd></div>
        </dl>
      </section>
    </section>
  );
}
