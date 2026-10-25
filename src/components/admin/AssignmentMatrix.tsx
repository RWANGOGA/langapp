"use client";

import type { MatrixRow } from "@/lib/admin-data";
import { useLanguage } from "@/i18n/LanguageProvider";
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
  const { t } = useLanguage();
  const hasData = rows.length > 0 && studentNames.length > 0;

  return (
    <section className={ui.band} aria-labelledby="matrix-h">
      <div className={ui.bandHead}>
        <h2 id="matrix-h" className={ui.bandLabel}>{t("admin.matrix.title")}</h2>
        <span className={ui.bandLabel}>{t("admin.matrix.count", { tutors: rows.length, learners: studentNames.length })}</span>
      </div>

      {hasData ? (
        <div className={ui.matrixScroll}>
          <table className={ui.matrix}>
            <caption>
              {t("admin.matrix.caption")}
            </caption>
            <thead>
              <tr>
                <th scope="col">{t("admin.matrix.colTutor")}</th>
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
                      <span className={ui.vh}>{cell === "assigned" ? t("admin.matrix.matched") : t("admin.matrix.notMatched")}</span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className={ui.bandStatement}>
          <p className={ui.bandLabel}>{t("admin.matrix.emptyTitle")}</p>
          <p>
            {t("admin.matrix.emptyBody")}
          </p>
        </div>
      )}

      <div className={ui.matrixLegend}>
        <span><i className={ui.matrixOn} aria-hidden /> {t("admin.matrix.matched")}</span>
        <span><i className={ui.matrixOff} aria-hidden /> {t("admin.matrix.notMatched")}</span>
      </div>
    </section>
  );
}
