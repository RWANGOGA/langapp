"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, LayoutDashboard, NotebookPen, Settings, Users } from "lucide-react";
import styles from "./tutor.module.css";

const TOP = [
  { href: "/tutor", label: "Dashboard" },
  { href: "/tutor/learners", label: "Learners" },
  { href: "/tutor/schedule", label: "Schedule" },
  { href: "/tutor/resources", label: "Resources" },
];
const SIDE = [
  { href: "/tutor", label: "Dashboard", Icon: LayoutDashboard },
  { href: "/tutor/learners", label: "My Learners", Icon: Users },
  { href: "/tutor/schedule", label: "Schedule", Icon: CalendarDays },
  { href: "/tutor/notes", label: "Lesson Notes", Icon: NotebookPen },
  { href: "/tutor/settings", label: "Settings", Icon: Settings },
];

const isActive = (path: string, href: string) => (href === "/tutor" ? path === href : path.startsWith(href));

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
    <nav className={styles.sideNav} aria-label="Tutor">
      {SIDE.map(({ href, label, Icon }) => (
        <Link key={href} href={href} aria-current={isActive(path, href) ? "page" : undefined}
          className={`${styles.sideLink} ${isActive(path, href) ? styles.active : ""}`}>
          <Icon size={20} strokeWidth={1.7} aria-hidden /> {label}
        </Link>
      ))}
    </nav>
  );
}