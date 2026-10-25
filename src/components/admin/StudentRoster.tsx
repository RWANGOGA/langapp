"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { assignStudent, unassignStudent, type StudentSummary, type Tutor } from "@/lib/admin-data";
import { useLanguage } from "@/i18n/LanguageProvider";
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
  const { t } = useLanguage();
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
        setFlash(t("admin.learners.flashAssign", { student: result.student_name, tutor: result.tutor_name }));
      } else {
        await unassignStudent(student.id);
        setFlash(t("admin.learners.flashUnassign", { student: student.name }));
      }
      onRefresh();
    } catch (err) {
      // The server's own reason, shown as-is - it knows which guard fired.
      setError(err instanceof Error ? err.message : t("admin.learners.errorAssign"));
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className={ui.band} aria-labelledby="student-roster-h">
      <div className={ui.bandHead}>
        <h2 id="student-roster-h" className={ui.bandLabel}>{t("admin.learners.title")}</h2>
        <span className={ui.bandLabel}>
          {t("admin.learners.onRoster", { n: students.length })}{awaiting > 0 ? ` · ${t("admin.learners.awaiting", { n: awaiting })}` : ""}
        </span>
      </div>

      {eligible.length === 0 && students.length > 0 ? (
        <p className={styles.notice}>
          {t("admin.learners.noApproved")}{" "}
          <Link className={ui.textLink} href="/admin/applications">
            {t("admin.learners.openQueue")} <ArrowRight size={13} aria-hidden />
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
                <small>{student.tutor_name ? t("admin.learners.withTutor", { name: student.tutor_name }) : t("admin.learners.noneAssigned")}</small>
              </span>
              <span className={styles.controls}>
                {student.tutor_name ? (
                  <span className={ui.statusPill}>{student.level}</span>
                ) : (
                  <span className={`${ui.statusPill} ${ui.statusBad}`}>{t("admin.learners.awaitingBadge")}</span>
                )}
                <select
                  className={ui.select}
                  aria-label={student.tutor_name ? t("admin.learners.ariaMove", { name: student.name }) : t("admin.learners.ariaAssign", { name: student.name })}
                  disabled={busy === student.id || eligible.length === 0}
                  value=""
                  onChange={(event) => {
                    if (event.target.value) {
                      void act(student, "assign", Number(event.target.value));
                    }
                  }}
                >
                  <option value="">
                    {student.tutor_name ? t("admin.learners.moveTo") : t("admin.learners.assignTutor")}
                  </option>
                  {eligible
                    .filter((tutor) => tutor.name !== student.tutor_name)
                    .map((tutor) => (
                      <option key={tutor.id} value={tutor.id}>
                        {tutor.name} · {tutor.status === "Assigned" ? t(tutor.assignments === 1 ? "admin.roster.upcomingOne" : "admin.roster.upcomingOther", { n: tutor.assignments }) : t(`admin.tutorstatus.${tutor.status}`)}
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
                    {t("admin.learners.unassign")}
                  </button>
                ) : null}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <div className={ui.bandStatement}>
          <p className={ui.bandLabel}>{t("admin.learners.emptyTitle")}</p>
          <p>{t("admin.learners.emptyBody")}</p>
        </div>
      )}
    </section>
  );
}
