import type { StudentSummary } from "@/lib/admin-data";
import ui from "@/components/portal/bands.module.css";

const initials = (name: string) =>
  name.split(" ").filter(Boolean).map((w) => w[0]).join("").slice(0, 2).toUpperCase();

export default function StudentRoster({ students }: { students: StudentSummary[] }) {
  const awaiting = students.filter((student) => !student.tutor_name).length;

  return (
    <section className={ui.band} aria-labelledby="student-roster-h">
      <div className={ui.bandHead}>
        <h2 id="student-roster-h" className={ui.bandLabel}>Learners</h2>
        <span className={ui.bandLabel}>
          {students.length} on the roster{awaiting > 0 ? ` · ${awaiting} awaiting a tutor` : ""}
        </span>
      </div>

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
              {student.tutor_name ? (
                <span className={ui.statusPill}>{student.level}</span>
              ) : (
                <span className={`${ui.statusPill} ${ui.statusBad}`}>Awaiting tutor</span>
              )}
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
