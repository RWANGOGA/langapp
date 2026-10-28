"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell } from "lucide-react";
import { ICONS, initialsOf, type PortalNavItem } from "@/components/portal/navIcons";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import BackLink from "@/components/layout/BackLink";
import type { TutorDashboard } from "@/lib/tutor-data";
import { useLanguage } from "@/i18n/LanguageProvider";
import styles from "./tutorshell.module.css";

/* The tutor portal, dressed in the Stanford language: a cardinal rule, a serif
   masthead, and a horizontal editorial nav. Same links, different frame from
   the admin console - the point is that each persona opens a distinct room. */
export default function DashboardShell({
  tutor,
  children,
}: {
  tutor: TutorDashboard["tutor"];
  children: React.ReactNode;
}) {
  const { t } = useLanguage();
  const path = usePathname();

  const NAV: PortalNavItem[] = [
    { href: "/tutor", label: t("nav.dashboard"), icon: "dashboard" },
    { href: "/tutor/learners", label: t("nav.myLearners"), icon: "learners" },
    { href: "/tutor/schedule", label: t("nav.schedule"), icon: "schedule" },
    { href: "/tutor/notes", label: t("nav.lessonNotes"), icon: "notes" },
    { href: "/tutor/earnings", label: t("nav.earnings"), icon: "payments" },
    { href: "/tutor/settings", label: t("nav.settings"), icon: "settings" },
    { href: "/tutor/notifications", label: t("nav.notifications"), icon: "notifications" },
  ];

  const isActive = (href: string) => (href === "/tutor" ? path === href : path.startsWith(href));
  const avatar = (tutor as { avatar?: string }).avatar;

  return (
    <div className={styles.page} data-portal="tutor">
      <div className={styles.topRule} />
      <header className={styles.masthead}>
        <Link href="/tutor" className={styles.brand}>
          <span className={styles.kicker}>{t("portal.tutor")}</span>
          <span className={styles.name}>Nile Language</span>
        </Link>
        <div className={styles.right}>
          <LanguageSwitcher variant="light" />
          <div className={styles.who}>
            <strong>{tutor.name}</strong>
            <small>{tutor.role}</small>
          </div>
          {avatar ? (
            <img src={avatar} alt="" width={42} height={42} className={styles.avatar} />
          ) : (
            <span className={styles.initials} aria-hidden>{initialsOf(tutor.name)}</span>
          )}
          <Link href="/tutor/notifications" className={styles.bell} aria-label={t("portal.notificationsAria", { unread: tutor.unread })}>
            <Bell size={20} aria-hidden />
            {tutor.unread > 0 && <span className={styles.badge}>{tutor.unread}</span>}
          </Link>
        </div>
      </header>

      <nav className={styles.nav} aria-label={t("portal.aria.tutor")}>
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
              <Icon size={17} strokeWidth={1.7} aria-hidden /> {label}
            </Link>
          );
        })}
      </nav>

      <main className={styles.content}>
        <div className={styles.backRow}>
          <BackLink fallback="/tutor" />
        </div>
        {children}
      </main>
    </div>
  );
}
