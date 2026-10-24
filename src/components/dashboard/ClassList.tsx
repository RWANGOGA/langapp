"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ClassItem } from "@/lib/dashboard-data";
import { cancelLearnerClass } from "@/lib/tutor-data";
import styles from "./dashboard.module.css";

// The API sends explicit UTC instants; the browser renders the learner's local time.
const fmtDay = (iso: string) =>
  new Intl.DateTimeFormat("en-US", { weekday: "short", day: "numeric" }).format(new Date(iso));
const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
const localDay = (iso: string) => new Date(iso).toLocaleDateString("en-CA");

export default function ClassList({ classes }: { classes: ClassItem[] }) {
  const router = useRouter();
  const [cancelId, setCancelId] = useState<number | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // "Upcoming" against the learner's local day, not the server's UTC day.
  const today = new Date().toLocaleDateString("en-CA");
  const upcoming = classes.filter((c) => localDay(c.startsAt) >= today);

  const confirmCancel = async (cls: ClassItem) => {
    setBusy(true);
    setMsg(null);
    try {
      await cancelLearnerClass(cls.id, reason.trim());
      setMsg({ ok: true, text: "Class cancelled — your tutor has been notified." });
      setCancelId(null);
      setReason("");
      router.refresh();
    } catch (e) {
      // The 24h-reason policy and "already started" rules come from the API.
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Cancellation failed" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <ul className={styles.upList}>
        {upcoming.map((c) => {
          const started = new Date(c.startsAt) <= new Date();
          return (
            <li key={c.id}>
              {fmtDay(c.startsAt)} | {fmtTime(c.startsAt)} - {c.title}
              {!started && (
                <button
                  type="button"
                  onClick={() => { setCancelId(cancelId === c.id ? null : c.id); setReason(""); setMsg(null); }}
                  style={{ float: "right", background: "none", border: "none", color: "#728096", fontSize: ".78rem", fontWeight: 600, cursor: "pointer", textTransform: "uppercase" }}
                >
                  {cancelId === c.id ? "Close" : "Cancel"}
                </button>
              )}
              {cancelId === c.id && (
                <span style={{ display: "block", marginTop: ".5rem" }}>
                  <input
                    aria-label="Cancellation reason"
                    placeholder="Reason (required within 24h of class)"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    style={{ width: "60%", padding: ".4rem .6rem", border: "1px solid #d5dde3", borderRadius: 6, fontSize: ".8rem" }}
                  />
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => confirmCancel(c)}
                    style={{ marginLeft: ".5rem", padding: ".4rem .8rem", border: "1px solid var(--teal)", borderRadius: 6, background: "#fff", color: "var(--teal)", fontWeight: 600, fontSize: ".78rem", cursor: "pointer" }}
                  >
                    {busy ? "Cancelling..." : "Confirm"}
                  </button>
                </span>
              )}
            </li>
          );
        })}
        {upcoming.length === 0 && <li className={styles.listEmpty}>No classes scheduled yet. Your calendar will fill up as lessons are booked.</li>}
      </ul>
      {msg && (
        <p role="status" style={{ fontSize: ".8rem", marginTop: ".5rem", color: msg.ok ? "var(--teal)" : "#d64545" }}>
          {msg.text}
        </p>
      )}
    </>
  );
}
