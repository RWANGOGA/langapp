"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Search, Star } from "lucide-react";
import { SPECIALTIES, type DirectoryTutor, type Specialty } from "@/lib/tutors-data";
import styles from "./page.module.css";

type Sort = "rating" | "reviews" | "experience";
const initials = (n: string) => n.split(" ").map((w) => w[0]).join("").slice(0, 2);

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

  return (
    <section className={styles.wrap}>
      <div className={styles.filters} role="search">
        <label className={styles.search}>
          <Search size={18} aria-hidden />
          <input type="search" placeholder="Search tutors" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search tutors" />
        </label>
        <select value={specialty} onChange={(e) => setSpecialty(e.target.value as Specialty | "All")} aria-label="Specialty">
          <option value="All">All goals</option>
          {SPECIALTIES.map((s) => <option key={s}>{s}</option>)}
        </select>
        <select value={language} onChange={(e) => setLanguage(e.target.value)} aria-label="Also speaks">
          <option value="Any">Any language</option>
          {languages.map((l) => <option key={l}>{l}</option>)}
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} aria-label="Sort by">
          <option value="rating">Top rated</option>
          <option value="reviews">Most reviews</option>
          <option value="experience">Most experienced</option>
        </select>
      </div>

      <p className={styles.count} aria-live="polite">Showing {list.length} of {tutors.length} tutors</p>

      <ul className={styles.grid}>
        {list.map((t, i) => (
          <li key={t.id} className={styles.card}>
            <span className={styles.avatar} data-tone={i % 4} aria-hidden>{initials(t.name)}</span>
            <h2>{t.name}</h2>
            <p className={styles.headline}>{t.headline}</p>
            <p className={styles.meta}>
              <Star size={15} fill="#f5b301" stroke="#f5b301" aria-hidden /> <strong>{t.rating.toFixed(1)}</strong> · {t.reviews} reviews · {t.years} yrs · {t.country}
            </p>
            <p className={styles.speaks}>Speaks: {t.speaks.join(", ")}</p>
            <ul className={styles.tags}>{t.specialties.map((s) => <li key={s}>{s}</li>)}</ul>
            <div className={styles.actions}>
              <Link href={`/register?role=learner&tutor=${t.id}`} className={styles.primary}>Book trial</Link>
              <Link href={`/tutors/${t.id}`} className={styles.ghost}>View profile</Link>
            </div>
          </li>
        ))}
      </ul>
      {list.length === 0 && <p className={styles.empty}>No tutors match those filters. Try clearing one.</p>}
    </section>
  );
}