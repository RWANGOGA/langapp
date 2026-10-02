import Link from "next/link";
import type { ReactNode } from "react";
import { Bell } from "lucide-react";
import type { TutorDashboard } from "@/lib/tutor-data";
import { SideNav, TopNav } from "./Nav";
import styles from "./tutor.module.css";

const initials = (n: string) => n.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

export default function DashboardShell({ tutor, children }: { tutor: TutorDashboard["tutor"]; children: ReactNode }) {
  return (
    <div className={styles.page}>
      <div className={styles.window}>
        <header className={styles.topbar}>
          <Link href="/tutor" className={styles.brand}>
            <svg width="38" height="38" viewBox="0 0 38 38" fill="none" strokeWidth="2.4" aria-hidden>
              <circle cx="17" cy="19" r="13" stroke="#3fb8ad" /><path d="M4 19h26M17 6c-6 6-6 20 0 26M17 6c6 6 6 20 0 26" stroke="#3fb8ad" />
              <circle cx="31" cy="11" r="4" fill="#f2541b" stroke="none" />
            </svg>
            <span>Nile<br />Language</span>
          </Link>
          <TopNav />
          <div className={styles.userBox}>
            <span className={styles.initials} aria-hidden>{initials(tutor.name)}</span>
            <div><strong>{tutor.name}</strong><small><b>{tutor.role}</b></small></div>
            <button type="button" className={styles.bell} aria-label={`Notifications, ${tutor.unread} unread`}>
              <Bell size={22} />
              {tutor.unread > 0 && <span className={styles.badge}>{tutor.unread}</span>}
            </button>
          </div>
        </header>
        <div className={styles.body}>
          <SideNav />
          <main className={styles.content}>{children}</main>
        </div>
      </div>
    </div>
  );
}