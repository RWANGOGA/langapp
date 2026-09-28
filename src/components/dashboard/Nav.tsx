"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, LayoutDashboard, Settings, Users } from "lucide-react";
import styles from "./dashboard.module.css";

const TOP = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/courses", label: "Courses" },
  { href: "/resources", label: "Resources" },
  { href: "/progress", label: "My Progress" },
];
const SIDE = [
  { href: "/dashboard", label: "Dashboard", Icon: LayoutDashboard },
  { href: "/dashboard/tutors", label: "Tutors", Icon: Users },
  { href: "/dashboard/curriculum", label: "Curriculum", Icon: BookOpen },
  { href: "/dashboard/community", label: "Community", Icon: Users },
  { href: "/dashboard/settings", label: "Settings", Icon: Settings },
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