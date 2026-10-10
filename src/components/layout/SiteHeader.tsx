"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import styles from "./SiteHeader.module.css";

const NAV = [
  { href: "/", label: "Home" },
  { href: "/features", label: "Features" },
  { href: "/pricing", label: "Pricing" },
  { href: "/tutors", label: "Tutors" },
  { href: "/resources", label: "Resources" },
  { href: "/blog", label: "Blog" },
];

const PORTALS = [
  { href: "/tutor", label: "Tutor Portal" },
  { href: "/admin", label: "Admin" },
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
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close mobile nav on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Don't render on portal pages
  if (PORTAL_PREFIXES.some((p) => pathname.startsWith(p))) return null;

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
        <nav className={styles.nav} aria-label="Main">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={`${styles.navLink} ${isActive(n.href) ? styles.active : ""}`}
            >
              {n.label}
            </Link>
          ))}
        </nav>

        {/* Portal links (role gated) */}
        {isAuthenticated && (isTutor || isAdmin) && (
          <nav className={styles.portals} aria-label="Portals">
            {PORTALS.map((p) => (
              <Link key={p.href} href={p.href} className={styles.portalLink}>
                {p.label}
              </Link>
            ))}
          </nav>
        )}

        {/* Actions */}
        <div className={styles.actions}>
          {isLoading ? (
            <span className={styles.loading}>Loading…</span>
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
                Logout
              </button>
            </>
          ) : (
            <>
              <Link
                href="/auth/login"
                className={`${styles.btn} ${styles.outline}`}
              >
                Sign In
              </Link>
              <Link
                href="/auth/register"
                className={`${styles.btn} ${styles.solid}`}
              >
                Get Started
              </Link>
            </>
          )}
          <LanguageSwitcher />
        </div>

        {/* Mobile menu toggle */}
        <button
          type="button"
          className={styles.burger}
          onClick={() => setMobileOpen((v) => !v)}
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <nav className={styles.drawer} aria-label="Mobile navigation">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={`${styles.drawerLink} ${isActive(n.href) ? styles.active : ""}`}
            >
              {n.label}
            </Link>
          ))}

          {isAuthenticated && (isTutor || isAdmin) && (
            <div className={styles.drawerDivider} />
          )}
          {isAuthenticated && (isTutor || isAdmin) &&
            PORTALS.map((p) => (
              <Link key={p.href} href={p.href} className={styles.drawerLink}>
                {p.label}
              </Link>
            ))}

          <div className={styles.drawerDivider} />

          <div className={styles.drawerActions}>
            {isLoading ? (
              <span className={styles.loading}>Loading…</span>
            ) : isAuthenticated ? (
              <button
                onClick={handleLogout}
                className={`${styles.btn} ${styles.outline} ${styles.full}`}
              >
                Logout
              </button>
            ) : (
              <>
                <Link
                  href="/auth/login"
                  className={`${styles.btn} ${styles.outline} ${styles.full}`}
                >
                  Sign In
                </Link>
                <Link
                  href="/auth/register"
                  className={`${styles.btn} ${styles.solid} ${styles.full}`}
                >
                  Get Started
                </Link>
              </>
            )}
          </div>
        </nav>
      )}
    </header>
  );
}
