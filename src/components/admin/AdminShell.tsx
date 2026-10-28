"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowUpRight, Bell, Menu, X } from "lucide-react";
import { ICONS, type PortalNavItem } from "@/components/portal/navIcons";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import BackLink from "@/components/layout/BackLink";
import { useLanguage } from "@/i18n/LanguageProvider";
import styles from "./adminshell.module.css";

/* The admin console, dressed in the MIT language: a black utility bar for
   identity, a compact ruled rail for navigation, and a tokenized content area
   that inherits the shared bands. Distinct from the tutor and learner portals
   by chrome, type and colour - not by a different set of links. */
export default function AdminShell({
  adminName,
  unread,
  children,
}: {
  /** Falls back to the account kind rather than inventing a person. */
  adminName?: string;
  unread: number;
  children: React.ReactNode;
}) {
  const { t } = useLanguage();
  const path = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  // Close the slide-down menu whenever the route changes. Adjusting during
  // render (rather than in an effect) avoids a cascading re-render.
  const [lastPath, setLastPath] = useState(path);
  if (lastPath !== path) {
    setLastPath(path);
    setMenuOpen(false);
  }

  const NAV: PortalNavItem[] = [
    { href: "/admin", label: t("nav.overview"), icon: "dashboard" },
    { href: "/admin/applications", label: t("nav.applications"), icon: "applications" },
    { href: "/admin/messages", label: t("nav.messages"), icon: "messages" },
    { href: "/admin/tutors", label: t("nav.tutors"), icon: "tutors" },
    { href: "/admin/students", label: t("nav.students"), icon: "students" },
    { href: "/admin/classes", label: t("nav.classes"), icon: "classes" },
    { href: "/admin/meetings", label: t("nav.meetings"), icon: "meetings" },
    { href: "/admin/payments", label: t("nav.payments"), icon: "payments" },
    { href: "/admin/subscriptions", label: t("nav.subscriptions"), icon: "subscriptions" },
    { href: "/admin/reports", label: t("nav.reports"), icon: "reports" },
    { href: "/admin/settings", label: t("nav.settings"), icon: "settings" },
    { href: "/admin/notifications", label: t("nav.notifications"), icon: "notifications" },
  ];

  const isActive = (href: string) => (href === "/admin" ? path === href : path.startsWith(href));
  const name = adminName || t("portal.administrator");

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  const bell = (
    <Link href="/admin/notifications" className={styles.bell} aria-label={t("portal.notificationsAria", { unread })}>
      <Bell size={19} aria-hidden />
      {unread > 0 && <span className={styles.badge}>{unread}</span>}
    </Link>
  );

  return (
    <div className={styles.page} data-portal="admin">
      <header className={styles.utility}>
        <button
          type="button"
          className={styles.menuBtn}
          onClick={() => setMenuOpen((o) => !o)}
          aria-expanded={menuOpen}
          aria-controls="admin-nav-panel"
          aria-label={menuOpen ? t("portal.closeMenu") : t("portal.openMenu")}
        >
          {menuOpen ? <X size={20} aria-hidden /> : <Menu size={20} aria-hidden />}
        </button>
        <span className={styles.mark} aria-hidden>NL</span>
        <Link href="/admin" className={styles.wordmark}>
          Nile Language
          <small>{t("portal.admin")}</small>
        </Link>
        <div className={styles.utilRight}>
          <div className={styles.langSlot}>
            <LanguageSwitcher variant="light" />
          </div>
          <div className={styles.who}>
            <strong>{name}</strong>
            <small>{t("portal.administration")}</small>
          </div>
          {bell}
        </div>
      </header>

      {menuOpen && (
        <nav className={styles.menuPanel} id="admin-nav-panel" aria-label={t("portal.aria.admin")}>
          {NAV.map(({ href, label, icon }) => {
            const Icon = ICONS[icon];
            const active = isActive(href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`${styles.menuLink} ${active ? styles.menuLinkOn : ""}`}
              >
                <Icon size={17} strokeWidth={1.8} aria-hidden /> {label}
              </Link>
            );
          })}
        </nav>
      )}

      <div className={styles.body}>
        <aside className={styles.rail}>
          <Link className={styles.return} href="/">
            <ArrowUpRight size={14} aria-hidden /> {t("portal.backToSite")}
          </Link>
          <nav className={styles.nav} aria-label={t("portal.aria.admin")}>
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
        </aside>
        <main className={styles.content}>
          <div className={styles.backRow}>
            <BackLink fallback="/admin" />
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}
