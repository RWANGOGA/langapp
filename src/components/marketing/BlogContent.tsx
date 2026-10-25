"use client";

import { CtaBand, Hero, PageShell, Section } from "@/components/marketing/Sections";
import { useLanguage } from "@/i18n/LanguageProvider";
import styles from "@/components/marketing/marketing.module.css";

export default function BlogContent() {
  const { t } = useLanguage();

  const notes = [
    { key: "1", title: t("blog.note.1.title"), body: t("blog.note.1.body"), meta: t("blog.note.1.meta") },
    { key: "2", title: t("blog.note.2.title"), body: t("blog.note.2.body"), meta: t("blog.note.2.meta") },
    { key: "3", title: t("blog.note.3.title"), body: t("blog.note.3.body"), meta: t("blog.note.3.meta") },
  ];

  return (
    <PageShell>
      <Hero
        kicker={t("blog.hero.kicker")}
        title={t("blog.hero.title")}
        lede={t("blog.hero.lede")}
      />

      <Section bare>
        <div className={styles.notes}>
          {notes.map((n) => (
            <article key={n.key} className={styles.note}>
              <h2 className={styles.noteTitle}>{n.title}</h2>
              <p className={styles.noteBody}>{n.body}</p>
              <div className={styles.noteMeta}>{n.meta}</div>
            </article>
          ))}
        </div>
      </Section>

      <CtaBand
        title={t("blog.cta.title")}
        body={t("blog.cta.body")}
        ctas={[
          { href: "/pricing", label: t("features.cta.choose"), primary: true },
          { href: "/resources", label: t("blog.cta.habits") },
        ]}
      />
    </PageShell>
  );
}
