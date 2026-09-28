"use client";

import { useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import type { ClassItem } from "@/lib/dashboard-data";
import styles from "./dashboard.module.css";

const DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

export default function Calendar({ today, classes }: { today: string; classes: ClassItem[] }) {
  const [ty, tm] = [Number(today.slice(0, 4)), Number(today.slice(5, 7)) - 1];
  const [view, setView] = useState({ y: ty, m: tm });
  const classDays = useMemo(() => new Set(classes.map((c) => c.date)), [classes]);

  const cells = useMemo(() => {
    const start = new Date(Date.UTC(view.y, view.m, 1)).getUTCDay();
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(Date.UTC(view.y, view.m, 1 - start + i));
      return { iso: d.toISOString().slice(0, 10), day: d.getUTCDate(), out: d.getUTCMonth() !== view.m };
    });
  }, [view]);

  const shift = (n: number) => setView(({ y, m }) => { const d = new Date(Date.UTC(y, m + n, 1)); return { y: d.getUTCFullYear(), m: d.getUTCMonth() }; });
  const title = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(view.y, view.m, 1)));

  return (
    <>
      <div className={styles.calHead}>
        <h3 className={styles.cardTitle}>Scheduled Classes</h3>
        <CalendarDays size={22} className={styles.tealIcon} aria-hidden />
      </div>
      <div className={styles.calNav}>
        <button type="button" onClick={() => shift(-1)} aria-label="Previous month"><ChevronLeft size={18} /></button>
        <strong>{title}</strong>
        <button type="button" onClick={() => shift(1)} aria-label="Next month"><ChevronRight size={18} /></button>
      </div>
      <div className={styles.calGrid} role="grid" aria-label={title}>
        {DAYS.map((d) => <span key={d} className={styles.calDow} role="columnheader">{d}</span>)}
        {cells.map((c) => (
          <span key={c.iso} role="gridcell" aria-current={c.iso === today ? "date" : undefined}
            className={[styles.calDay, c.out && styles.calOut, classDays.has(c.iso) && styles.calClass, c.iso === today && styles.calToday].filter(Boolean).join(" ")}>
            {c.day}
          </span>
        ))}
      </div>
    </>
  );
}