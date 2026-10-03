import type { Metadata } from "next";
import { getNotifications } from "@/lib/notifications-data";
import NotificationList from "@/components/dashboard/NotificationList";
import { Bell, CheckCheck } from "lucide-react";
import styles from "@/components/dashboard/dashboard.module.css";

export const metadata: Metadata = { title: "Notifications | Learner Dashboard" };

export default async function LearnerNotificationsPage() {
  const { notifications, unread } = await getNotifications();

  return (
    <section className={styles.dashboardPage} aria-labelledby="notifications-title">
      <div className={styles.pageHeading}>
        <p className={styles.kicker}>Stay in the loop</p>
        <h1 id="notifications-title">Notifications</h1>
        <p>{unread ? `${unread} unread updates need your attention.` : "You are all caught up. We will let you know when something needs your attention."}</p>
      </div>
      <div className={styles.notificationSummary}><div><span className={styles.summaryIcon}><Bell size={18} /></span><span><small>Inbox status</small><b>{unread ? `${unread} unread` : "All caught up"}</b></span></div><div><CheckCheck size={18} /><span><small>Total updates</small><b>Recent activity</b></span></div></div>
      <NotificationList initialNotifications={notifications} />
    </section>
  );
}