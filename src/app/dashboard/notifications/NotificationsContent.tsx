"use client";

import { Bell, CheckCheck } from "lucide-react";
import type { LearnerNotification } from "@/lib/notifications-data";
import NotificationList from "@/components/dashboard/NotificationList";
import { useLanguage } from "@/i18n/LanguageProvider";
import styles from "@/components/dashboard/dashboard.module.css";

interface Props {
  notifications: LearnerNotification[];
  unread: number;
}

export default function NotificationsContent({ notifications, unread }: Props) {
  const { t } = useLanguage();

  return (
    <section className={styles.dashboardPage} aria-labelledby="notifications-title">
      <header className={styles.pageHeading}>
        <div>
          <p className={styles.kicker}>{t("learner.notif.kicker")}</p>
          <h1 id="notifications-title">{t("learner.notif.title")}</h1>
          <p>{unread ? t(unread === 1 ? "learner.notif.unreadOne" : "learner.notif.unreadOther", { n: unread }) : t("learner.notif.caughtUp")}</p>
        </div>
      </header>

      <div className={styles.notificationSummary}>
        <div>
          <span className={styles.summaryIcon}><Bell size={16} /></span>
          <span><small>{t("learner.notif.inboxStatus")}</small><b>{unread ? t("learner.notif.unreadN", { n: unread }) : t("learner.notif.allCaught")}</b></span>
        </div>
        <div>
          <span className={styles.summaryIcon}><CheckCheck size={16} /></span>
          <span><small>{t("learner.notif.totalUpdates")}</small><b>{notifications.length}</b></span>
        </div>
      </div>

      <NotificationList initialNotifications={notifications} />
    </section>
  );
}
