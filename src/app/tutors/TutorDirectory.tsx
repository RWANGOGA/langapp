"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { SPECIALTIES, type DirectoryTutor, type Specialty } from "@/lib/tutors-data";
import styles from "./page.module.css";

type Sort = "rating" | "reviews" | "experience";

export default function TutorDirectory({ tutors }: { tutors: DirectoryTutor[] }) {
  const [query, setQuery] = useState("");
  const [specialty, setSpecialty] = useState<Specialty | "All">("All");
  const [language, setLanguage] = useState("Any");
  const [sort, setSort] = useState<Sort>("rating");

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
          <strong>The faculty list is empty right now.</strong>
          Tutors appear here the moment staff approve their application — identity,
          credentials, tested English and an observed demo lesson. We would rather
          show you an honest list than a decorated one.
        </p>
      </div>
    );
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.filters} role="search">
        <label className={styles.search}>
          <Search size={18} aria-hidden />
          <input type="search" placeholder="Search by name or focus" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search tutors" />
        </label>
        <label className={styles.field}>
          <span>Goal</span>
          <select value={specialty} onChange={(e) => setSpecialty(e.target.value as Specialty | "All")} aria-label="Specialty">
            <option value="All">All</option>
            {SPECIALTIES.map((s) => <option key={s}>{s}</option>)}
          </select>
        </label>
        <label className={styles.field}>
          <span>Language support</span>
          <select value={language} onChange={(e) => setLanguage(e.target.value)} aria-label="Also speaks">
            <option value="Any">Any</option>
            {languages.map((l) => <option key={l}>{l}</option>)}
          </select>
        </label>
        <label className={styles.field}>
          <span>Order by</span>
          <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} aria-label="Sort by">
            <option value="rating">Highest rated</option>
            <option value="reviews">Most reviewed</option>
            <option value="experience">Most experienced</option>
          </select>
        </label>
      </div>

      <p className={styles.count} aria-live="polite">{list.length} of {tutors.length} tutors</p>

      <ul className={styles.roster}>
        {list.map((t) => (
          <li key={t.id} className={styles.tutor}>
            <div>
              <h2>{t.name}</h2>
              {t.specialties.length > 0 && <span className={styles.goals}>{t.specialties.join(" · ")}</span>}
              <p className={styles.headline}>{t.headline}</p>
              <p className={styles.meta}>
                {t.reviews > 0 ? (
                  <><strong>{t.rating.toFixed(1)}</strong> from {t.reviews} review{t.reviews === 1 ? "" : "s"}</>
                ) : (
                  <>Newly approved faculty</>
                )}
                <span>{t.years} yrs teaching</span>
                {t.country && <span>{t.country}</span>}
                <span>Speaks {t.speaks.join(", ") || "English"}</span>
              </p>
            </div>
            <div className={styles.side}>
              <Link href={`/tutors/${t.id}`} className={styles.actionGhost}>View profile</Link>
              <Link href={`/auth/register?role=learner&tutor=${t.id}`} className={styles.actionPrimary}>Start with a trial</Link>
            </div>
          </li>
        ))}
      </ul>
      {list.length === 0 && (
        <p className={styles.notice}>
          <strong>No tutor matches those filters.</strong>
          Widen the goal or language — or clear the search.
        </p>
      )}
    </div>
  );
}
