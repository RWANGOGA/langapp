"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import {
  assignStudent,
  getMatchingQueue,
  type MatchingQueueRow,
} from "@/lib/admin-data";
import { useLanguage } from "@/i18n/LanguageProvider";
import ui from "@/components/portal/bands.module.css";
import styles from "./studentroster.module.css";

/* The matching queue: paid orders the engine could not close on its own.
   Every row shows its best candidate and the sentences that candidate was
   built from, so finishing the job by hand still starts from the machine's
   evidence rather than from a blank dropdown. */
export default function MatchingQueue({ onPlaced }: { onPlaced?: () => void }) {
  const { t } = useLanguage();
  const [rows, setRows] = useState<MatchingQueueRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [busy, setBusy] = useState<number | null>(null);

  const load = useCallback(() => {
    getMatchingQueue()
      .then(setRows)
      .catch((err) =>
        setError(err instanceof Error ? err.message : t("admin.matching.loadError"))
      );
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  const place = async (row: MatchingQueueRow) => {
    if (!row.best_candidate) return;
    setBusy(row.order_id);
    setError(null);
    setFlash(null);
    try {
      await assignStudent(row.student_id, row.best_candidate.tutor_id);
      setFlash(
        t("admin.matching.flashPlaced", {
          student: row.student_name,
          tutor: row.best_candidate.tutor_name,
        })
      );
      // The roster below shows the same learner, so the page reloads its
      // dashboard aggregate too - one placement, one consistent picture.
      onPlaced?.();
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("admin.matching.placeError"));
    } finally {
      setBusy(null);
    }
  };

  // Nothing to say, nothing to show: an empty band with a zero count is
  // noise, and the roster below already carries the awaiting count honestly.
  // Same while the first read is in flight - the band appears only when
  // there is work. A flash or an error keeps it open one beat longer, so the
  // confirmation of the last placement is not deleted along with the band.
  if ((!rows || rows.length === 0) && !error && !flash) return null;

  return (
    <section className={ui.band} aria-labelledby="matching-queue-h">
      <div className={ui.bandHead}>
        <h2 id="matching-queue-h" className={ui.bandLabel}>{t("admin.matching.title")}</h2>
        <span className={ui.bandLabel}>
          {t((rows?.length ?? 0) === 1 ? "admin.matching.waitingOne" : "admin.matching.waitingOther", { n: rows?.length ?? 0 })}
        </span>
      </div>

      {(error || flash) && (
        <p role={error ? "alert" : "status"} className={error ? styles.error : styles.flash}>
          {error || flash}
        </p>
      )}

      <ul className={ui.sessions}>
        {(rows ?? []).map((row) => (
            <li key={row.order_id}>
              <span className={ui.avatarSquare} aria-hidden>#{row.order_id}</span>
              <span className={ui.what}>
                {row.student_name}
                <small>
                  {row.subject
                    ? t("admin.matching.subject", { subject: row.subject })
                    : t("admin.matching.noSubject")}
                </small>
                {row.best_candidate ? (
                  <small>
                    {t("admin.matching.bestCandidate", { tutor: row.best_candidate.tutor_name })}
                  </small>
                ) : (
                  <small>{t("admin.matching.noCandidate")}</small>
                )}
                {row.best_candidate && (
                  <ul className={styles.reasons}>
                    {row.best_candidate.reasons.map((reason) => (
                      <li key={reason}>{reason}</li>
                    ))}
                  </ul>
                )}
              </span>
              <span className={styles.controls}>
                {row.best_candidate ? (
                  <>
                    <span className={ui.statusPill}>
                      {t("admin.matching.score", { n: row.best_candidate.score })}
                    </span>
                    <button
                      type="button"
                      className={ui.btn}
                      disabled={busy === row.order_id}
                      onClick={() => void place(row)}
                    >
                      {t("admin.matching.place")}
                    </button>
                  </>
                ) : (
                  <>
                    <span className={`${ui.statusPill} ${ui.statusBad}`}>
                      {t("admin.matching.needsTutor")}
                    </span>
                    <Link className={ui.textLink} href="/admin/tutors">
                      {t("admin.matching.openTutors")} <ArrowRight size={13} aria-hidden />
                    </Link>
                  </>
                )}
              </span>
            </li>
        ))}
      </ul>
    </section>
  );
}
