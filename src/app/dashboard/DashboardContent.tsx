"use client";

import Link from "next/link";
import { ArrowRight, CalendarDays, GraduationCap, Package, Search, TrendingUp } from "lucide-react";
import type { LearnerDashboard } from "@/lib/dashboard-data";
import type { PaymentSummary as PaymentSummaryData } from "@/lib/payment-data";
import Calendar from "@/components/shared/Calendar";
import ClassList from "@/components/dashboard/ClassList";
import Countdown from "@/components/shared/Countdown";
import PaymentSummary from "@/components/dashboard/PaymentSummary";
import TestimonialBox from "@/components/shared/TestimonialBox";
import { useLanguage } from "@/i18n/LanguageProvider";
import styles from "@/components/dashboard/dashboard.module.css";

interface Props extends LearnerDashboard {
  payment: PaymentSummaryData;
}

export default function DashboardContent({ learner, tutor, nextClass, progress, classes, payment }: Props) {
  const { t } = useLanguage();

  return (
    <>
      <section className={styles.dashboardWelcome} aria-labelledby="dashboard-title">
        <div>
          <p className={styles.kicker}>{t("learner.dash.kicker")}</p>
          <h1 id="dashboard-title">{t("learner.dash.welcome", { name: learner.name.split(" ")[0] })}</h1>
          <p>{t("learner.dash.lede")}</p>
        </div>
        <Link className={styles.headerAction} href="/tutors"><Search size={15} /> {t("learner.dash.browseTutors")}</Link>
      </section>

      <div className={styles.dashboardStats}>
        <div><span className={styles.dashboardStatIcon}><TrendingUp size={16} /></span><span><small>{t("learner.dash.statProgress")}</small><b>{progress.percent}%</b></span></div>
        <div><span className={styles.dashboardStatIcon}><GraduationCap size={16} /></span><span><small>{t("learner.dash.statLevel")}</small><b>{progress.level === "Not set" ? t("learner.pay.notSet") : progress.level}</b></span></div>
        <div><span className={styles.dashboardStatIcon}><CalendarDays size={16} /></span><span><small>{t("learner.dash.statUpcoming")}</small><b>{classes.length || t("learner.dash.none")}</b></span></div>
      </div>

      <PaymentSummary payment={payment} />

      <div className={styles.split}>
        <div className={styles.mainPane}>
          <section className={styles.band} aria-labelledby="next-h">
            <h2 id="next-h" className={styles.bandLabel}>{t("learner.dash.nextClass")}</h2>
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
                  {nextClass.zoomUrl && <a className={styles.btnCoral} href={nextClass.zoomUrl} target="_blank" rel="noopener noreferrer">{t("learner.dash.joinZoom")}</a>}
                  {nextClass.meetUrl && <a className={styles.btnCoral} href={nextClass.meetUrl} target="_blank" rel="noopener noreferrer">{t("learner.dash.joinMeet")}</a>}
                </div>
                {nextClass.packageName && (
                  <p className={styles.packageNote}><Package size={14} aria-hidden /> {nextClass.packageName}</p>
                )}
              </>
            ) : (
              <div className={styles.bandEmpty}>
                <p>{t("learner.dash.noClass")}</p>
                <Link className={styles.textLink} href="/dashboard/tutors">{tutor ? t("learner.dash.seeTutor") : t("learner.dash.browseTutors")} <ArrowRight size={13} /></Link>
              </div>
            )}
          </section>

          <section className={styles.band} aria-labelledby="pg-h">
            <div className={styles.bandHead}>
              <h2 id="pg-h" className={styles.bandLabel}>{t("learner.dash.progress")}</h2>
              <Link className={styles.textLink} href="/dashboard/progress">{t("learner.dash.details")} <ArrowRight size={13} /></Link>
            </div>
            <div className={styles.figureRow}>
              <strong className={styles.figure}>{progress.percent}<span>%</span></strong>
              <div className={styles.figureBody}>
                <div className={styles.bar} role="progressbar" aria-valuenow={progress.percent} aria-valuemin={0} aria-valuemax={100}>
                  <i style={{ width: `${progress.percent}%` }}>{progress.percent}%</i>
                </div>
                <p className={styles.figureMeta}>
                  <span>{progress.total ? t("learner.dash.lessonsCompleted", { completed: progress.completed, total: progress.total }) : t("learner.dash.progressStarts")}</span>
                  <span>{progress.level === "Not set" ? t("learner.dash.levelNotSet") : t("learner.dash.level", { level: progress.level })}</span>
                </p>
              </div>
            </div>
          </section>

          <section className={styles.band} aria-labelledby="up-h">
            <h2 id="up-h" className={styles.bandLabel}>{t("learner.dash.upcomingLessons")}</h2>
            <ClassList classes={classes} />
          </section>

          {/* One voice per account, written here and shown on the public wall. */}
          <TestimonialBox audience="learner" />
        </div>

        <aside className={styles.sidePane}>
          <section className={styles.band} aria-labelledby="tutor-h">
            <h2 id="tutor-h" className={styles.bandLabel}>{t("learner.dash.myTutor")}</h2>
            {tutor ? (
              <>
                <div className={styles.tutorWho}>
                  <img src={tutor.avatar} alt="" width={56} height={56} />
                  <span><strong>{tutor.name}</strong><small>{tutor.country}</small></span>
                </div>
                <Link className={styles.textLink} href="/dashboard/tutors">{t("learner.dash.viewTutor")} <ArrowRight size={13} /></Link>
              </>
            ) : (
              <div className={styles.bandEmpty}>
                <p>{t("learner.dash.noTutor")}</p>
                <Link className={styles.textLink} href="/tutors">{t("learner.dash.browseTutors")} <ArrowRight size={13} /></Link>
              </div>
            )}
          </section>

          <section className={styles.band} aria-label={t("learner.dash.scheduledClasses")}>
            <Calendar title={t("learner.dash.scheduledClasses")} events={classes} />
          </section>
        </aside>
      </div>
    </>
  );
}
