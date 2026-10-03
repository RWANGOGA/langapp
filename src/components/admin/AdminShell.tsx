import Link from "next/link";
import { Bell } from "lucide-react";
import type { Kpi } from "@/lib/admin-data";
import styles from "./admin.module.css";

const NAV = [
  { id: "dashboard", label: "Dashboard", icon: "▦" },
  { id: "tutors", label: "Tutors", icon: "👥" },
  { id: "students", label: "Students", icon: "👥" },
  { id: "classes", label: "Classes", icon: "🗓" },
  { id: "meetings", label: "Meetings", icon: "🎥" },
  { id: "subscriptions", label: "Subscriptions", icon: "💳" },
  { id: "reports", label: "Reports", icon: "📄" },
  { id: "settings", label: "Settings", icon: "⚙", push: true },
];

export default function AdminShell({
  kpis,
  unread,
  activeSection = "dashboard",
  children,
}: {
  kpis: Kpi[];
  unread: number;
  activeSection?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={styles.adminLayout}>
      <header className={styles.adminHeader}>
        <div className={styles.headerBrand}>
          <span className={styles.brandMark} aria-hidden>◍</span>
          Nile Language
        </div>
        <div className={styles.headerActions}>
          <span className={styles.headerAvatar} aria-hidden>E</span>
          <span>Admin Profile</span>
          <button type="button" className={styles.notificationBell} aria-label={`Notifications, ${unread} unread`}>
            <Bell size={16} strokeWidth={1.8} />
            Notifications{unread > 0 ? ` (${unread})` : ""}
          </button>
        </div>
      </header>

      <div className={styles.adminBody}>
        <aside className={styles.adminSidebar} aria-label="Admin sections">
          {NAV.map((item) => (
            <Link
              key={item.id}
              href={`/admin/${item.id}`}
              className={`${styles.sidebarItem} ${item.id === activeSection ? styles.active : ""} ${item.push ? styles.push : ""}`}
              aria-current={item.id === activeSection ? "page" : undefined}
            >
              <span className={styles.sidebarIcon} aria-hidden>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </aside>

        <main className={styles.adminMain}>
          <div className={styles.adminHeaderContent}>
            <div>
              <h1 className={styles.adminTitle}>Admin &amp; Tutor Management Dashboard</h1>
              <p className={styles.adminSubtitle}>Welcome, Eleanor! | Monday, Oct 28, 2024</p>
            </div>

            <ul className={styles.kpiGrid}>
              {kpis.map((kpi) => (
                <li key={kpi.label} className={styles.kpiCard}>
                  <span className={styles.kpiLabel}>{kpi.label}</span>
                  <b className={styles.kpiValue}>{kpi.value}</b>
                </li>
              ))}
            </ul>
          </div>

          {children}
        </main>
      </div>
    </div>
  );
}
