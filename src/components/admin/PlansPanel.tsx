import { Card } from "@/components/ui/Card";
import type { Leader, Plan } from "@/lib/admin-data";
import styles from "./admin.module.css";

function donutGradient(plans: Plan[]) {
  let cursor = 0;
  const stops = plans.map((plan) => {
    const start = cursor;
    cursor += plan.share;
    return `${plan.color} ${start}% ${cursor}%`;
  });
  return `conic-gradient(${stops.join(", ")})`;
}

export default function PlansPanel({
  plans,
  leaders,
}: {
  plans: Plan[];
  leaders: Leader[];
}) {
  return (
    <Card className={styles.adminCard}>
      <h3 className={styles.cardTitle}>Package &amp; Subscription Management</h3>

      <div
        className={styles.donut}
        style={{ background: donutGradient(plans) }}
        role="img"
        aria-label={plans.map((p) => `${p.name} ${p.share}%`).join(", ")}
      />

      <ul className={styles.chartLegend}>
        {plans.map((plan) => (
          <li key={plan.name} className={styles.legendItem}>
            <span className={styles.legendDot} style={{ background: plan.color }} />
            {plan.name}
          </li>
        ))}
      </ul>

      <div className={styles.leaders}>
        <h4>Top Performers</h4>
        {leaders.map((leader) => (
          <div key={leader.name} className={styles.leaderRow}>
            <span>{leader.name}</span>
            <strong>{leader.value}</strong>
          </div>
        ))}
      </div>
    </Card>
  );
}
