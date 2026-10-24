import type { ReactNode } from "react";
import Link from "next/link";
import styles from "./marketing.module.css";

/**
 * Editorial section primitives shared by the public marketing pages.
 * Server components only - the FAQ uses native <details>, so nothing
 * ships JavaScript to the browser.
 */

export function PageShell({ children }: { children: ReactNode }) {
  return <main className={styles.page}>{children}</main>;
}

export function Hero({
  kicker,
  title,
  lede,
  ctas,
}: {
  kicker: string;
  title: string;
  lede: string;
  ctas?: { href: string; label: string; primary?: boolean }[];
}) {
  return (
    <div className={styles.container}>
      <section className={styles.hero}>
        <p className={styles.kicker}>{kicker}</p>
        <h1 className={styles.display}>{title}</h1>
        <p className={styles.lede}>{lede}</p>
        {ctas && ctas.length > 0 && (
          <div className={styles.heroCtas}>
            {ctas.map((c) => (
              <Link key={c.href + c.label} href={c.href} className={c.primary ? styles.btnPrimary : styles.btnGhost}>
                {c.label}
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export function Section({
  kicker,
  title,
  lede,
  children,
  bare,
}: {
  kicker?: string;
  title?: string;
  lede?: string;
  children?: ReactNode;
  bare?: boolean;
}) {
  return (
    <div className={styles.container}>
      <section className={styles.section}>
        {!bare && (kicker || title) && (
          <div className={styles.sectionHead}>
            {kicker && <p className={styles.kicker}>{kicker}</p>}
            {title && <h2 className={styles.sectionTitle}>{title}</h2>}
            {lede && <p className={styles.sectionLede}>{lede}</p>}
          </div>
        )}
        {children}
      </section>
    </div>
  );
}

export function Steps({ items }: { items: { num: string; title: string; body: string }[] }) {
  return (
    <div className={styles.steps}>
      {items.map((s) => (
        <div key={s.num} className={styles.step}>
          <div className={styles.stepNum}>{s.num}</div>
          <h3 className={styles.stepTitle}>{s.title}</h3>
          <p className={styles.stepBody}>{s.body}</p>
        </div>
      ))}
    </div>
  );
}

export function FeatureRows({ items }: { items: { label: string; title: string; body: string }[] }) {
  return (
    <div className={styles.rows}>
      {items.map((r) => (
        <div key={r.label} className={styles.row}>
          <div className={styles.rowLabel}>{r.label}</div>
          <div>
            <h3 className={styles.rowTitle}>{r.title}</h3>
            <p className={styles.rowBody}>{r.body}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

export function ProofBand({ stats }: { stats: { value: string; label: string }[] }) {
  return (
    <div className={styles.proof}>
      <div className={styles.container}>
        <div className={styles.proofGrid}>
          {stats.map((s) => (
            <div key={s.label}>
              <div className={styles.proofValue}>{s.value}</div>
              <div className={styles.proofLabel}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function Faq({ items }: { items: { q: string; a: string }[] }) {
  return (
    <div className={styles.faq}>
      {items.map((f) => (
        <details key={f.q} className={styles.faqItem}>
          <summary>{f.q}</summary>
          <p className={styles.faqBody}>{f.a}</p>
        </details>
      ))}
    </div>
  );
}

export function CtaBand({
  title,
  body,
  ctas,
}: {
  title: string;
  body: string;
  ctas: { href: string; label: string; primary?: boolean }[];
}) {
  return (
    <div className={styles.cta}>
      <div className={styles.container}>
        <h2 className={styles.ctaTitle}>{title}</h2>
        <p className={styles.ctaBody}>{body}</p>
        <div className={styles.ctaCtas}>
          {ctas.map((c) => (
            <Link key={c.href + c.label} href={c.href} className={c.primary ? styles.btnPrimary : styles.btnGhost}>
              {c.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
