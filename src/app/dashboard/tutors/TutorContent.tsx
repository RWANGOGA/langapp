"use client";

import Link from "next/link";
import { ArrowRight, Globe2, Search, UserRound } from "lucide-react";
import type { LearnerDashboard } from "@/lib/dashboard-data";
import { useLanguage } from "@/i18n/LanguageProvider";
import styles from "@/components/dashboard/dashboard.module.css";

interface Props {
  tutor: LearnerDashboard["tutor"];
  progress: LearnerDashboard["progress"];
  nextClass: LearnerDashboard["nextClass"];
}

export default function TutorContent({ tutor, progress, nextClass }: Props) {
  const { t } = useLanguage();

  return (
    <section className={styles.dashboardPage} aria-labelledby="tutor-title">
      <header className={styles.pageHeading}>
        <div>
          <p className={styles.kicker}>{t("learner.tutor.kicker")}</p>
          <h1 id="tutor-title">{t("learner.tutor.title")}</h1>
          <p>{t("learner.tutor.lede")}</p>
        </div>
        <Link className={styles.headerAction} href="/tutors"><Search size={15} /> {t("learner.dash.browseTutors")}</Link>
      </header>

      {tutor ? (
        <>
          <div className={styles.tutorHead}>
            <img src={tutor.avatar} alt="" width={88} height={88} />
            <div>
              <span className={styles.statusPill}>{t("learner.tutor.assigned")}</span>
              <h2>{tutor.name}</h2>
              <p className={styles.muted}><Globe2 size={14} aria-hidden /> {tutor.country}</p>
            </div>
          </div>

          <dl className={styles.rows}>
            <div><dt>{t("learner.tutor.lessonsCompleted")}</dt><dd>{progress.total ? `${progress.completed} / ${progress.total}` : t("learner.tutor.noneYet")}</dd></div>
            <div><dt>{t("learner.tutor.currentLevel")}</dt><dd>{progress.level === "Not set" ? t("learner.pay.notSet") : progress.level}</dd></div>
            <div><dt>{t("learner.tutor.nextLesson")}</dt><dd>{nextClass ? nextClass.title : t("learner.tutor.notScheduled")}</dd></div>
          </dl>

          <p className={styles.rowsNote}>
            {t("learner.tutor.noteHead")} <Link href="/dashboard/notifications">{t("learner.tutor.checkNotif")}</Link> {t("learner.tutor.noteTail")}
          </p>
        </>
      ) : (
        <div className={styles.emptyState}>
          <span className={styles.emptyIcon}><UserRound size={26} /></span>
          <h2>{t("learner.tutor.emptyTitle")}</h2>
          <p>{t("learner.tutor.emptyBody")}</p>
          <Link className={styles.btnPrimary} href="/tutors">{t("learner.dash.browseTutors")} <ArrowRight size={15} /></Link>
        </div>
      )}
    </section>
  );
}
