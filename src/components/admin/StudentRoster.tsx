"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { assignStudent, unassignStudent, type StudentSummary, type Tutor } from "@/lib/admin-data";
import ui from "@/components/portal/bands.module.css";
import styles from "./studentroster.module.css";

const initials = (name: string) =>
  name.split(" ").filter(Boolean).map((w) => w[0]).join("").slice(0, 2).toUpperCase();

interface Props {
  students: StudentSummary[];
  tutors: Tutor[];
  onRefresh: () => void;
}

export default function StudentRoster({ students, tutors, onRefresh }: Props) {
  const awaiting = students.filter((student) => !student.tutor_name).length;
  // Only an approved tutor may take learners - the same gate the API raises.
  const eligible = tutors.filter((tutor) => tutor.status !== "Onboarding");

  const [busy, setBusy] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  const act = async (student: StudentSummary, action: "assign" | "unassign", tutorId?: number) => {
    setBusy(student.id);
    setError(null);
    setFlash(null);
    try {
      if (action === "assign" && tutorId !== undefined) {
        const result = await assignStudent(student.id, tutorId);
        setFlash(`${result.student_name} is now with ${result.tutor_name}.`);
      } else {
        await unassignStudent(student.id);
        setFlash(`${student.name} is back in the awaiting pool.`);
      }
      onRefresh();
    } catch (err) {
      // The server's own reason, shown as-is - it knows which guard fired.
      setError(err instanceof Error ? err.message : "The assignment could not be saved.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className={ui.band} aria-labelledby="student-roster-h">
      <div className={ui.bandHead}>
        <h2 id="student-roster-h" className={ui.bandLabel}>Learners</h2>
        <span className={ui.bandLabel}>
          {students.length} on the roster{awaiting > 0 ? ` · ${awaiting} awaiting a tutor` : ""}
        </span>
      </div>

      {eligible.length === 0 && students.length > 0 ? (
        <p className={styles.notice}>
          No approved tutor can take learners yet.{" "}
          <Link className={ui.textLink} href="/admin/applications">
            Open the review queue <ArrowRight size={13} aria-hidden />
          </Link>
        </p>
      ) : null}

      {(error || flash) && (
        <p role={error ? "alert" : "status"} className={error ? styles.error : styles.flash}>
          {error || flash}
        </p>
      )}

      {students.length > 0 ? (
        <ul className={ui.sessions}>
          {students.map((student) => (
            <li key={student.id}>
              <span className={ui.avatarSquare} aria-hidden>{initials(student.name)}</span>
              <span className={ui.what}>
                {student.name}
                <small>{student.email}</small>
                <small>{student.tutor_name ? `Tutor · ${student.tutor_name}` : "No tutor assigned yet"}</small>
              </span>
              <span className={styles.controls}>
                {student.tutor_name ? (
                  <span className={ui.statusPill}>{student.level}</span>
                ) : (
                  <span className={`${ui.statusPill} ${ui.statusBad}`}>Awaiting tutor</span>
                )}
                <select
                  className={ui.select}
                  aria-label={student.tutor_name ? `Move ${student.name} to another tutor` : `Assign a tutor to ${student.name}`}
                  disabled={busy === student.id || eligible.length === 0}
                  value=""
                  onChange={(event) => {
                    if (event.target.value) {
                      void act(student, "assign", Number(event.target.value));
                    }
                  }}
                >
                  <option value="">
                    {student.tutor_name ? "Move to…" : "Assign tutor…"}
                  </option>
                  {eligible
                    .filter((tutor) => tutor.name !== student.tutor_name)
                    .map((tutor) => (
                      <option key={tutor.id} value={tutor.id}>
                        {tutor.name} · {tutor.status === "Assigned" ? `${tutor.assignments} session${tutor.assignments === 1 ? "" : "s"}` : tutor.status}
                      </option>
                    ))}
                </select>
                {student.tutor_name ? (
                  <button
                    type="button"
                    className={styles.ghost}
                    disabled={busy === student.id}
                    onClick={() => void act(student, "unassign")}
                  >
                    Unassign
                  </button>
                ) : null}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <div className={ui.bandStatement}>
          <p className={ui.bandLabel}>Roster empty</p>
          <p>No learner has registered yet. Accounts appear here the moment someone signs up.</p>
        </div>
      )}
    </section>
  );
}
