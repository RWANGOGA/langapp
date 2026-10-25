import type { MatrixRow } from "@/lib/admin-data";
import ui from "@/components/portal/bands.module.css";

const initials = (name: string) =>
  name.split(" ").filter(Boolean).map((w) => w[0]).join("").slice(0, 2).toUpperCase();

export default function AssignmentMatrix({
  rows,
  studentNames,
}: {
  rows: MatrixRow[];
  studentNames: string[];
}) {
  const hasData = rows.length > 0 && studentNames.length > 0;

  return (
    <section className={ui.band} aria-labelledby="matrix-h">
      <div className={ui.bandHead}>
        <h2 id="matrix-h" className={ui.bandLabel}>Assignment matrix</h2>
        <span className={ui.bandLabel}>{rows.length} tutors × {studentNames.length} learners</span>
      </div>

      {hasData ? (
        <div className={ui.matrixScroll}>
          <table className={ui.matrix}>
            <caption>
              Who teaches whom. A filled marker means that learner is matched to that tutor; a
              rule means no match exists. Learner columns carry initials — hover one to read the
              full name.
            </caption>
            <thead>
              <tr>
                <th scope="col">Tutor</th>
                {studentNames.map((name, index) => (
                  <th key={`${name}-${index}`} scope="col" title={name}>{initials(name)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.tutor}>
                  <th scope="row" title={row.tutor}>{row.tutor}</th>
                  {row.cells.map((cell, index) => (
                    <td key={index}>
                      <span className={cell === "assigned" ? ui.matrixOn : ui.matrixOff} aria-hidden />
                      <span className={ui.vh}>{cell === "assigned" ? "Matched" : "Not matched"}</span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className={ui.bandStatement}>
          <p className={ui.bandLabel}>Nothing to chart</p>
          <p>
            The matrix fills in once at least one tutor and one learner exist and an administrator
            has matched them.
          </p>
        </div>
      )}

      <div className={ui.matrixLegend}>
        <span><i className={ui.matrixOn} aria-hidden /> Matched</span>
        <span><i className={ui.matrixOff} aria-hidden /> Not matched</span>
      </div>
    </section>
  );
}
