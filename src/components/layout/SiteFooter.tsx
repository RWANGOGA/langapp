"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLanguage } from "@/i18n/LanguageProvider";
import styles from "./SiteFooter.module.css";

const LINKS = [
  { href: "/features", key: "nav.features" },
  { href: "/pricing", key: "nav.pricing" },
  { href: "/tutors", key: "nav.tutors" },
  { href: "/testimonials", key: "nav.testimonials" },
  { href: "/resources", key: "nav.resources" },
  { href: "/blog", key: "nav.blog" },
];

const LEGAL = [
  { href: "/terms", key: "footer.terms" },
  { href: "/privacy", key: "footer.privacy" },
  { href: "/contact", key: "footer.contact" },
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
  const { t } = useLanguage();

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

          <nav className={styles.links} aria-label={t("a11y.footerNav")}>
            {LINKS.map((l) => (
              <Link key={l.href} href={l.href} className={styles.link}>
                {t(l.key)}
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
          <p>{t("footer.rights", { year: new Date().getFullYear() })}</p>
          <div className={styles.legal}>
            {LEGAL.map((l) => (
              <Link key={l.href} href={l.href}>{t(l.key)}</Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
