"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { type DirectoryTutor } from "@/lib/tutors-data";
import { useLanguage } from "@/i18n/LanguageProvider";
import styles from "./page.module.css";

type Sort = "rating" | "reviews" | "experience";

export default function TutorDirectory({ tutors }: { tutors: DirectoryTutor[] }) {
  const { t } = useLanguage();
  const [query, setQuery] = useState("");
  const [specialty, setSpecialty] = useState<string>("All");
  const [language, setLanguage] = useState("Any");
  const [sort, setSort] = useState<Sort>("rating");

  // Both filters offer exactly the values the tutors actually listed. A fixed
  // vocabulary here - "IELTS" against an applicant's "IELTS Prep" - could
  // never match, so the control looked broken on a page with real data.
  const goals = useMemo(() => Array.from(new Set(tutors.flatMap((t) => t.specialties))).sort(), [tutors]);
  const languages = useMemo(() => Array.from(new Set(tutors.flatMap((t) => t.speaks))).sort(), [tutors]);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tutors
      .filter((t) => !q || t.name.toLowerCase().includes(q) || t.headline.toLowerCase().includes(q))
      .filter((t) => specialty === "All" || t.specialties.includes(specialty))
      .filter((t) => language === "Any" || t.speaks.includes(language))
      .sort((a, b) => (sort === "rating" ? b.rating - a.rating : sort === "reviews" ? b.reviews - a.reviews : b.years - a.years));
  }, [tutors, query, specialty, language, sort]);

  if (tutors.length === 0) {
    return (
      <div className={styles.wrap}>
        <p className={styles.empty}>
          <strong>{t("tutors.empty.title")}</strong>
          {t("tutors.empty.body")}
        </p>
      </div>
    );
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.filters} role="search">
        <label className={styles.search}>
          <Search size={18} aria-hidden />
          <input type="search" placeholder={t("tutors.search.placeholder")} value={query} onChange={(e) => setQuery(e.target.value)} aria-label={t("tutors.search.aria")} />
        </label>
        <label className={styles.field}>
          <span>{t("tutors.filter.goal")}</span>
          <select value={specialty} onChange={(e) => setSpecialty(e.target.value)} aria-label={t("tutors.filter.goal")}>
            <option value="All">{t("tutors.filter.all")}</option>
            {goals.map((s) => <option key={s}>{s}</option>)}
          </select>
        </label>
        <label className={styles.field}>
          <span>{t("tutors.filter.language")}</span>
          <select value={language} onChange={(e) => setLanguage(e.target.value)} aria-label={t("tutors.filter.language")}>
            <option value="Any">{t("tutors.filter.any")}</option>
            {languages.map((l) => <option key={l}>{l}</option>)}
          </select>
        </label>
        <label className={styles.field}>
          <span>{t("tutors.filter.order")}</span>
          <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} aria-label={t("tutors.filter.order")}>
            <option value="rating">{t("tutors.sort.rating")}</option>
            <option value="reviews">{t("tutors.sort.reviews")}</option>
            <option value="experience">{t("tutors.sort.experience")}</option>
          </select>
        </label>
      </div>

      <p className={styles.count} aria-live="polite">{t("tutors.count", { shown: list.length, total: tutors.length })}</p>

      <ul className={styles.roster}>
        {list.map((tutor) => (
          <li key={tutor.id} className={styles.tutor}>
            <div>
              <h2>{tutor.name}</h2>
              {tutor.specialties.length > 0 && <span className={styles.goals}>{tutor.specialties.join(" · ")}</span>}
              <p className={styles.headline}>{tutor.headline}</p>
              <p className={styles.meta}>
                {tutor.reviews > 0 ? (
                  <><strong>{tutor.rating.toFixed(1)}</strong> {t(tutor.reviews === 1 ? "tutors.fromReviewsOne" : "tutors.fromReviewsOther", { n: tutor.reviews })}</>
                ) : (
                  <>{t("tutors.newlyApproved")}</>
                )}
                <span>{t("tutors.yrsTeaching", { n: tutor.years })}</span>
                {tutor.country && <span>{tutor.country}</span>}
                <span>{t("tutors.speaks", { langs: tutor.speaks.join(", ") || t("tutors.defaultLang") })}</span>
              </p>
            </div>
            <div className={styles.side}>
              <Link href={`/tutors/${tutor.id}`} className={styles.actionGhost}>{t("tutors.viewProfile")}</Link>
              <Link href={`/auth/register?role=learner&tutor=${tutor.id}`} className={styles.actionPrimary}>{t("tutors.startTrial")}</Link>
            </div>
          </li>
        ))}
      </ul>
      {list.length === 0 && (
        <p className={styles.notice}>
          <strong>{t("tutors.noMatch.title")}</strong>
          {t("tutors.noMatch.body")}
        </p>
      )}
    </div>
  );
}
