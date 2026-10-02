import { Card } from "@/components/ui/Card";
import type { StudentSummary } from "@/lib/admin-data";
import styles from "./admin.module.css";

export default function StudentRoster({ students }: { students: StudentSummary[] }) {
  return (
    <Card className={styles.adminCard}>
      <div className={styles.cardHeader}><h3>Student Roster</h3><span className={styles.cardMeta}>{students.length} learners</span></div>
      <div className={styles.tableContainer}>
        <table className={styles.adminTable}>
          <thead><tr><th>Student</th><th>Email</th><th>Level</th><th>Tutor</th><th>Status</th></tr></thead>
          <tbody>
            {students.map((student) => <tr key={student.id}><td>{student.name}</td><td>{student.email}</td><td>{student.level}</td><td>{student.tutor_name || "Not assigned"}</td><td>{student.status}</td></tr>)}
            {students.length === 0 && <tr><td colSpan={5}>No learners registered yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </Card>
  );
}