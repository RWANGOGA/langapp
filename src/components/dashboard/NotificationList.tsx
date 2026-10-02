"use client";

import { CheckCircle2, Bell } from "lucide-react";
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
    return <p className={styles.emptyState}>There are no notifications yet.</p>;
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
