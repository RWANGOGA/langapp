"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import BackLink from "@/components/layout/BackLink";
import { useLanguage } from "@/i18n/LanguageProvider";
import styles from "./applicant.module.css";

/**
 * Frame shared by the applicant-facing pages (/tutor/requirements and
 * /tutor/apply). Someone applying is still a student account, so they have no
 * tutor portal to be framed inside - but the page must look like the place
 * they are trying to join.
 */
export default function ApplicantFrame({
  signedIn = false,
  children,
}: {
  signedIn?: boolean;
  children: ReactNode;
}) {
  const { t } = useLanguage();

  return (
    <div className={styles.page}>
      <header className={styles.bar}>
        <Link href="/" className={styles.brand}>
          <svg width="30" height="30" viewBox="0 0 38 38" fill="none" strokeWidth="2.4" aria-hidden>
            <circle cx="17" cy="19" r="13" stroke="#3fb8ad" />
            <path d="M4 19h26M17 6c-6 6-6 20 0 26M17 6c6 6 6 20 0 26" stroke="#3fb8ad" />
            <circle cx="31" cy="11" r="4" fill="#f2541b" stroke="none" />
          </svg>
          <span>Nile Language</span>
        </Link>
        <nav className={styles.nav} aria-label={t("frame.mainNav")}>
          <Link href="/tutors" className={styles.navLink}>
            {t("frame.findTutor")}
          </Link>
          {signedIn ? (
            <Link href="/dashboard" className={styles.navLink}>
              {t("frame.myDashboard")}
            </Link>
          ) : (
            <Link href="/auth/login" className={styles.navLink}>
              {t("frame.signIn")}
            </Link>
          )}
        </nav>
      </header>
      <main className={styles.wrap}>
        <div className={styles.backRow}>
          <BackLink fallback="/tutors" />
        </div>
        {children}
      </main>
    </div>
  );
}
