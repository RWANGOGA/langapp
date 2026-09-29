import type { ReactNode } from "react";
import { Bell, Eye, Pencil, Trash2 } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { Activity, CellStatus, Kpi, Leader, MatrixRow, Meeting, Plan } from "@/lib/admin-data";
import Sidebar from "./Sidebar";
import styles from "./admin.module.css";

export { default as TutorRoster } from "./TutorRoster";

type BadgeVariant = "coral" | "teal" | "success" | "navy";

const CELL_VARIANT: Record<Exclude<CellStatus, "empty">, BadgeVariant> = {
  pending: "coral", confirmed: "navy", completed: "teal", assigned: "navy", alert: "coral", plus: "teal",
};
const CELL_LABEL: Record<CellStatus, string> = {
  pending: "Pending", confirmed: "Confirmed", completed: "Completed", alert: "Alert", assigned: "Assigned", plus: "+", empty: "",
};
const LEGEND: Exclude<CellStatus, "empty" | "assigned" | "plus">[] = ["pending", "confirmed", "completed", "alert"];

const formatToday = () =>
  new Intl.DateTimeFormat("en-US", { weekday: "long", month: "short", day: "numeric", year: "numeric" }).format(new Date());

/* Shell: rendered once by the page. Active sidebar link comes from the URL, not a hard-coded id. */
export function AdminLayout({ kpis, adminName, children }: { kpis: Kpi[]; adminName: string; children: ReactNode }) {
  return (
    <div className={styles.adminLayout}>
      <header className={styles.adminHeader}>
        <div className={styles.headerBrand}><span className={styles.brandDot} aria-hidden>◍</span>Logo</div>
        <div className={styles.headerActions}>
          <Avatar size="md" fallback={adminName[0]} gradient="pink" />
          <span>Admin Profile</span>
          <button type="button" className={styles.notificationBell}><Bell size={16} aria-hidden /> Notifications</button>
        </div>
      </header>
      <div className={styles.adminBody}>
        <Sidebar />
        <main className={styles.adminMain}>
          <div className={styles.adminHeaderContent}>
            <div>
              <h1 className={styles.adminTitle}>Admin &amp; Tutor Management Dashboard</h1>
              <p className={styles.adminSubtitle}>Welcome, {adminName}! | {formatToday()}</p>
            </div>
            <dl className={styles.kpiGrid}>
              {kpis.map((k) => (
                <div key={k.label} className={styles.kpiCard}>
                  <dt className={styles.kpiLabel}>{k.label}</dt>
                  <dd className={styles.kpiValue}>{k.value}</dd>
                </div>
              ))}
            </dl>
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}

export function AssignmentMatrix({ rows }: { rows: MatrixRow[] }) {
  return (
    <Card className={styles.adminCard}>
      <div className={styles.cardHeader}>
        <h3>Student-Tutor Assignment Matrix</h3>
        <Button variant="teal" size="sm" className={styles.assignmentToolsBtn}>Assignment Tools</Button>
      </div>
      <div className={styles.matrixContainer} role="table" aria-label="Student tutor assignments">
        <div className={styles.matrixHeader} role="row">
          <span role="columnheader">Tutor</span>
          {[1, 2, 3, 4, 5].map((n) => <span key={n} role="columnheader">Student {n}</span>)}
          <span role="columnheader">Action</span>
        </div>
        {rows.map((r) => (
          <div key={r.tutor} className={styles.matrixRow} role="row">
            <span className={styles.matrixTutor} role="rowheader">{r.tutor}</span>
            {r.cells.map((c, i) => (
              <span key={i} className={styles.matrixStatus} role="cell">
                {c !== "empty" && (
                  <Badge
                    variant={CELL_VARIANT[c]}
                    className={[styles.statusBadge, c === "alert" && styles.alert, c === "plus" && styles.plus].filter(Boolean).join(" ")}
                  >
                    {CELL_LABEL[c]}
                  </Badge>
                )}
              </span>
            ))}
            <span className={styles.matrixAction} role="cell">
              <span className={styles.actionIcons}>
                <button type="button" aria-label={`View ${r.tutor}`}><Eye size={15} /></button>
                <button type="button" aria-label={`Edit ${r.tutor}`}><Pencil size={15} /></button>
                <button type="button" aria-label={`Remove ${r.tutor}`}><Trash2 size={15} /></button>
              </span>
            </span>
          </div>
        ))}
      </div>
      <ul className={styles.matrixLegend}>
        {LEGEND.map((s) => (
          <li key={s} className={styles.legendItem}><i className={`${styles.legendDot} ${styles[s]}`} />{CELL_LABEL[s]}</li>
        ))}
      </ul>
    </Card>
  );
}

export function MeetingsPanel({ meetings }: { meetings: Meeting[] }) {
  return (
    <Card className={styles.adminCard}>
      <div className={styles.cardHeader}><h3>Video Meeting Integration Panel</h3></div>
      {meetings.map((m) => (
        <div key={m.provider} className={styles.meetingRow}>
          <div className={styles.meetingInfo}>
            <strong>{m.provider}</strong>
            {m.sessions.map((s) => <span key={s}>{s}</span>)}
          </div>
          {/* TODO: POST /api/meetings/link (Meet / Zoom / Teams Graph) */}
          <Button variant="navy" size="sm" className={styles.createLinkBtn}>Create Link</Button>
        </div>
      ))}
    </Card>
  );
}

export function SubscriptionManagement({ plans, leaders }: { plans: Plan[]; leaders: Leader[] }) {
  let acc = 0;
  const stops = plans.map((p) => `${p.color} ${acc}% ${(acc += p.share)}%`).join(", ");
  return (
    <Card className={styles.adminCard}>
      <div className={styles.cardHeader}><h3>Package &amp; Subscription Management</h3></div>
      <div className={styles.donutChart} style={{ background: `conic-gradient(${stops})` }} role="img" aria-label={plans.map((p) => `${p.name} ${p.share}%`).join(", ")} />
      <ul className={styles.chartLegend}>
        {plans.map((p) => <li key={p.name} className={styles.legendItem}><i className={styles.legendDot} style={{ background: p.color }} />{p.name}</li>)}
      </ul>
      <div className={styles.subscriptionLeaders}>
        <h4>Top Performers</h4>
        {leaders.map((l) => <div key={l.name} className={styles.leaderRow}><span>{l.name}</span><strong>{l.value}</strong></div>)}
      </div>
    </Card>
  );
}

export function ActivityLog({ items }: { items: Activity[] }) {
  return (
    <Card className={`${styles.adminCard} ${styles.activityLogCard}`}>
      <div className={styles.cardHeader}><h3>Real-time Activity Log &amp; Notifications</h3></div>
      <ul aria-live="polite">
        {items.map((a) => (
          <li key={a.id} className={styles.activityItem}>
            <span className={styles.activityAvatar} aria-hidden>{a.initial}</span>
            <span className={styles.activityText}>{a.text}</span>
            <small className={styles.activityTime}>{a.time}</small>
          </li>
        ))}
      </ul>
    </Card>
  );
}