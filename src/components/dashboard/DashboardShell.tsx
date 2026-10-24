import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowUpRight, Bell } from "lucide-react";
import type { LearnerDashboard } from "@/lib/dashboard-data";
import { SideNav } from "./Nav";
import styles from "./dashboard.module.css";

export default function DashboardShell({ learner, children }: { learner: LearnerDashboard["learner"]; children: ReactNode }) {
  return (
    <div className={styles.page}>
      <div className={styles.window}>
        <header className={styles.topbar}>
          <Link href="/dashboard" className={styles.brand}>
            <svg width="34" height="34" viewBox="0 0 38 38" fill="none" strokeWidth="2.4" aria-hidden>
              <circle cx="17" cy="19" r="13" stroke="#3fb8ad" /><path d="M4 19h26M17 6c-6 6-6 20 0 26M17 6c6 6 6 20 0 26" stroke="#3fb8ad" />
              <circle cx="31" cy="11" r="4" fill="#f2541b" stroke="none" />
            </svg>
            <span>Nile<br />Language</span>
          </Link>
          <p className={styles.portalLabel}>Learner portal</p>
          <div className={styles.userBox}>
            <img src={learner.avatar} alt="" width={36} height={36} className={styles.avatar} />
            <div><strong>{learner.name}</strong><small>Level <b>{learner.level === "Not set" ? "not set" : learner.level}</b></small></div>
            <Link href="/dashboard/notifications" className={styles.bell} aria-label={`Notifications, ${learner.unread} unread`}>
              <Bell size={19} />
              {learner.unread > 0 && <span className={styles.badge}>{learner.unread}</span>}
            </Link>
          </div>
        </header>
        <div className={styles.body}>
          <div className={styles.sidebar}>
            <SideNav />
            <Link className={styles.sideFoot} href="/">Back to site <ArrowUpRight size={13} aria-hidden /></Link>
          </div>
          <main className={styles.content}>{children}</main>
        </div>
      </div>
    </div>
  );
}
