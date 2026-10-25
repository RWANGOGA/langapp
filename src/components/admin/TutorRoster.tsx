"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Search } from "lucide-react";
import type { Tutor, TutorStatus } from "@/lib/admin-data";
import { useLanguage } from "@/i18n/LanguageProvider";
import ui from "@/components/portal/bands.module.css";

const initials = (name: string) =>
  name.split(" ").filter(Boolean).map((w) => w[0]).join("").slice(0, 2).toUpperCase();

// Onboarding is open work, Assigned is a tutor mid-term, Active is an approved
// tutor with nothing on the calendar yet.
const TONE: Record<TutorStatus, string> = {
  Active: ui.statusOk,
  Assigned: "",
  Onboarding: ui.statusBad,
};

/** What the application recorded, or an honest admission that it recorded nothing. */
function credentials(tutor: Tutor, none: string) {
  const proof = [tutor.qualification_type, tutor.english_proof_type, tutor.english_score]
    .filter(Boolean)
    .join(" · ");
  return proof || none;
}

export default function TutorRoster({ tutors }: { tutors: Tutor[] }) {
  const { t } = useLanguage();
  const [query, setQuery] = useState("");
  const [asc, setAsc] = useState(true);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tutors
      .filter((row) => !q || row.name.toLowerCase().includes(q) || row.email.toLowerCase().includes(q))
      .sort((a, b) => (asc ? 1 : -1) * a.name.localeCompare(b.name));
  }, [tutors, query, asc]);

  return (
    <section className={ui.band} aria-labelledby="tutor-roster-h">
      <div className={ui.bandHead}>
        <h2 id="tutor-roster-h" className={ui.bandLabel}>{t("admin.roster.title")}</h2>
        <span className={ui.bandLabel}>
          {t(tutors.length === 1 ? "admin.roster.countOne" : "admin.roster.countOther", { n: tutors.length })}
        </span>
      </div>

      <div className={ui.rosterTools}>
        <label className={ui.search}>
          <Search size={14} aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("admin.roster.searchPlaceholder")}
            aria-label={t("admin.roster.searchAria")}
          />
        </label>
        <button type="button" className={ui.textLink} onClick={() => setAsc(!asc)}>
          {t("admin.roster.name")} {asc ? <ArrowUp size={12} aria-hidden /> : <ArrowDown size={12} aria-hidden />}
        </button>
      </div>

      {rows.length > 0 ? (
        <ul className={ui.sessions}>
          {rows.map((tutor) => (
            <li key={tutor.id}>
              <span className={ui.avatarSquare} aria-hidden>{initials(tutor.name)}</span>
              <span className={ui.what}>
                {tutor.name}
                <small>{tutor.email}</small>
                <small>
                  {credentials(tutor, t("admin.roster.noCredentials"))} ·{" "}
                  {t(tutor.assignments === 1 ? "admin.roster.upcomingOne" : "admin.roster.upcomingOther", { n: tutor.assignments })}
                  {tutor.country ? ` · ${t("admin.roster.basedIn", { country: tutor.country })}` : ""}
                  {tutor.rating > 0 ? ` · ${t("admin.roster.rated", { rating: tutor.rating.toFixed(1) })}` : ""}
                </small>
              </span>
              <span className={`${ui.statusPill} ${TONE[tutor.status]}`}>{t(`admin.tutorstatus.${tutor.status}`)}</span>
            </li>
          ))}
        </ul>
      ) : (
        <div className={ui.bandStatement}>
          <p className={ui.bandLabel}>{t("admin.roster.noMatchTitle")}</p>
          <p>
            {t("admin.roster.noMatchBody", { query, total: t(tutors.length === 1 ? "admin.roster.countOne" : "admin.roster.countOther", { n: tutors.length }) })}
          </p>
        </div>
      )}
    </section>
  );
}
