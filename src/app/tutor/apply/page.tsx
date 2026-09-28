import type { Metadata } from "next";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import ApplicationForm from "./ApplicationForm";
import styles from "./apply.module.css";

export const metadata: Metadata = { title: "Submit Your Tutor Application" };

const NAV = [["Dashboard", "/tutor"], ["Applications", "/tutor/apply"], ["My Students", "/tutor/learners"], ["Profile", "/tutor/profile"]] as const;

export default function ApplyPage() {
  return (
    <div className={styles.page}>
      <div className={styles.window}>
        <header className={styles.topbar}>
          <Link href="/tutor" className={styles.brand}>
            <svg width="34" height="34" viewBox="0 0 38 38" fill="none" strokeWidth="2.4" aria-hidden>
              <circle cx="17" cy="19" r="13" stroke="#3fb8ad" /><path d="M4 19h26M17 6c-6 6-6 20 0 26M17 6c6 6 6 20 0 26" stroke="#3fb8ad" /><circle cx="30" cy="9" r="4" fill="#f2541b" stroke="none" />
            </svg>
            EduGlobe Tutors
          </Link>
          <nav className={styles.nav} aria-label="Tutor">
            {NAV.map(([label, href]) => (
              <Link key={href} href={href} aria-current={href === "/tutor/apply" ? "page" : undefined} className={href === "/tutor/apply" ? styles.active : undefined}>{label}</Link>
            ))}
          </nav>
          <button type="button" className={styles.user}><span className={styles.avatar} aria-hidden>A</span> Alex R. <ChevronDown size={16} /></button>
        </header>
        <div className={styles.body}>
          <h1>Submit Your Tutor Application</h1>
          <p className={styles.lead}>Complete each step so we can verify your qualifications and match you with learners.</p>
          <ApplicationForm />
        </div>
      </div>
    </div>
  );
}