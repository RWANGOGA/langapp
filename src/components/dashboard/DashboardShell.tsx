"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell } from "lucide-react";
import { ICONS, initialsOf, type PortalNavItem } from "@/components/portal/navIcons";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import BackLink from "@/components/layout/BackLink";
import type { LearnerDashboard } from "@/lib/dashboard-data";
import { useLanguage } from "@/i18n/LanguageProvider";
import styles from "./learnershell.module.css";

/* The learner portal, dressed in a friendlier blend: a soft top bar and a
   rounded pill nav in teal, so a student opens something warmer and calmer than
   the admin console or the tutor's editorial masthead. */
export default function DashboardShell({
  learner,
  children,
}: {
  learner: LearnerDashboard["learner"];
  children: React.ReactNode;
}) {
  const { t } = useLanguage();
  const path = usePathname();

  const NAV: PortalNavItem[] = [
    { href: "/dashboard", label: t("nav.dashboard"), icon: "dashboard" },
    { href: "/dashboard/tutors", label: t("nav.myTutor"), icon: "tutors" },
    { href: "/dashboard/progress", label: t("nav.progress"), icon: "progress" },
    { href: "/dashboard/notifications", label: t("nav.notifications"), icon: "notifications" },
  ];

  const isActive = (href: string) => (href === "/dashboard" ? path === href : path.startsWith(href));
  const level = learner.level === "Not set" ? t("portal.levelNotSet") : learner.level;

  return (
    <div className={styles.page} data-portal="learner">
      <header className={styles.topbar}>
        <Link href="/dashboard" className={styles.brand}>
          <span className={styles.logo} aria-hidden>NL</span>
          <span>Nile Language</span>
        </Link>
        <div className={styles.right}>
          <LanguageSwitcher variant="light" />
          <div className={styles.identity}>
            {learner.avatar ? (
              <img src={learner.avatar} alt="" width={40} height={40} className={styles.avatar} />
            ) : (
              <span className={styles.initials} aria-hidden>{initialsOf(learner.name)}</span>
            )}
            <div className={styles.who}>
              <strong>{learner.name}</strong>
              <small>{t("portal.level")} <b>{level}</b></small>
            </div>
          </div>
          <Link href="/dashboard/notifications" className={styles.bell} aria-label={t("portal.notificationsAria", { unread: learner.unread })}>
            <Bell size={20} aria-hidden />
            {learner.unread > 0 && <span className={styles.badge}>{learner.unread}</span>}
          </Link>
        </div>
      </header>

      <nav className={styles.nav} aria-label={t("portal.aria.learner")}>
        {NAV.map(({ href, label, icon }) => {
          const Icon = ICONS[icon];
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`${styles.link} ${active ? styles.linkOn : ""}`}
            >
              <Icon size={16} strokeWidth={1.8} aria-hidden /> {label}
            </Link>
          );
        })}
      </nav>

      <main className={styles.content}>
        <div className={styles.backRow}>
          <BackLink fallback="/dashboard" />
        </div>
        {children}
      </main>
    </div>
  );
}
