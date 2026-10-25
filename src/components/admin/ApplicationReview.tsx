"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronDown, ExternalLink, Inbox, RefreshCw } from "lucide-react";
import {
  ALLOWED_TRANSITIONS,
  STATUS_LABEL,
  getApplications,
  reviewApplication,
  type ApplicationDetail,
  type ApplicationStatus,
} from "@/lib/admin-data";
import { relativeTime } from "@/lib/utils";
import ui from "@/components/portal/bands.module.css";
import styles from "./applications.module.css";

// The four states the school still owes a decision on. Everything else
// (approved / rejected / withdrawn) is closed work.
const OPEN_STATES: ApplicationStatus[] = ["submitted", "documents_review", "english_test", "demo_lesson"];

type Filter = "review" | "all" | ApplicationStatus;

const PILL: Record<ApplicationStatus, string> = {
  submitted: "",
  documents_review: "",
  english_test: "",
  demo_lesson: "",
  approved: ui.statusOk,
  rejected: ui.statusBad,
  withdrawn: ui.statusBad,
};

function statusTone(status: ApplicationStatus) {
  return `${ui.statusPill} ${PILL[status]}`.trim();
}

// A reviewer decides on evidence, so the panel names each piece and shows it
// is truly on file rather than a placeholder. Absent evidence reads as absent.
function EvidenceLink({ label, url }: { label: string; url: string | null }) {
  return (
    <div className={styles.evidenceRow}>
      <span className={styles.evidenceLabel}>{label}</span>
      {url ? (
        <a className={styles.evidenceLink} href={url} target="_blank" rel="noopener noreferrer">
          Open <ExternalLink size={11} aria-hidden />
        </a>
      ) : (
        <span className={`${styles.evidenceValue} ${styles.missing}`}>Not on file</span>
      )}
    </div>
  );
}

function EvidenceText({ label, value }: { label: string; value: string | number | null }) {
  const empty = value === null || value === "" || value === 0;
  return (
    <div className={styles.evidenceRow}>
      <span className={styles.evidenceLabel}>{label}</span>
      <span className={`${styles.evidenceValue} ${empty ? styles.missing : ""}`}>
        {empty ? "Not on file" : value}
      </span>
    </div>
  );
}

function ApplicationItem({
  app,
  expanded,
  onToggle,
  onChanged,
}: {
  app: ApplicationDetail;
  expanded: boolean;
  onToggle: () => void;
  onChanged: (updated: ApplicationDetail) => void;
}) {
  const [notes, setNotes] = useState(app.admin_notes ?? "");
  const [score, setScore] = useState<string>(app.demo_lesson_score != null ? String(app.demo_lesson_score) : "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  const transitions = ALLOWED_TRANSITIONS[app.status];
  // A demo score is only meaningful once the file reaches the demo stage.
  const showScore = app.status === "demo_lesson" || transitions.includes("demo_lesson");

  async function act(target: ApplicationStatus) {
    setBusy(true);
    setError(null);
    setFlash(null);
    const body: { status: ApplicationStatus; admin_notes?: string; demo_lesson_score?: number } = {
      status: target,
      admin_notes: notes.trim() || undefined,
    };
    if (showScore && score.trim()) body.demo_lesson_score = Number(score);
    try {
      const updated = await reviewApplication(app.id, body);
      onChanged(updated);
      setFlash(`Moved to ${STATUS_LABEL[updated.status]}.`);
    } catch (err) {
      // The server states exactly why it refused (illegal edge, or an
      // incomplete file that cannot be approved) - show that, not a shrug.
      setError(err instanceof Error ? err.message : "The change was refused.");
    } finally {
      setBusy(false);
    }
  }

  function buttonFor(target: ApplicationStatus) {
    const label =
      target === "approved"
        ? "Approve tutor"
        : target === "rejected"
          ? "Reject"
          : target === "withdrawn"
            ? "Withdraw"
            : app.status === "rejected"
              ? "Reopen"
              : `Move to ${STATUS_LABEL[target]}`;
    const primary = target === "approved";
    return (
      <button
        key={target}
        type="button"
        className={primary ? ui.btnCoral : ui.btn}
        disabled={busy}
        onClick={() => act(target)}
      >
        {label}
      </button>
    );
  }

  return (
    <div className={styles.item}>
      <button type="button" className={styles.head} onClick={onToggle} aria-expanded={expanded}>
        <span>
          <span className={styles.name}>{app.full_name}</span>
          <span className={styles.meta}>
            {app.country} · applied {relativeTime(app.created_at)}
          </span>
        </span>
        <span className={styles.pill}>
          <span className={statusTone(app.status)}>{STATUS_LABEL[app.status]}</span>
        </span>
        <ChevronDown size={18} className={`${styles.chevron} ${expanded ? styles.chevronOpen : ""}`} aria-hidden />
      </button>

      {expanded && (
        <div className={styles.detail}>
          <div className={styles.evidence}>
            <EvidenceLink label="Government ID" url={app.id_document_url} />
            <EvidenceLink label="Qualification file" url={app.qualification_file_url} />
            <EvidenceLink label="English proof" url={app.english_proof_url} />
            <EvidenceLink label="Introduction video" url={app.intro_video_url} />
            <EvidenceText label="Qualification" value={app.qualification_type} />
            <EvidenceText label="English test" value={app.english_proof_type ? `${app.english_proof_type}${app.english_score ? ` · ${app.english_score}` : ""}` : null} />
            <EvidenceText label="Experience" value={app.years_experience ? `${app.years_experience} yrs` : null} />
            <EvidenceText label="Specialties" value={app.specialties.length ? app.specialties.join(", ") : null} />
            <EvidenceText label="Reference" value={app.reference_1_name ? `${app.reference_1_name}${app.reference_1_email ? ` (${app.reference_1_email})` : ""}` : null} />
            <EvidenceText label="Background check" value={app.background_check_status?.toLowerCase() === "verified" ? "Verified" : null} />
          </div>

          <div className={styles.note}>
            <label className={styles.noteLabel} htmlFor={`notes-${app.id}`}>
              Review note (internal — never shown to the applicant)
            </label>
            <textarea
              id={`notes-${app.id}`}
              className={ui.textarea}
              rows={2}
              value={notes}
              placeholder="Why you are moving this file, for the next reviewer…"
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div className={styles.actions}>
            {showScore && (
              <span className={styles.scoreBox}>
                <label htmlFor={`score-${app.id}`}>Demo score</label>
                <input
                  id={`score-${app.id}`}
                  type="number"
                  min={0}
                  max={100}
                  value={score}
                  onChange={(e) => setScore(e.target.value)}
                />
              </span>
            )}
            {transitions.length > 0 ? (
              transitions.map(buttonFor)
            ) : (
              <span className={styles.meta}>This file is closed — no further moves.</span>
            )}
          </div>

          {flash && (
            <p role="status" className={ui.statusOk} style={{ marginTop: "0.9rem" }}>
              {flash}
            </p>
          )}
          {error && (
            <p role="alert" className={styles.error}>
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default function ApplicationReview() {
  const [apps, setApps] = useState<ApplicationDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("review");
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    getApplications({ page_size: 50 })
      .then((list) => setApps(list.applications))
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load the queue."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  const counts = useMemo(() => {
    const byStatus = {} as Record<ApplicationStatus, number>;
    for (const a of apps) byStatus[a.status] = (byStatus[a.status] ?? 0) + 1;
    const review = OPEN_STATES.reduce((sum, s) => sum + (byStatus[s] ?? 0), 0);
    return { byStatus, review };
  }, [apps]);

  const visible = useMemo(() => {
    if (filter === "all") return apps;
    if (filter === "review") return apps.filter((a) => OPEN_STATES.includes(a.status));
    return apps.filter((a) => a.status === filter);
  }, [apps, filter]);

  const chips: { key: Filter; label: string; count: number }[] = [
    { key: "review", label: "Needs a decision", count: counts.review },
    { key: "submitted", label: STATUS_LABEL.submitted, count: counts.byStatus.submitted ?? 0 },
    { key: "documents_review", label: STATUS_LABEL.documents_review, count: counts.byStatus.documents_review ?? 0 },
    { key: "english_test", label: STATUS_LABEL.english_test, count: counts.byStatus.english_test ?? 0 },
    { key: "demo_lesson", label: STATUS_LABEL.demo_lesson, count: counts.byStatus.demo_lesson ?? 0 },
    { key: "approved", label: STATUS_LABEL.approved, count: counts.byStatus.approved ?? 0 },
    { key: "all", label: "All", count: apps.length },
  ];

  function onChanged(updated: ApplicationDetail) {
    setApps((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
  }

  return (
    <section className={ui.band} aria-labelledby="review-h">
      <div className={ui.bandHead}>
        <h2 id="review-h" className={ui.bandLabel}>Tutor applications</h2>
        <button type="button" className={ui.textLink} onClick={load} disabled={loading}>
          <RefreshCw size={13} aria-hidden /> {loading ? "Reloading…" : "Refresh"}
        </button>
      </div>

      <div className={styles.filters}>
        {chips.map((c) => (
          <button
            key={c.key}
            type="button"
            className={`${styles.filter} ${filter === c.key ? styles.filterOn : ""}`}
            onClick={() => setFilter(c.key)}
          >
            {c.label}
            <span className={styles.filterCount}>{c.count}</span>
          </button>
        ))}
      </div>

      {error ? (
        <p role="alert" className={ui.statusBad}>{error}</p>
      ) : loading ? (
        <p className={ui.lede}>Loading the queue…</p>
      ) : visible.length === 0 ? (
        <div className={ui.bandStatement}>
          <Inbox size={22} aria-hidden />
          <p className={ui.bandLabel}>Queue clear</p>
          <p>No applications in this view. New tutor applications appear here the moment someone submits.</p>
        </div>
      ) : (
        <div>
          {visible.map((app) => (
            <ApplicationItem
              key={app.id}
              app={app}
              expanded={expandedId === app.id}
              onToggle={() => setExpandedId((id) => (id === app.id ? null : app.id))}
              onChanged={onChanged}
            />
          ))}
        </div>
      )}
    </section>
  );
}
