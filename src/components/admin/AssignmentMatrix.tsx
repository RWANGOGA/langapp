import { Eye, Pencil, Trash2, SlidersHorizontal } from "lucide-react";
import { Card } from "@/components/ui/Card";
import type { CellStatus, MatrixRow } from "@/lib/admin-data";
import styles from "./admin.module.css";

const CELL_LABEL: Record<CellStatus, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  completed: "Completed",
  alert: "Alert",
  assigned: "Assigned",
  plus: "+",
  empty: "",
};

export default function AssignmentMatrix({ rows, studentNames }: { rows: MatrixRow[]; studentNames: string[] }) {
  return (
    <Card className={styles.adminCard}>
      <div className={styles.cardHeader}>
        <h3>Student-Tutor Assignment Matrix</h3>
        <div className={styles.headerTools}>
          <select className={styles.selectSm} aria-label="Filters"><option>Filters</option><option>Pending</option><option>Alert</option></select>
          <button type="button" className={styles.assignmentToolsBtn}><SlidersHorizontal size={14} strokeWidth={2} /> Assignment Tools</button>
        </div>
      </div>

      <div className={styles.matrixContainer}>
        <div className={styles.matrixHeader}>
          <span className={styles.matrixCell}>Tutor</span>
          {studentNames.map((s) => (
            <span key={s} className={`${styles.matrixCell} ${styles.matrixStudent}`}>{s}</span>
          ))}
          <span className={`${styles.matrixCell} ${styles.matrixAction}`}>Action</span>
        </div>

        {rows.map((row) => (
          <div key={row.tutor} className={styles.matrixRow}>
            <span className={`${styles.matrixCell} ${styles.matrixTutor}`}>{row.tutor}</span>
            {row.cells.map((cell, i) => (
              <span key={i} className={`${styles.matrixCell} ${styles.matrixStatus}`}>
                {cell !== "empty" && (
                  <span className={`${styles.statusBadge} ${styles[cell]}`}>{CELL_LABEL[cell]}</span>
                )}
              </span>
            ))}
            <span className={`${styles.matrixCell} ${styles.matrixAction}`}>
              <span className={styles.actionIcons}>
                <button type="button" aria-label={`View ${row.tutor}`}><Eye size={15} /></button>
                <button type="button" aria-label={`Edit ${row.tutor}`}><Pencil size={15} /></button>
                <button type="button" aria-label={`Delete ${row.tutor}`}><Trash2 size={15} /></button>
              </span>
            </span>
          </div>
        ))}
      </div>

      <ul className={styles.matrixLegend}>
        <li className={styles.legendItem}><span className={styles.legendDotPending} />Pending</li>
        <li className={styles.legendItem}><span className={styles.legendDotConfirmed} />Confirmed</li>
        <li className={styles.legendItem}><span className={styles.legendDotCompleted} />Completed</li>
        <li className={styles.legendItem}><span className={styles.legendDotAlert} />Alert</li>
      </ul>
    </Card>
  );
}