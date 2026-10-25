"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import {
  ArrowUpRight, Bell, BookOpen, CalendarDays, CreditCard, FileBarChart,
  LayoutDashboard, NotebookPen, Settings, TrendingUp, UserPlus, Users, Video,
} from "lucide-react";
import styles from "./portal.module.css";

/**
 * Portal chrome shared by the learner, tutor and admin surfaces.
 *
 * The icon set is referenced by name rather than passed as components so the
 * shell can be rendered from server components without crossing the client
 * boundary with function values.
 */
const ICONS = {
  dashboard: LayoutDashboard,
  applications: UserPlus,
  learners: Users,
  students: Users,
  tutors: Users,
  progress: TrendingUp,
  notifications: Bell,
  schedule: CalendarDays,
  classes: BookOpen,
  meetings: Video,
  notes: NotebookPen,
  subscriptions: CreditCard,
  reports: FileBarChart,
  settings: Settings,
};

export type PortalIcon = keyof typeof ICONS;
export type PortalNavItem = { href: string; label: string; icon: PortalIcon };

export type PortalIdentity = {
  name: string;
  /** Second line under the name: level, role, account kind. */
  meta?: ReactNode;
  /** Profile photo. Omit to fall back to initials. */
  avatar?: string;
  initials?: string;
};

const initialsOf = (name: string) =>
  name.split(" ").filter(Boolean).map((w) => w[0]).join("").slice(0, 2).toUpperCase();

export default function PortalShell({
  portalLabel,
  homeHref,
  navAriaLabel,
  nav,
  identity,
  unread,
  notificationsHref,
  footer,
  children,
}: {
  portalLabel: string;
  homeHref: string;
  navAriaLabel: string;
  nav: PortalNavItem[];
  identity: PortalIdentity;
  unread: number;
  /** Rendered as a link; without it the bell is a plain button. */
  notificationsHref?: string;
  footer?: { href: string; label: string };
  children: ReactNode;
}) {
  const path = usePathname();
  const isActive = (href: string) => (href === homeHref ? path === href : path.startsWith(href));
  const bellLabel = `Notifications, ${unread} unread`;
  const bell = (
    <>
      <Bell size={19} aria-hidden />
      {unread > 0 && <span className={styles.badge}>{unread}</span>}
    </>
  );

  return (
    <div className={styles.page}>
      <div className={styles.window}>
        <header className={styles.topbar}>
          <Link href={homeHref} className={styles.brand}>
            <svg width="34" height="34" viewBox="0 0 38 38" fill="none" strokeWidth="2.4" aria-hidden>
              <circle cx="17" cy="19" r="13" stroke="#3fb8ad" />
              <path d="M4 19h26M17 6c-6 6-6 20 0 26M17 6c6 6 6 20 0 26" stroke="#3fb8ad" />
              <circle cx="31" cy="11" r="4" fill="#f2541b" stroke="none" />
            </svg>
            <span>Nile<br />Language</span>
          </Link>
          <p className={styles.portalLabel}>{portalLabel}</p>
          <div className={styles.userBox}>
            {identity.avatar ? (
              <img src={identity.avatar} alt="" width={34} height={34} className={styles.avatar} />
            ) : (
              <span className={styles.initials} aria-hidden>{identity.initials ?? initialsOf(identity.name)}</span>
            )}
            <div>
              <strong>{identity.name}</strong>
              {identity.meta && <small>{identity.meta}</small>}
            </div>
            {notificationsHref ? (
              <Link href={notificationsHref} className={styles.bell} aria-label={bellLabel}>{bell}</Link>
            ) : (
              <button type="button" className={styles.bell} aria-label={bellLabel}>{bell}</button>
            )}
          </div>
        </header>

        <div className={styles.body}>
          <div className={styles.sidebar}>
            <nav className={styles.sideNav} aria-label={navAriaLabel}>
              {nav.map(({ href, label, icon: iconName }) => {
                const Icon = ICONS[iconName];
                const active = isActive(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    aria-current={active ? "page" : undefined}
                    className={`${styles.sideLink} ${active ? styles.active : ""}`}
                  >
                    <Icon size={18} strokeWidth={1.7} aria-hidden /> {label}
                  </Link>
                );
              })}
            </nav>
            {footer && (
              <Link className={styles.sideFoot} href={footer.href}>
                {footer.label} <ArrowUpRight size={13} aria-hidden />
              </Link>
            )}
          </div>
          <main className={styles.content}>{children}</main>
        </div>
      </div>
    </div>
  );
}
