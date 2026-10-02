import type { Metadata } from "next";
import { getNotifications } from "@/lib/notifications-data";
import NotificationList from "@/components/dashboard/NotificationList";
import styles from "@/components/dashboard/dashboard.module.css";

export const metadata: Metadata = { title: "Notifications | Learner Dashboard" };

export default async function LearnerNotificationsPage() {
  const { notifications, unread } = await getNotifications();

  return (
    <section className={styles.dashboardPage} aria-labelledby="notifications-title">
      <div className={styles.pageHeading}>
        <p className={styles.kicker}>Learner dashboard</p>
        <h1 id="notifications-title">Notifications</h1>
        <p>{unread ? `${unread} unread updates` : "You are all caught up."}</p>
      </div>
      <NotificationList initialNotifications={notifications} />
    </section>
  );
}