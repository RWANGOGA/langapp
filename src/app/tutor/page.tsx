"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Clock, PackageCheck } from "lucide-react";
import Calendar from "@/components/tutor/Calendar";
import Countdown from "@/components/tutor/Countdown";
import DashboardLayout from "@/components/tutor/DashboardLayout";
import DashboardShell from "@/components/tutor/DashboardShell";
import { useAuth } from "@/lib/auth";
import { cancelTutorSession, completeTutorSession, getTutorDashboard, markSessionNoShow, sendSessionFeedback, setSessionMeetingLink, TutorDashboard } from "@/lib/tutor-data";
import styles from "@/components/tutor/tutor.module.css";

// Render the backend's explicit UTC instants in the viewer's own timezone.
const localDay = (iso: string) => new Date(iso).toLocaleDateString("en-CA"); // YYYY-MM-DD, local
const localTime = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

export default function TutorPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading, isTutor } = useAuth();
  const [dashboard, setDashboard] = useState<TutorDashboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [linkProvider, setLinkProvider] = useState<"zoom" | "google_meet">("google_meet");
  const [linkUrl, setLinkUrl] = useState("");
  const [fbSessionId, setFbSessionId] = useState("");
  const [fbTopic, setFbTopic] = useState("");
  const [fbText, setFbText] = useState("");
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState("");

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.push(`/auth/login?callbackUrl=${encodeURIComponent("/tutor")}`);
      } else if (!isTutor) {
        router.push("/dashboard");
      }
    }
  }, [isAuthenticated, isTutor, isLoading, router]);

  useEffect(() => {
    if (isAuthenticated && isTutor) {
      getTutorDashboard()
        .then(setDashboard)
        .catch((err) => setError(err.message));
    }
  }, [isAuthenticated, isTutor]);

  if (isLoading || !isAuthenticated || !isTutor) {
    return (
      <div className={styles.loading}>
        <div className={styles.loadingSpinner}>Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.loading}>
        <div className={styles.loadingSpinner}>Error: {error}</div>
      </div>
    );
  }

  if (!dashboard) {
    return (
      <div className={styles.loading}>
        <div className={styles.loadingSpinner}>Loading dashboard...</div>
      </div>
    );
  }

  const { tutor, next, learners, sessions, packageSummary } = dashboard;
  // "Today" is the tutor's local day, not the server or UTC day.
  const localToday = new Date().toLocaleDateString("en-CA");
  const todays = sessions.filter((s) => localDay(s.startsAt) === localToday);
  const upcoming = sessions.filter((s) => localDay(s.startsAt) > localToday);

  const initials = (n: string) => n.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

  // UI session ids are "s12"; the API wants the numeric class id.
  const classId = (sessionId: string) => Number(sessionId.replace(/^s/, ""));

  const runAction = async (key: string, fn: () => Promise<unknown>, successMsg: string) => {
    setBusy(key);
    setActionMsg(null);
    try {
      await fn();
      setActionMsg({ ok: true, text: successMsg });
      setDashboard(await getTutorDashboard());
    } catch (e) {
      setActionMsg({ ok: false, text: e instanceof Error ? e.message : "Action failed" });
    } finally {
      setBusy(null);
    }
  };

  return (
    <DashboardLayout>
      <DashboardShell tutor={tutor}>
        <div className={styles.tGrid}>
          <section className={`${styles.card} ${styles.roster}`} aria-labelledby="roster-h">
            <div className={styles.cardHead}>
              <h3 id="roster-h" className={styles.cardTitle}>Assigned Learners</h3>
              <Link href="/tutor/learners" className={styles.linkMore}>View all</Link>
            </div>
            <ul className={styles.learnerList}>
              {learners.map((l) => (
                <li key={l.id} className={styles.learnerItem}>
                  <span className={styles.initials} aria-hidden>{initials(l.name)}</span>
                  <div><strong>{l.name}</strong><small>{l.nativeLanguage} · {l.goal}</small></div>
                  <span className={styles.level}>{l.level}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className={`${styles.card} ${styles.next}`} aria-labelledby="next-h">
            <div className={styles.cardTop}>
              <h3 id="next-h" className={styles.cardTitle}>Next Session</h3>
              <Clock size={26} className={styles.clockRing} aria-hidden />
            </div>
            <h4 className={styles.nextTitle}>{next.topic}</h4>
            <div className={styles.nextRow}>
              <div className={styles.nextLearner}>
                <span className={styles.initials} aria-hidden>{initials(next.learner)}</span>
                <strong>{next.learner}</strong>
              </div>
              <Countdown initialSeconds={next.secondsLeft} />
            </div>

            {next.meetingUrl ? (
              <a className={`${styles.btnCoral} ${styles.startLink}`} href={next.meetingUrl} target="_blank" rel="noopener noreferrer">Start class</a>
            ) : next.sessionId !== "none" ? (
              // The old form posted to /api/tutor/meeting-link, which existed
              // nowhere. This calls the real tutor session endpoint.
              <div className={styles.linkForm}>
                <select
                  className={styles.select}
                  aria-label="Meeting provider"
                  value={linkProvider}
                  onChange={(e) => setLinkProvider(e.target.value as "zoom" | "google_meet")}
                >
                  <option value="google_meet">Google Meet</option>
                  <option value="zoom">Zoom</option>
                </select>
                <input
                  className={styles.input}
                  type="url"
                  aria-label="Meeting URL"
                  placeholder="https://meet.google.com/xxx or https://zoom.us/j/xxx"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                />
                <button
                  type="button"
                  className={styles.btnCoral}
                  disabled={busy === "link" || !/^https?:\/\/.+/i.test(linkUrl)}
                  onClick={() => runAction("link", () => setSessionMeetingLink(classId(next.sessionId), linkProvider, linkUrl.trim()), "Meeting link saved.")}
                >
                  {busy === "link" ? "Saving..." : "Save meeting link"}
                </button>
              </div>
            ) : (
              <p className={styles.subTitle}>No upcoming session yet. A meeting link appears once a class is booked.</p>
            )}

            {actionMsg && <p role="status" style={actionMsg.ok ? { color: "var(--teal)" } : { color: "#d64545" }}>{actionMsg.text}</p>}

            <h4 className={styles.subTitle}>Today&apos;s Sessions</h4>
            <ul className={styles.todayList}>
              {todays.map((s) => (
                <li key={s.id} className={styles.sessionRow}>
                  <time>{localTime(s.startsAt)}</time>
                  <span><strong>{s.learner}</strong> · {s.topic}{s.status !== "scheduled" && <em> ({s.status.replace("_", " ")})</em>}</span>
                  {s.meetingUrl && <a className={styles.linkMore} href={s.meetingUrl} target="_blank" rel="noopener noreferrer">{s.provider}</a>}
                  {s.status === "scheduled" && (
                    <>
                      <button
                        type="button"
                        className={styles.linkMore}
                        disabled={busy === `done-${s.id}`}
                        onClick={() => runAction(`done-${s.id}`, () => completeTutorSession(classId(s.id)), "Session marked completed.")}
                      >
                        {busy === `done-${s.id}` ? "Saving..." : "Mark done"}
                      </button>
                      {new Date(s.startsAt) <= new Date() && (
                        <button
                          type="button"
                          className={styles.linkMore}
                          disabled={busy === `noshow-${s.id}`}
                          onClick={() => runAction(`noshow-${s.id}`, () => markSessionNoShow(classId(s.id)), "Marked as no-show; the learner was notified.")}
                        >
                          {busy === `noshow-${s.id}` ? "Saving..." : "No-show"}
                        </button>
                      )}
                      <button
                        type="button"
                        className={styles.linkMore}
                        onClick={() => { setCancelId(cancelId === s.id ? null : s.id); setCancelReason(""); }}
                      >
                        Cancel
                      </button>
                    </>
                  )}
                </li>
              ))}
              {todays.length === 0 && <li className={styles.sessionRow}>No sessions today.</li>}
            </ul>
            {cancelId && (
              <div className={styles.linkForm}>
                <input
                  className={styles.input}
                  aria-label="Cancellation reason"
                  placeholder="Reason for the learner (optional)"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                />
                <button
                  type="button"
                  className={styles.btnCoral}
                  disabled={busy === `cancel-${cancelId}`}
                  onClick={() =>
                    runAction(`cancel-${cancelId}`, () => cancelTutorSession(classId(cancelId), cancelReason.trim()), "Session cancelled; the learner was notified.").then(() => setCancelId(null))
                  }
                >
                  {busy === `cancel-${cancelId}` ? "Cancelling..." : "Confirm cancellation"}
                </button>
              </div>
            )}
          </section>

          <section className={`${styles.card} ${styles.calendar}`}>
            <Calendar today={localToday} events={sessions} />
            <hr className={styles.rule} />
            <h3 className={styles.subTitle}>Upcoming</h3>
            <ul className={styles.upList}>
              {upcoming.map((s) => (
                <li key={s.id} className={styles.learnerItem}>{new Intl.DateTimeFormat("en-US", { weekday: "short", day: "numeric" }).format(new Date(s.startsAt))} | {localTime(s.startsAt)} - {s.learner}</li>
              ))}
            </ul>
          </section>

          <section className={`${styles.card} ${styles.notes}`} aria-labelledby="notes-h">
            <h3 id="notes-h" className={styles.cardTitle}>Lesson Notes & Feedback</h3>
            {/* The old form posted to /api/tutor/feedback, which existed
                nowhere; feedback is per session on the real API. */}
            <div className={styles.form}>
              <label>Session
                <select className={styles.select} value={fbSessionId} onChange={(e) => setFbSessionId(e.target.value)} required>
                  <option value="">Select session</option>
                  {sessions.filter((s) => s.status === "scheduled" || s.status === "completed").map((s) => <option key={s.id} value={s.id}>{localDay(s.startsAt)} {localTime(s.startsAt)} — {s.learner}</option>)}
                </select>
              </label>
              <label>Lesson topic
                <input className={styles.input} value={fbTopic} onChange={(e) => setFbTopic(e.target.value)} placeholder="e.g. Unit 7 - Conversation Practice" />
              </label>
              <label className={styles.wide}>Feedback for the learner
                <textarea className={styles.textarea} value={fbText} onChange={(e) => setFbText(e.target.value)} placeholder="Strengths, areas to improve, homework…" required />
              </label>
              <button
                type="button"
                className={styles.submit}
                disabled={busy === "feedback" || !fbSessionId || !fbText.trim()}
                onClick={() => runAction("feedback", () => sendSessionFeedback(classId(fbSessionId), fbTopic.trim(), fbText.trim()), "Feedback saved — the learner has been notified.")}
              >
                {busy === "feedback" ? "Sending..." : "Send feedback"}
              </button>
            </div>
          </section>
          <section className={`${styles.card} ${styles.notes}`} aria-labelledby="packages-h">
            <h3 id="packages-h" className={styles.cardTitle}><PackageCheck size={20} className={styles.tealIcon} /> Learner Packages</h3>
            <p className={styles.packagePrivacy}>Only packages belonging to your assigned learners are shown.</p>
            <ul className={styles.packageList}>{packageSummary.map((item) => <li key={`${item.student_id}-${item.started_at}`}><span><strong>{item.student_name}</strong><small>{item.package_name} · {item.tier || "one-time"} · {item.subject || "Learning plan"}</small><small>Started {new Date(item.started_at).toLocaleDateString()} · Expires {item.expires_at ? new Date(item.expires_at).toLocaleDateString() : "Not set"}</small></span><b>{item.status}</b></li>)}{packageSummary.length === 0 && <li>No assigned learner packages yet.</li>}</ul>
          </section>
        </div>
      </DashboardShell>
    </DashboardLayout>
  );
}