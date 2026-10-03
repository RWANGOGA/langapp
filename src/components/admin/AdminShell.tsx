import Link from "next/link";
import { Bell, BookOpen, CreditCard, FileBarChart, LayoutDashboard, Settings, Users, Video } from "lucide-react";
import type { Kpi } from "@/lib/admin-data";
import styles from "./admin.module.css";

const NAV = [
  { id: "dashboard", label: "Dashboard", Icon: LayoutDashboard },
  { id: "tutors", label: "Tutors", Icon: Users },
  { id: "students", label: "Students", Icon: Users },
  { id: "classes", label: "Classes", Icon: BookOpen },
  { id: "meetings", label: "Meetings", Icon: Video },
  { id: "subscriptions", label: "Subscriptions", Icon: CreditCard },
  { id: "reports", label: "Reports", Icon: FileBarChart },
  { id: "settings", label: "Settings", Icon: Settings, push: true },
];

const SECTION_COPY: Record<string, { title: string; subtitle: string }> = {
  dashboard: { title: "Operations overview", subtitle: "A clear view of learners, tutors, and today’s activity." },
  tutors: { title: "Tutor roster", subtitle: "Review tutor profiles, evidence, status, and assignments." },
  students: { title: "Student roster", subtitle: "Keep track of learners and their current support needs." },
  classes: { title: "Classes", subtitle: "Plan and monitor lessons across the learning program." },
  meetings: { title: "Meeting integrations", subtitle: "Manage the video platforms used for upcoming sessions." },
  subscriptions: { title: "Subscriptions", subtitle: "Understand package distribution and account status." },
  reports: { title: "Reports & activity", subtitle: "Review recent actions and operational signals." },
  settings: { title: "Settings", subtitle: "Configure your administration workspace." },
};

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
  const copy = SECTION_COPY[activeSection] || SECTION_COPY.dashboard;
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
              <item.Icon className={styles.sidebarIcon} size={19} strokeWidth={1.8} aria-hidden />
              <span>{item.label}</span>
            </Link>
          ))}
        </aside>

        <main className={styles.adminMain}>
          <div className={styles.adminHeaderContent}>
            <div>
              <p className={styles.adminEyebrow}>Nile Language administration</p>
              <h1 className={styles.adminTitle}>{copy.title}</h1>
              <p className={styles.adminSubtitle}>{copy.subtitle}</p>
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
