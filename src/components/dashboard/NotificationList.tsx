"use client";

import { CheckCircle2, Bell, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import type { LearnerNotification } from "@/lib/notifications-data";
import styles from "./dashboard.module.css";

export default function NotificationList({ initialNotifications }: { initialNotifications: LearnerNotification[] }) {
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
    return <div className={styles.emptyState}><span className={styles.emptyIcon}><CheckCircle2 size={28} /></span><h2>Nothing new here</h2><p>Updates about your tutor, lessons, and account will appear in this inbox.</p><Link className={styles.btnPrimary} href="/dashboard"><span>Back to dashboard</span><ArrowRight size={16} /></Link></div>;
  }

  return (
    <div className={styles.notificationList}>
      {notifications.map((notification) => (
        <article key={notification.id} className={`${styles.notificationItem} ${notification.is_read ? "" : styles.unread}`}>
          {notification.is_read ? <CheckCircle2 size={20} aria-hidden /> : <Bell size={20} aria-hidden />}
          <div>
            <h2>{notification.title}</h2>
            <p>{notification.message}</p>
            <time dateTime={notification.created_at}>{new Date(notification.created_at).toLocaleString()}</time>
            {!notification.is_read && <button type="button" className={styles.markRead} onClick={() => void markRead(notification.id)}>Mark as read</button>}
          </div>
        </article>
      ))}
    </div>
  );
}
