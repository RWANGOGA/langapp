import { ChevronUp } from "lucide-react";
import { Card } from "@/components/ui/Card";
import type { Activity } from "@/lib/admin-data";
import styles from "./admin.module.css";

export function ActivityLog({ items }: { items: Activity[] }) {
  return (
    <Card className={`${styles.adminCard} ${styles.activityLogCard}`}>
      <details open className={styles.details}>
        <summary className={styles.cardHeader}><h3>Real-time Activity Log & Notifications</h3><ChevronUp size={18} className={styles.chev} aria-hidden /></summary>
        <ul aria-live="polite">
          {items.map((a) => (
            <li key={a.id} className={styles.activityItem}>
              <span className={`${styles.activityAvatar} ${a.initial === "S" ? styles.navyAvatar : ""}`} aria-hidden>{a.initial}</span>
              <span className={styles.activityText}>{a.text}<small className={styles.activityTime}>{a.time}</small></span>
            </li>
          ))}
        </ul>
      </details>
    </Card>
  );
}