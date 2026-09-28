"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, MoreHorizontal, Search, Star } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import type { Tutor, TutorStatus } from "@/lib/admin-data";
import styles from "./admin.module.css";

const STATUS_VARIANT: Record<TutorStatus, "teal" | "navy" | "coral"> = {
  Active: "teal",
  Assigned: "navy",
  Onboarding: "coral",
};

export default function TutorRoster({ tutors }: { tutors: Tutor[] }) {
  const [query, setQuery] = useState("");
  const [asc, setAsc] = useState(true);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tutors
      .filter((t) => !q || t.name.toLowerCase().includes(q) || t.email.toLowerCase().includes(q))
      .sort((a, b) => (asc ? 1 : -1) * a.name.localeCompare(b.name));
  }, [tutors, query, asc]);

  return (
    <Card className={styles.adminCard}>
      <div className={styles.cardHeader}>
        <h3>Tutor Roster</h3>
        <button type="button" className={styles.cardMenu} aria-label="Roster options"><MoreHorizontal size={20} /></button>
      </div>
      <label className={styles.searchWrap}>
        <Search size={16} aria-hidden />
        <input className={styles.searchInput} type="search" placeholder="Search&hellip;" value={query} onChange={(e) => setQuery(e.target.value)} />
      </label>
      <div className={styles.tableContainer}>
        <table className={styles.adminTable}>
          <thead>
            <tr>
              <th aria-sort={asc ? "ascending" : "descending"}>
                <button type="button" className={styles.sortBtn} onClick={() => setAsc(!asc)}>
                  Tutor Name {asc ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
                </button>
              </th>
              <th>Email</th><th>Status</th><th>Language</th><th>Rating</th><th>Current Assignments</th><th>Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((t) => (
              <tr key={t.id}>
                <td>{t.name}</td>
                <td>{t.email}</td>
                <td><Badge variant={STATUS_VARIANT[t.status]} className={styles.statusBadge}>{t.status}</Badge></td>
                <td>{t.language}</td>
                <td><Star size={13} fill="#f5b301" stroke="#f5b301" /> {t.rating.toFixed(1)} <Star size={13} fill="#e3e7eb" stroke="#c5ccd3" /></td>
                <td>{t.assignments}</td>
                <td><button type="button" className={styles.cardMenu} aria-label={`Actions for ${t.name}`}><MoreHorizontal size={18} /></button></td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={7}>No tutors match {query}.</td></tr>}
          </tbody>
        </table>
      </div>
    </Card>
  );
}