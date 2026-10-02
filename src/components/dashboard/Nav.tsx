"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, LayoutDashboard, TrendingUp, Users } from "lucide-react";
import styles from "./dashboard.module.css";

const TOP = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/tutors", label: "Find a Tutor" },
  { href: "/resources", label: "Resources" },
  { href: "/dashboard/progress", label: "My Progress" },
];
const SIDE = [
  { href: "/dashboard", label: "Dashboard", Icon: LayoutDashboard },
  { href: "/dashboard/tutors", label: "My Tutor", Icon: Users },
  { href: "/dashboard/progress", label: "Progress", Icon: TrendingUp },
  { href: "/dashboard/notifications", label: "Notifications", Icon: Bell },
];

const isActive = (path: string, href: string) => (href === "/dashboard" ? path === href : path.startsWith(href));

export function TopNav() {
  const path = usePathname();
  return (
    <nav className={styles.topNav} aria-label="Main">
      {TOP.map((l) => (
        <Link key={l.href} href={l.href} aria-current={isActive(path, l.href) ? "page" : undefined}
          className={`${styles.topLink} ${isActive(path, l.href) ? styles.active : ""}`}>
          {l.label}
        </Link>
      ))}
    </nav>
  );
}

export function SideNav() {
  const path = usePathname();
  return (
    <nav className={styles.sideNav} aria-label="Learner">
      {SIDE.map(({ href, label, Icon }) => (
        <Link key={href} href={href} aria-current={isActive(path, href) ? "page" : undefined}
          className={`${styles.sideLink} ${isActive(path, href) ? styles.active : ""}`}>
          <Icon size={20} strokeWidth={1.7} aria-hidden /> {label}
        </Link>
      ))}
    </nav>
  );
}