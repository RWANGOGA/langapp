"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, LayoutDashboard, TrendingUp, Users } from "lucide-react";
import styles from "./dashboard.module.css";

// One navigation surface only: the sidebar. The header stays for identity,
// not for a second copy of the same links.
const SIDE = [
  { href: "/dashboard", label: "Dashboard", Icon: LayoutDashboard },
  { href: "/dashboard/tutors", label: "My Tutor", Icon: Users },
  { href: "/dashboard/progress", label: "Progress", Icon: TrendingUp },
  { href: "/dashboard/notifications", label: "Notifications", Icon: Bell },
];

const isActive = (path: string, href: string) => (href === "/dashboard" ? path === href : path.startsWith(href));

export function SideNav() {
  const path = usePathname();
  return (
    <nav className={styles.sideNav} aria-label="Learner">
      {SIDE.map(({ href, label, Icon }) => (
        <Link key={href} href={href} aria-current={isActive(path, href) ? "page" : undefined}
          className={`${styles.sideLink} ${isActive(path, href) ? styles.active : ""}`}>
          <Icon size={18} strokeWidth={1.7} aria-hidden /> {label}
        </Link>
      ))}
    </nav>
  );
}
