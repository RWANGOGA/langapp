"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import styles from "./Navbar.module.css";

const NAV = ["Features", "Pricing", "Resources", "Blog"];

const PORTALS = [
  { href: "/tutor", label: "Tutor" },
  { href: "/admin", label: "Admin" },
];

function Logo() {
  return (
    <svg width="46" height="40" viewBox="0 0 46 40" fill="none" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 6a4 4 0 0 1 4-4h16a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4h-8l-6 5v-5H8a4 4 0 0 1-4-4z" stroke="#f2541b" />
      <path d="M20 17a4 4 0 0 1 4-4h14a4 4 0 0 1 4 4v9a4 4 0 0 1-4 4h-2v5l-6-5h-6a4 4 0 0 1-4-4z" stroke="#3fb8ad" />
    </svg>
  );
}

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, isAuthenticated, isLoading, isTutor, isAdmin } = useAuth();

  const handleLogout = async () => {
    await logout();
    router.push("/");
  };

  return (
    <header className={styles.header}>
      <Link href="/" className={styles.brand}>
        <Logo />
        <span>LinguaBridge</span>
      </Link>

      <nav className={styles.nav} aria-label="Main">
        {NAV.map((n) => (
          <Link
            key={n}
            href={`/${n.toLowerCase()}`}
            className={pathname === `/${n.toLowerCase()}` ? styles.active : undefined}
          >
            {n}
          </Link>
        ))}
      </nav>

      {isAuthenticated && (isTutor || isAdmin) && (
        <nav className={styles.portals} aria-label="Portals">
          {PORTALS.map((p) => (
            <Link key={p.href} href={p.href} className={styles.portalLink}>
              {p.label}
            </Link>
          ))}
        </nav>
      )}

      <div className={styles.actions}>
        {isLoading ? (
          <div className={styles.loading}>Loading...</div>
        ) : isAuthenticated ? (
          <>
            {user?.avatar_url && (
              <Image src={user.avatar_url} alt={user.full_name} className={styles.avatar} width={36} height={36} />
            )}
            <button onClick={handleLogout} className={`${styles.btn} ${styles.outline} ${styles.small}`}>
              Logout
            </button>
          </>
        ) : (
          <>
            <Link href="/auth/login" className={`${styles.btn} ${styles.outline} ${styles.small}`}>Sign In</Link>
            <Link href="/auth/register" className={`${styles.btn} ${styles.solid} ${styles.small}`}>Get Started</Link>
          </>
        )}
        <LanguageSwitcher />
      </div>
    </header>
  );
}

export { Logo };