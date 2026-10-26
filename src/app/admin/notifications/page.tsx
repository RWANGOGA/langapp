import type { Metadata } from "next";
import AdminNotifications from "./AdminNotifications";

export const metadata: Metadata = { title: "Notifications | Admin" };

export default function AdminNotificationsPage() {
  return <AdminNotifications />;
}
