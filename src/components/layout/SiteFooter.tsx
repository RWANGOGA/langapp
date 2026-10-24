"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./SiteFooter.module.css";

const LINKS = [
  { href: "/features", label: "Features" },
  { href: "/pricing", label: "Pricing" },
  { href: "/tutors", label: "Tutors" },
  { href: "/resources", label: "Resources" },
  { href: "/blog", label: "Blog" },
];

const SOCIAL = [
  { href: "https://twitter.com", label: "Twitter", icon: "𝕏" },
  { href: "https://linkedin.com", label: "LinkedIn", icon: "in" },
  { href: "https://facebook.com", label: "Facebook", icon: "f" },
];

/** Paths where the site footer should NOT render (portals with their own shell). */
const PORTAL_PREFIXES = ["/dashboard", "/tutor", "/admin"];

export default function SiteFooter() {
  const pathname = usePathname();

  // Don't render on portal pages
  // Segment match so the public /tutors pages keep the footer.
  if (PORTAL_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"))) return null;

  return (
    <footer className={styles.footer} role="contentinfo">
      <div className={styles.inner}>
        {/* Top row */}
        <div className={styles.top}>
          <Link href="/" className={styles.brand} aria-label="Nile Language Home">
            <svg
              width="32"
              height="28"
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
            <span>Nile Language</span>
          </Link>

          <nav className={styles.links} aria-label="Footer navigation">
            {LINKS.map((l) => (
              <Link key={l.href} href={l.href} className={styles.link}>
                {l.label}
              </Link>
            ))}
          </nav>

          <div className={styles.socials} role="list" aria-label="Social media">
            {SOCIAL.map((s) => (
              <a
                key={s.label}
                href={s.href}
                className={styles.social}
                aria-label={s.label}
                target="_blank"
                rel="noopener noreferrer"
              >
                {s.icon}
              </a>
            ))}
          </div>
        </div>

        {/* Divider */}
        <hr className={styles.rule} />

        {/* Bottom row */}
        <div className={styles.bottom}>
          <p>© {new Date().getFullYear()} Nile Language. All rights reserved.</p>
          <div className={styles.legal}>
            <Link href="/terms">Terms</Link>
            <Link href="/privacy">Privacy</Link>
            <Link href="/contact">Contact</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
