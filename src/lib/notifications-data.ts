import { apiGet } from "@/lib/api";

export interface LearnerNotification {
  id: number;
  notification_type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  read_at: string | null;
}

export interface NotificationList {
  notifications: LearnerNotification[];
  unread: number;
}

export async function getNotifications(): Promise<NotificationList> {
  return (await apiGet<NotificationList>("/notifications")) ?? { notifications: [], unread: 0 };
}