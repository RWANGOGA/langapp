"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { useLanguage } from "@/i18n/LanguageProvider";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import styles from "./SiteHeader.module.css";

const NAV = [
  { href: "/", key: "nav.home" },
  { href: "/features", key: "nav.features" },
  { href: "/pricing", key: "nav.pricing" },
  { href: "/tutors", key: "nav.tutors" },
  { href: "/resources", key: "nav.resources" },
  { href: "/blog", key: "nav.blog" },
];

const PORTALS = [
  { href: "/tutor", key: "nav.tutorPortal" },
  { href: "/admin", key: "nav.admin" },
];

function Logo() {
  return (
    <svg
      width="42"
      height="36"
      viewBox="0 0 46 40"
      fill="none"
      strokeWidth="2.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path
        d="M4 6a4 4 0 0 1 4-4h16a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4h-8l-6 5v-5H8a4 4 0 0 1-4-4z"
        stroke="#f2541b"
      />
      <path
        d="M20 17a4 4 0 0 1 4-4h14a4 4 0 0 1 4 4v9a4 4 0 0 1-4 4h-2v5l-6-5h-6a4 4 0 0 1-4-4z"
        stroke="#3fb8ad"
      />
    </svg>
  );
}

/** Paths where the site header should NOT render (portals with their own shell). */
const PORTAL_PREFIXES = ["/dashboard", "/tutor", "/admin"];

export default function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, isAuthenticated, isLoading, isTutor, isAdmin } = useAuth();
  const { t } = useLanguage();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close mobile nav on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Don't render on portal pages (segment match: /tutors is public marketing).
  if (PORTAL_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"))) return null;

  const handleLogout = async () => {
    await logout();
    router.push("/");
  };

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        {/* Brand */}
        <Link href="/" className={styles.brand}>
          <Logo />
          <span>Nile Language</span>
        </Link>

        {/* Desktop nav */}
        <nav className={styles.nav} aria-label={t("a11y.mainNav")}>
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={`${styles.navLink} ${isActive(n.href) ? styles.active : ""}`}
            >
              {t(n.key)}
            </Link>
          ))}
        </nav>

        {/* Portal links (role gated) */}
        {isAuthenticated && (isTutor || isAdmin) && (
          <nav className={styles.portals} aria-label={t("a11y.portals")}>
            {PORTALS.map((p) => (
              <Link key={p.href} href={p.href} className={styles.portalLink}>
                {t(p.key)}
              </Link>
            ))}
          </nav>
        )}

        {/* Actions */}
        <div className={styles.actions}>
          <LanguageSwitcher variant="dark" />
          {isLoading ? (
            <span className={styles.loading}>{t("actions.loading")}</span>
          ) : isAuthenticated ? (
            <>
              {user?.avatar_url && (
                <Image
                  src={user.avatar_url}
                  alt={user.full_name}
                  className={styles.avatar}
                  width={34}
                  height={34}
                />
              )}
              <span className={styles.welcome}>
                {user?.full_name?.split(" ")[0]}
              </span>
              <button
                onClick={handleLogout}
                className={`${styles.btn} ${styles.outline}`}
              >
                {t("actions.logout")}
              </button>
            </>
          ) : (
            <>
              <Link
                href="/auth/login"
                className={`${styles.btn} ${styles.outline}`}
              >
                {t("actions.signIn")}
              </Link>
              <Link
                href="/auth/register"
                className={`${styles.btn} ${styles.solid}`}
              >
                {t("actions.getStarted")}
              </Link>
            </>
          )}
        </div>

        {/* Mobile menu toggle */}
        <button
          type="button"
          className={styles.burger}
          onClick={() => setMobileOpen((v) => !v)}
          aria-label={mobileOpen ? t("a11y.closeMenu") : t("a11y.openMenu")}
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <nav className={styles.drawer} aria-label={t("a11y.mobileNav")}>
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={`${styles.drawerLink} ${isActive(n.href) ? styles.active : ""}`}
            >
              {t(n.key)}
            </Link>
          ))}

          {isAuthenticated && (isTutor || isAdmin) && (
            <div className={styles.drawerDivider} />
          )}
          {isAuthenticated && (isTutor || isAdmin) &&
            PORTALS.map((p) => (
              <Link key={p.href} href={p.href} className={styles.drawerLink}>
                {t(p.key)}
              </Link>
            ))}

          <div className={styles.drawerDivider} />

          <div className={styles.drawerLang}>
            <LanguageSwitcher variant="dark" />
          </div>
          <div className={styles.drawerDivider} />

          <div className={styles.drawerActions}>
            {isLoading ? (
              <span className={styles.loading}>{t("actions.loading")}</span>
            ) : isAuthenticated ? (
              <button
                onClick={handleLogout}
                className={`${styles.btn} ${styles.outline} ${styles.full}`}
              >
                {t("actions.logout")}
              </button>
            ) : (
              <>
                <Link
                  href="/auth/login"
                  className={`${styles.btn} ${styles.outline} ${styles.full}`}
                >
                  {t("actions.signIn")}
                </Link>
                <Link
                  href="/auth/register"
                  className={`${styles.btn} ${styles.solid} ${styles.full}`}
                >
                  {t("actions.getStarted")}
                </Link>
              </>
            )}
          </div>
        </nav>
      )}
    </header>
  );
}
