import type { Metadata } from "next";
import { getNotifications } from "@/lib/notifications-data";
import { getLearnerDashboard } from "@/lib/dashboard-data";
import NotificationList from "@/components/dashboard/NotificationList";
import DashboardShell from "@/components/dashboard/DashboardShell";
import { Bell, CheckCheck } from "lucide-react";
import styles from "@/components/dashboard/dashboard.module.css";

export const metadata: Metadata = { title: "Notifications | Learner Dashboard" };

export default async function LearnerNotificationsPage() {
  const [{ learner }, inbox] = await Promise.all([getLearnerDashboard(), getNotifications()]);
  const { notifications, unread } = inbox;

  return (
    <DashboardShell learner={learner}>
      <section className={styles.dashboardPage} aria-labelledby="notifications-title">
        <header className={styles.pageHeading}>
          <div>
            <p className={styles.kicker}>Updates and reminders</p>
            <h1 id="notifications-title">Notifications</h1>
            <p>{unread ? `${unread} unread ${unread === 1 ? "update needs" : "updates need"} your attention.` : "You are all caught up. We will let you know when something needs your attention."}</p>
          </div>
        </header>

        <div className={styles.notificationSummary}>
          <div>
            <span className={styles.summaryIcon}><Bell size={16} /></span>
            <span><small>Inbox status</small><b>{unread ? `${unread} unread` : "All caught up"}</b></span>
          </div>
          <div>
            <span className={styles.summaryIcon}><CheckCheck size={16} /></span>
            <span><small>Total updates</small><b>{notifications.length}</b></span>
          </div>
        </div>

        <NotificationList initialNotifications={notifications} />
      </section>
    </DashboardShell>
  );
}
