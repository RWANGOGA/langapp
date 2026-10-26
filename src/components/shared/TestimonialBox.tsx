"use client";

import { useEffect, useId, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { apiGetClient, apiSendClient } from "@/lib/api-client";
import { useLanguage } from "@/i18n/LanguageProvider";
import styles from "./testimonial.module.css";

// Mirrors backend/app/schemas/testimonial.py. The server checks the same bounds;
// these exist so the author learns about them before sending, not after.
const MIN_QUOTE = 40;
const MAX_QUOTE = 280;

/** The author's own entry, as `GET /testimonials/mine` returns it. */
interface Mine {
  id: string;
  quote: string;
  region: string | null;
}

interface Props {
  /** Which portal the panel is sitting in. It changes the guidance only: the
   * account itself decides the name and the learner/tutor identity on the wall. */
  audience: "learner" | "tutor";
}

/**
 * Write-your-testimonial panel, shared by the learner dashboard and the tutor
 * portal.
 *
 * Whatever is published here is what the public wall renders - the same row, the
 * same name - because both read the one table. An author can edit it, and take it
 * down completely; nothing is soft-deleted behind a page that still shows it.
 */
export default function TestimonialBox({ audience }: Props) {
  const { t } = useLanguage();
  const headingId = useId();

  const [mine, setMine] = useState<Mine | null | undefined>(undefined);
  const [draft, setDraft] = useState("");
  const [region, setRegion] = useState("");
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState<"save" | "remove" | null>(null);
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    let active = true;
    apiGetClient<Mine | null>("/testimonials/mine")
      .then((row) => {
        if (!active) return;
        setMine(row ?? null);
        if (row) {
          setDraft(row.quote);
          setRegion(row.region ?? "");
        }
      })
      .catch(() => {
        // A failed read is not a reason to hide the panel; it just means we
        // cannot say yet whether this account already has a quote on the wall.
        if (active) setMine(null);
      });
    return () => {
      active = false;
    };
  }, []);

  // Written out as separate calls rather than t(someKey): the translation
  // checker only reads keys it can see as literals.
  const isTutor = audience === "tutor";
  const help = isTutor ? t("testimonial.box.helpTutor") : t("testimonial.box.helpLearner");
  const placeholder = isTutor
    ? t("testimonial.box.placeholderTutor")
    : t("testimonial.box.placeholderLearner");

  const tooShort = draft.trim().length < MIN_QUOTE;

  const publish = async () => {
    setBusy("save");
    setStatus(null);
    try {
      const row = await apiSendClient<Mine>("PUT", "/testimonials/mine", {
        quote: draft.trim(),
        region: region.trim() || null,
      });
      setMine(row);
      setDraft(row.quote);
      setRegion(row.region ?? "");
      setEditing(false);
      setStatus({ ok: true, text: t("testimonial.box.published") });
    } catch (e) {
      setStatus({ ok: false, text: e instanceof Error ? e.message : t("testimonial.box.failed") });
    } finally {
      setBusy(null);
    }
  };

  const remove = async () => {
    setBusy("remove");
    setStatus(null);
    try {
      await apiSendClient<void>("DELETE", "/testimonials/mine");
      setMine(null);
      setDraft("");
      setRegion("");
      setEditing(false);
      setConfirming(false);
      setStatus({ ok: true, text: t("testimonial.box.removed") });
    } catch (e) {
      setStatus({ ok: false, text: e instanceof Error ? e.message : t("testimonial.box.failed") });
    } finally {
      setBusy(null);
    }
  };

  const startEditing = () => {
    setEditing(true);
    setConfirming(false);
    setStatus(null);
  };

  return (
    <section className={styles.band} aria-labelledby={headingId}>
      <div className={styles.head}>
        <h2 id={headingId} className={styles.label}>
          {t("testimonial.box.label")}
        </h2>
        <Link className={styles.link} href="/testimonials">
          {t("testimonial.box.viewWall")} <ArrowRight size={13} aria-hidden />
        </Link>
      </div>

      <p className={styles.help}>{help}</p>

      {mine === undefined ? (
        <p className={styles.empty}>{t("testimonial.box.loading")}</p>
      ) : mine && !editing ? (
        <>
          <blockquote className={styles.current}>
            {`“${mine.quote}”`}
            <footer className={styles.currentBy}>{t("testimonial.box.onWall")}</footer>
          </blockquote>
          <div className={styles.actions}>
            <button type="button" className={styles.link} onClick={startEditing}>
              {t("testimonial.box.edit")}
            </button>
            {confirming ? (
              <>
                <button type="button" className={styles.linkDanger} onClick={remove} disabled={busy !== null}>
                  {busy === "remove" ? t("testimonial.box.removing") : t("testimonial.box.confirmRemove")}
                </button>
                <button type="button" className={styles.linkDanger} onClick={() => setConfirming(false)}>
                  {t("testimonial.box.keep")}
                </button>
              </>
            ) : (
              <button type="button" className={styles.linkDanger} onClick={() => setConfirming(true)}>
                {t("testimonial.box.remove")}
              </button>
            )}
          </div>
        </>
      ) : (
        <>
          <div className={styles.form}>
            <label>
              {t("testimonial.box.quote")}
              <textarea
                className={styles.textarea}
                value={draft}
                maxLength={MAX_QUOTE}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={placeholder}
              />
            </label>
            <div className={styles.meta}>
              <span>{`${draft.trim().length} / ${MAX_QUOTE}`}</span>
              {tooShort && <span className={styles.metaWarn}>{t("testimonial.box.tooShort", { n: MIN_QUOTE })}</span>}
            </div>
            <label>
              {t("testimonial.box.region")}
              <input
                className={styles.input}
                value={region}
                maxLength={80}
                onChange={(e) => setRegion(e.target.value)}
                placeholder={t("testimonial.box.regionPlaceholder")}
              />
            </label>
          </div>
          <div className={styles.actions}>
            <button
              type="button"
              className={styles.btnCoral}
              onClick={publish}
              disabled={busy !== null || tooShort}
            >
              {busy === "save" ? t("testimonial.box.saving") : mine ? t("testimonial.box.save") : t("testimonial.box.publish")}
            </button>
            {mine && (
              <button
                type="button"
                className={styles.linkDanger}
                onClick={() => {
                  setEditing(false);
                  setDraft(mine.quote);
                  setRegion(mine.region ?? "");
                }}
              >
                {t("testimonial.box.cancel")}
              </button>
            )}
          </div>
        </>
      )}

      {status && (
        <p role="status" className={status.ok ? styles.statusOk : styles.statusBad}>
          {status.text}
        </p>
      )}
    </section>
  );
}
