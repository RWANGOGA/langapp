import Image from "next/image";
import Link from "next/link";
import { BadgeCheck, CalendarDays, PlayCircle, Star, Users } from "lucide-react";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import styles from "./page.module.css";

const NAV = ["Home", "Features", "Pricing", "Resources", "Blog"];

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

export default function HomePage() {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link href="/" className={styles.brand}>
          <Logo />
          <span>LinguaBridge</span>
        </Link>
        <nav className={styles.nav} aria-label="Main">
          {NAV.map((n, i) => (
            <Link key={n} href={i === 0 ? "/" : `/${n.toLowerCase()}`} className={i === 0 ? styles.active : undefined}>
              {n}
            </Link>
          ))}
        </nav>
        <nav className={styles.portals} aria-label="Portals">
          {PORTALS.map((p) => (
            <Link key={p.href} href={p.href} className={styles.portalLink}>
              {p.label}
            </Link>
          ))}
        </nav>
        <div className={styles.actions}>
          <Link href="/tutor" className={`${styles.btn} ${styles.solid} ${styles.small}`}>Get Started</Link>
          <LanguageSwitcher />
        </div>
      </header>

      <section className={styles.hero}>
        <div className={styles.art}>
          <Image src="/images/image.png" alt="Tutor Sarah on a video lesson with learners Aiko and Bao" width={1055} height={945} priority />
        </div>

        <div className={styles.copy}>
          <h1>Master Fluent English with Dedicated 1-on-1 Tutors</h1>
          <p>
            Personalized online lessons tailored for learners in Japan and Vietnam. Reach your
            fluency goals faster with native experts.
          </p>
          <div className={styles.cta}>
            <Link href="/tutor" className={`${styles.btn} ${styles.solid}`}>Start Learning Today</Link>
            <Link href="/tutors" className={`${styles.btn} ${styles.outline}`}>Become a Tutor</Link>
          </div>
          <ul className={styles.trust}>
            <li>
              <BadgeCheck size={44} strokeWidth={1.6} className={styles.tealIcon} />
              <div><small>Accredited by</small><strong className={styles.efec}>EFEC</strong></div>
            </li>
            <li>
              <Star size={40} strokeWidth={1.5} className={styles.tealIcon} />
              <div>
                <strong className={styles.rate}>4.9 <Star size={20} fill="#f5b301" stroke="#f5b301" /> Rating</strong>
                <small>from 2000+ Reviews</small>
              </div>
            </li>
            <li>
              <BadgeCheck size={40} strokeWidth={1.5} className={styles.tealIcon} />
              <div><strong className={styles.rate}>100%</strong><small>Certified Tutors</small></div>
            </li>
          </ul>
        </div>
      </section>

      <section className={styles.features} aria-label="Highlights">
        <div><Users size={30} strokeWidth={1.6} /><span>Personalized Lessons</span></div>
        <div><CalendarDays size={30} strokeWidth={1.6} /><span>Flexible Scheduling</span></div>
        <div><PlayCircle size={30} strokeWidth={1.6} /><span>Trial Session Available</span></div>
      </section>
    </main>
  );
}
