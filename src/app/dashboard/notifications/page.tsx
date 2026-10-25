import type { Metadata } from "next";
import { getNotifications } from "@/lib/notifications-data";
import { getLearnerDashboard } from "@/lib/dashboard-data";
import DashboardShell from "@/components/dashboard/DashboardShell";
import NotificationsContent from "./NotificationsContent";

export const metadata: Metadata = { title: "Notifications | Learner Dashboard" };

export default async function LearnerNotificationsPage() {
  const [{ learner }, inbox] = await Promise.all([getLearnerDashboard(), getNotifications()]);
  const { notifications, unread } = inbox;

  return (
    <DashboardShell learner={learner}>
      <NotificationsContent notifications={notifications} unread={unread} />
    </DashboardShell>
  );
}
