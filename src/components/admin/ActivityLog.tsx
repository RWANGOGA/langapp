import { Card } from "@/components/ui/Card";
import type { Activity } from "@/lib/admin-data";
import styles from "./admin.module.css";

export default function ActivityLog({ items }: { items: Activity[] }) {
  return (
    <Card className={styles.adminCard}>
      <h3 className={styles.cardTitle}>Real-time Activity Log &amp; Notifications</h3>
      {items.map((item) => (
        <div key={item.id} className={styles.activityItem}>
          <span className={styles.activityAvatar} aria-hidden>{item.initial}</span>
          <span className={styles.activityText}>{item.text}</span>
          <small className={styles.activityTime}>{item.time}</small>
        </div>
      ))}
    </Card>
  );
}
