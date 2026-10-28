"use client";

import { CheckCircle2, Bell, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import type { LearnerNotification } from "@/lib/notifications-data";
import { useLanguage } from "@/i18n/LanguageProvider";
import styles from "./dashboard.module.css";

export default function NotificationList({ initialNotifications }: { initialNotifications: LearnerNotification[] }) {
  const { t } = useLanguage();
  const [notifications, setNotifications] = useState(initialNotifications);

  const markRead = async (id: number) => {
    const response = await fetch(`/api/v1/notifications/${id}/read`, {
      method: "PATCH",
      credentials: "include",
    });
    if (!response.ok) return;
    setNotifications((current) => current.map((notification) => notification.id === id ? { ...notification, is_read: true } : notification));
  };

  if (notifications.length === 0) {
    return <div className={`${styles.emptyState} ${styles.emptyStateQuiet}`}><span className={styles.emptyIcon}><CheckCircle2 size={26} /></span><h2>{t("learner.notif.emptyTitle")}</h2><p>{t("learner.notif.emptyBody")}</p><Link className={styles.btnPrimary} href="/dashboard"><span>{t("learner.notif.backToDash")}</span><ArrowRight size={16} /></Link></div>;
  }

  return (
    <div className={styles.notificationList}>
      {notifications.map((notification) => {
        const rowClass = `${styles.notificationItem} ${notification.is_read ? "" : styles.unread} ${notification.link ? styles.linked : ""}`;
        // A linked row is itself the action: it opens the screen that resolves
        // the event and marks the notification read as you go, so there is no
        // separate button nested in the link (invalid, and one intent anyway).
        const inner = (
          <>
            {notification.is_read ? <CheckCircle2 size={20} aria-hidden /> : <Bell size={20} aria-hidden />}
            <div>
              <h2>{notification.title}</h2>
              <p>{notification.message}</p>
              <time dateTime={notification.created_at}>{new Date(notification.created_at).toLocaleString()}</time>
              {!notification.link && !notification.is_read && <button type="button" className={styles.markRead} onClick={() => void markRead(notification.id)}>{t("learner.notif.markRead")}</button>}
            </div>
            {notification.link && <ArrowRight size={18} className={styles.notifGo} aria-hidden />}
          </>
        );
        return notification.link ? (
          <Link key={notification.id} href={notification.link} className={rowClass} onClick={() => void markRead(notification.id)}>
            {inner}
          </Link>
        ) : (
          <article key={notification.id} className={rowClass}>{inner}</article>
        );
      })}
    </div>
  );
}
