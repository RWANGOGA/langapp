import { MoreHorizontal } from "lucide-react";
import { Card } from "@/components/ui/Card";
import type { Plan, Leader, StatusCount, BarGroup } from "@/lib/admin-data";
import styles from "./admin.module.css";

export function SubscriptionManagement({ plans, leaders, statuses, bars }: { plans: Plan[]; leaders: Leader[]; statuses: StatusCount[]; bars: BarGroup[] }) {
  const stops = plans.reduce((acc, p) => {
    const start = acc.cursor;
    acc.cursor += p.share;
    acc.stops.push(`${p.color} ${start}% ${acc.cursor}%`);
    return acc;
  }, { cursor: 0, stops: [] as string[] }).stops.join(", ");
  return (
    <Card className={styles.adminCard}>
      <div className={styles.cardHeader}>
        <h3>Package & Subscription Management</h3>
        <button type="button" className={styles.cardMenu} aria-label="Options"><MoreHorizontal size={20} /></button>
      </div>
      <div className={styles.subGrid}>
        <div>
          <h4 className={styles.miniTitle}>Subscription Distribution</h4>
          <div className={styles.distRow}>
            <div className={styles.donutChart} style={{ background: `conic-gradient(${stops})` }} role="img" aria-label={plans.map((p) => `${p.name} ${p.share}%`).join(", ")} />
            <ul className={styles.dotList}>{plans.map((p) => <li key={p.name}><i style={{ background: p.color }} />{p.name}</li>)}</ul>
          </div>
        </div>
        <div>
          <h4 className={styles.miniTitle}>Status</h4>
          <ul className={styles.dotList}>
            {statuses.map((s) => (
              <li key={s.label}>
                <i style={{ background: s.color }} />
                {s.label}{s.count !== undefined ? ` (${s.count})` : ""}
              </li>
            ))}
          </ul>
        </div>
        <div className={styles.barChart} role="img" aria-label="Subscriptions per plan">
          <div className={styles.yAxis}>{[60, 40, 20, 0].map((t) => <span key={t}>{t}</span>)}</div>
          <div className={styles.barArea}>
            {bars.map((g) => (
              <div key={g.label} className={styles.barGroup}>
                <div className={styles.barPair}>{g.bars.map((b, i) => <span key={i} className={styles.bar} style={{ height: `${(b.value / 60) * 100}%`, background: b.color }} />)}</div>
                <small>{g.label}</small>
              </div>
            ))}
          </div>
        </div>
        <div>
          <div className={styles.userHead}><strong>User Data</strong><strong>Data</strong></div>
          {leaders.map((l) => (
            <div key={l.name} className={styles.userRow}>
              <span className={styles.activityAvatar} aria-hidden>{l.name[0]}</span><span className={styles.grow}>{l.name}</span><strong>{l.value}</strong>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}