"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Search } from "lucide-react";
import type { Tutor, TutorStatus } from "@/lib/admin-data";
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
function credentials(tutor: Tutor) {
  const proof = [tutor.qualification_type, tutor.english_proof_type, tutor.english_score]
    .filter(Boolean)
    .join(" · ");
  return proof || "credentials not on file";
}

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
    <section className={ui.band} aria-labelledby="tutor-roster-h">
      <div className={ui.bandHead}>
        <h2 id="tutor-roster-h" className={ui.bandLabel}>Tutor roster</h2>
        <span className={ui.bandLabel}>{tutors.length} {tutors.length === 1 ? "tutor" : "tutors"}</span>
      </div>

      <div className={ui.rosterTools}>
        <label className={ui.search}>
          <Search size={14} aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search name or email"
            aria-label="Search tutors"
          />
        </label>
        <button type="button" className={ui.textLink} onClick={() => setAsc(!asc)}>
          Name {asc ? <ArrowUp size={12} aria-hidden /> : <ArrowDown size={12} aria-hidden />}
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
                  {credentials(tutor)} · {tutor.assignments} upcoming{" "}
                  {tutor.assignments === 1 ? "session" : "sessions"}
                  {tutor.country ? ` · based in ${tutor.country}` : ""}
                  {tutor.rating > 0 ? ` · rated ${tutor.rating.toFixed(1)}` : ""}
                </small>
              </span>
              <span className={`${ui.statusPill} ${TONE[tutor.status]}`}>{tutor.status}</span>
            </li>
          ))}
        </ul>
      ) : (
        <div className={ui.bandStatement}>
          <p className={ui.bandLabel}>No match</p>
          <p>No tutor matches &ldquo;{query}&rdquo;. Clear the search to see all {tutors.length}.</p>
        </div>
      )}
    </section>
  );
}
