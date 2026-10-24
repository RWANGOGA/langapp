"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Users } from "lucide-react";
import TutorPageShell from "@/components/tutor/TutorPageShell";
import { getTutorLearners, TutorLearnerRow } from "@/lib/tutor-data";
import ui from "@/components/portal/bands.module.css";

const localDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString([], { month: "short", day: "numeric" }) : "no lessons yet";
const localDateTime = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString([], { month: "short", day: "numeric" }) +
      " · " +
      new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : "nothing booked";
const initials = (n: string) => n.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

export default function TutorLearnersPage() {
  const [learners, setLearners] = useState<TutorLearnerRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getTutorLearners()
      .then((d) => setLearners(d.learners))
      .catch((e) => setError(e.message));
  }, []);

  const count = learners?.length ?? 0;

  return (
    <TutorPageShell>
      <div className={ui.pageStack}>
        <header className={ui.pageHeading}>
          <div>
            <p className={ui.kicker}>My learners</p>
            <h1>
              {count === 0
                ? "Your learners"
                : `${count} ${count === 1 ? "learner" : "learners"} in your care`}
            </h1>
            <p>
              Everyone an administrator has matched with you, with the level they are studying at
              and the next lesson you have together.
            </p>
          </div>
          <Link className={ui.headerAction} href="/tutor/schedule">
            Open schedule <ArrowRight size={14} aria-hidden />
          </Link>
        </header>

        {error && (
          <p role="alert" className={ui.statusBad}>
            Could not load your learners: {error}
          </p>
        )}

        {!error && learners === null && <p className={ui.lede}>Loading your roster…</p>}

        {!error && learners?.length === 0 && (
          <section className={ui.band} aria-label="No learners">
            <div className={ui.bandStatement}>
              <p className={ui.bandLabel}>
                <Users size={13} aria-hidden /> Nobody yet
              </p>
              <p>
                Learners appear here as soon as an order is matched to you. Keeping your
                availability current is what makes a match possible.
              </p>
              <p>
                <Link className={ui.textLink} href="/tutor/settings">
                  Set your availability <ArrowRight size={13} aria-hidden />
                </Link>
              </p>
            </div>
          </section>
        )}

        {count > 0 && (
          <section className={ui.band} aria-labelledby="roster-h">
            <div className={ui.bandHead}>
              <h2 id="roster-h" className={ui.bandLabel}>
                Roster
              </h2>
              <span className={ui.bandLabel}>
                {count} assigned
              </span>
            </div>
            <ul className={ui.sessions}>
              {learners!.map((l) => (
                <li key={l.id}>
                  <span className={ui.avatarSquare} aria-hidden>
                    {initials(l.name)}
                  </span>
                  <span className={ui.what}>
                    {l.name}
                    <small>
                      {l.nativeLanguage ? `${l.nativeLanguage} speaker · ` : ""}
                      {l.completed} completed · {l.upcoming} upcoming
                    </small>
                    <small>
                      Next lesson {localDateTime(l.nextSessionAt)} · last lesson{" "}
                      {localDate(l.lastCompletedAt)}
                    </small>
                  </span>
                  <span className={ui.statusPill}>{l.level}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </TutorPageShell>
  );
}
