"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, CalendarDays, PackageCheck, Users, Video } from "lucide-react";
import Calendar from "@/components/shared/Calendar";
import Countdown from "@/components/shared/Countdown";
import DashboardShell from "@/components/tutor/DashboardShell";
import { useAuth } from "@/lib/auth";
import { useLanguage } from "@/i18n/LanguageProvider";
import { cancelTutorSession, completeTutorSession, getTutorDashboard, markSessionNoShow, sendSessionFeedback, setSessionMeetingLink, TutorDashboard } from "@/lib/tutor-data";
import ui from "@/components/portal/bands.module.css";

// BCP-47 tags for Intl date formatting, keyed by the app's own locale codes.
const LOCALE_TAG: Record<string, string> = { en: "en-US", zh: "zh-CN", ja: "ja-JP", es: "es-ES", fr: "fr-FR" };

// Render the backend's explicit UTC instants in the viewer's own timezone.
const localDay = (iso: string) => new Date(iso).toLocaleDateString("en-CA"); // YYYY-MM-DD, local
const localTime = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
const dayNumber = (iso: string) => new Date(iso).getDate();
const initials = (name: string) => name.split(" ").filter(Boolean).map((w) => w[0]).join("").slice(0, 2).toUpperCase();

export default function TutorPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading, isTutor } = useAuth();
  const { t, locale } = useLanguage();
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
    return <div className={ui.pageStack}><p className={ui.lede}>{t("tutor.common.loading")}</p></div>;
  }

  if (error) {
    return <div className={ui.pageStack}><p role="alert" className={ui.statusBad}>{t("tutor.common.error", { message: error })}</p></div>;
  }

  if (!dashboard) {
    return <div className={ui.pageStack}><p className={ui.lede}>{t("tutor.common.loadingDashboard")}</p></div>;
  }

  const { tutor, next, learners, sessions, packageSummary } = dashboard;
  // "Today" is the tutor's local day, not the server or UTC day.
  const localToday = new Date().toLocaleDateString("en-CA");
  const todays = sessions.filter((s) => localDay(s.startsAt) === localToday);
  const upcoming = sessions.filter((s) => localDay(s.startsAt) > localToday);
  const firstName = tutor.name.split(" ")[0];

  // Date labels follow the active language, not a fixed locale.
  const tag = LOCALE_TAG[locale] ?? "en-US";
  const weekday = (iso: string) => new Intl.DateTimeFormat(tag, { weekday: "short" }).format(new Date(iso));
  const pkgDate = (iso: string) => new Intl.DateTimeFormat(tag, { month: "short", day: "numeric" }).format(new Date(iso));
  const statusLabel = (value: string) => {
    const key = `tutor.status.${value}`;
    const label = t(key);
    return label === key ? value.replace("_", " ") : label;
  };

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
      setActionMsg({ ok: false, text: e instanceof Error ? e.message : t("tutor.common.actionFailed") });
    } finally {
      setBusy(null);
    }
  };

  return (
    <DashboardShell tutor={tutor}>
      <div className={ui.pageStack}>
        <header className={ui.pageHeading}>
          <div>
            <p className={ui.kicker}>{t("tutor.dash.kicker")}</p>
            <h1>{t("tutor.dash.welcome", { name: firstName })}</h1>
            <p>{t("tutor.dash.lede")}</p>
          </div>
          <Link className={ui.headerAction} href="/tutor/schedule">{t("tutor.common.openSchedule")} <ArrowRight size={14} aria-hidden /></Link>
        </header>

        <ul className={ui.stats}>
          <li>
            <Users size={16} aria-hidden />
            <span><small>{t("tutor.dash.statLearners")}</small><b>{learners.length}</b></span>
          </li>
          <li>
            <CalendarDays size={16} aria-hidden />
            <span><small>{t("tutor.dash.statToday")}</small><b>{todays.length}</b></span>
          </li>
          <li>
            <Video size={16} aria-hidden />
            <span><small>{t("tutor.dash.statUpcoming")}</small><b>{upcoming.length}</b></span>
          </li>
        </ul>

        <div className={ui.split}>
          <div className={ui.mainPane}>
            <section className={ui.band} aria-labelledby="next-h">
              <p className={ui.bandLabel}>{t("tutor.dash.nextSession")}</p>
              {next.sessionId !== "none" ? (
                <>
                  <h2 id="next-h" className={ui.bandTitle}>{next.topic}</h2>
                  <div className={ui.nextRow}>
                    <div className={ui.miniTutor}>
                      <span className={ui.avatarSquare} aria-hidden>{initials(next.learner)}</span>
                      <span className={ui.who}><strong>{next.learner}</strong><small>{t("tutor.dash.learner")}</small></span>
                    </div>
                    <Countdown initialSeconds={next.secondsLeft} />
                  </div>

                  {next.meetingUrl ? (
                    <div className={ui.joinRow}>
                      <a className={ui.btnCoral} href={next.meetingUrl} target="_blank" rel="noopener noreferrer">{t("tutor.dash.startClass")}</a>
                    </div>
                  ) : (
                    // The old form posted to /api/tutor/meeting-link, which existed
                    // nowhere. This calls the real tutor session endpoint.
                    <div className={ui.form}>
                      <label>{t("tutor.dash.provider")}
                        <select
                          className={ui.select}
                          value={linkProvider}
                          onChange={(e) => setLinkProvider(e.target.value as "zoom" | "google_meet")}
                        >
                          <option value="google_meet">Google Meet</option>
                          <option value="zoom">Zoom</option>
                        </select>
                      </label>
                      <label>{t("tutor.dash.meetingLink")}
                        <input
                          className={ui.input}
                          type="url"
                          placeholder="https://meet.google.com/xxx"
                          value={linkUrl}
                          onChange={(e) => setLinkUrl(e.target.value)}
                        />
                      </label>
                      <div className={`${ui.formActions} ${ui.wide}`}>
                        <button
                          type="button"
                          className={ui.btnCoral}
                          disabled={busy === "link" || !/^https?:\/\/.+/i.test(linkUrl)}
                          onClick={() => runAction("link", () => setSessionMeetingLink(classId(next.sessionId), linkProvider, linkUrl.trim()), t("tutor.dash.linkSaved"))}
                        >
                          {busy === "link" ? t("tutor.common.saving") : t("tutor.dash.saveLink")}
                        </button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className={ui.bandEmpty}>
                  <p>{t("tutor.dash.noSession")}</p>
                  <Link className={ui.textLink} href="/tutor/schedule">{t("tutor.common.openSchedule")} <ArrowRight size={13} aria-hidden /></Link>
                </div>
              )}
              {actionMsg && <p role="status" className={actionMsg.ok ? ui.statusOk : ui.statusBad}>{actionMsg.text}</p>}
            </section>

            <section className={ui.band} aria-labelledby="today-h">
              <div className={ui.bandHead}>
                <h2 id="today-h" className={ui.bandLabel}>{t("tutor.dash.today")}</h2>
                <span className={ui.bandLabel}>{t(todays.length === 1 ? "tutor.dash.sessionOne" : "tutor.dash.sessionOther", { n: todays.length })}</span>
              </div>
              {todays.length > 0 ? (
                <ul className={ui.sessions}>
                  {todays.map((s) => (
                    <li key={s.id}>
                      <span className={ui.when}>
                        <b>{localTime(s.startsAt)}</b>
                        <em>{statusLabel(s.status)}</em>
                      </span>
                      <span className={ui.what}>
                        {s.learner} · {s.topic}
                        {s.meetingUrl && <small><a className={ui.textLink} href={s.meetingUrl} target="_blank" rel="noopener noreferrer">{s.provider ?? t("tutor.dash.meetingLink")}</a></small>}
                      </span>
                      <span className={ui.actions}>
                        {s.status === "scheduled" && (
                          <>
                            <button
                              type="button"
                              className={ui.textLink}
                              disabled={busy === `done-${s.id}`}
                              onClick={() => runAction(`done-${s.id}`, () => completeTutorSession(classId(s.id)), t("tutor.dash.markedDone"))}
                            >
                              {busy === `done-${s.id}` ? t("tutor.common.saving") : t("tutor.dash.markDone")}
                            </button>
                            {new Date(s.startsAt) <= new Date() && (
                              <button
                                type="button"
                                className={ui.textLink}
                                disabled={busy === `noshow-${s.id}`}
                                onClick={() => runAction(`noshow-${s.id}`, () => markSessionNoShow(classId(s.id)), t("tutor.dash.noShowDone"))}
                              >
                                {busy === `noshow-${s.id}` ? t("tutor.common.saving") : t("tutor.dash.noShow")}
                              </button>
                            )}
                            <button
                              type="button"
                              className={ui.textLink}
                              onClick={() => { setCancelId(cancelId === s.id ? null : s.id); setCancelReason(""); }}
                            >
                              {t("tutor.common.cancel")}
                            </button>
                          </>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className={ui.bandStatement}>
                  <p className={ui.bandLabel}>{t("tutor.dash.emptyTodayTitle")}</p>
                  <p>{t("tutor.dash.emptyTodayBody")}</p>
                </div>
              )}
              {cancelId && (
                <div className={ui.form}>
                  <label className={ui.wide}>{t("tutor.dash.cancelReason")}
                    <input
                      className={ui.input}
                      value={cancelReason}
                      onChange={(e) => setCancelReason(e.target.value)}
                    />
                  </label>
                  <div className={`${ui.formActions} ${ui.wide}`}>
                    <button
                      type="button"
                      className={ui.btn}
                      disabled={busy === `cancel-${cancelId}`}
                      onClick={() =>
                        runAction(`cancel-${cancelId}`, () => cancelTutorSession(classId(cancelId), cancelReason.trim()), t("tutor.dash.cancelled")).then(() => setCancelId(null))
                      }
                    >
                      {busy === `cancel-${cancelId}` ? t("tutor.dash.cancelling") : t("tutor.dash.confirmCancel")}
                    </button>
                  </div>
                </div>
              )}
            </section>

            <section className={ui.band} aria-labelledby="learners-h">
              <div className={ui.bandHead}>
                <h2 id="learners-h" className={ui.bandLabel}>{t("tutor.dash.assignedLearners")}</h2>
                <Link className={ui.textLink} href="/tutor/learners">{t("tutor.common.viewAll")} <ArrowRight size={13} aria-hidden /></Link>
              </div>
              {learners.length > 0 ? (
                <ul className={ui.sessions}>
                  {learners.map((l) => (
                    <li key={l.id}>
                      <span className={ui.avatarSquare} aria-hidden>{initials(l.name)}</span>
                      <span className={ui.what}>
                        {l.name}
                        <small>{l.nativeLanguage} · {l.goal}</small>
                      </span>
                      <span className={ui.statusPill}>{l.level}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className={ui.bandStatement}>
                  <p className={ui.bandLabel}>{t("tutor.dash.noLearnersTitle")}</p>
                  <p>{t("tutor.dash.noLearnersBody")}</p>
                </div>
              )}
            </section>

            <section className={ui.band} aria-labelledby="packages-h">
              <h2 id="packages-h" className={ui.bandLabel}>{t("tutor.dash.packages")}</h2>
              <p className={ui.bandEmpty}>{t("tutor.dash.packagesNote")}</p>
              {packageSummary.length > 0 ? (
                <ul className={ui.sessions}>
                  {packageSummary.map((item) => (
                    <li key={`${item.student_id}-${item.started_at}`}>
                      <span className={ui.when}>
                        <b>{pkgDate(item.started_at)}</b>
                        <em>{item.expires_at ? t("tutor.dash.packageTo", { date: pkgDate(item.expires_at) }) : t("tutor.dash.noEndDate")}</em>
                      </span>
                      <span className={ui.what}>
                        {item.student_name}
                        <small>{item.package_name} · {item.tier || t("tutor.dash.oneTime")} · {item.subject || t("tutor.dash.learningPlan")}</small>
                      </span>
                      <span className={`${ui.statusPill} ${item.status === "active" ? ui.statusOk : ""}`}>{statusLabel(item.status)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className={ui.bandStatement}>
                  <p className={ui.bandLabel}><PackageCheck size={13} aria-hidden /> {t("tutor.dash.noBillingTitle")}</p>
                  <p>{t("tutor.dash.noBillingBody")}</p>
                </div>
              )}
            </section>

            <section className={ui.band} aria-labelledby="feedback-h">
              <h2 id="feedback-h" className={ui.bandLabel}>{t("tutor.dash.feedbackTitle")}</h2>
              {/* The old form posted to /api/tutor/feedback, which existed
                  nowhere; feedback is per session on the real API. */}
              <div className={ui.form}>
                <label>{t("tutor.dash.sessionLabel")}
                  <select className={ui.select} value={fbSessionId} onChange={(e) => setFbSessionId(e.target.value)} required>
                    <option value="">{t("tutor.dash.selectSession")}</option>
                    {sessions.filter((s) => s.status === "scheduled" || s.status === "completed").map((s) => <option key={s.id} value={s.id}>{localDay(s.startsAt)} {localTime(s.startsAt)} — {s.learner}</option>)}
                  </select>
                </label>
                <label>{t("tutor.dash.lessonTopic")}
                  <input className={ui.input} value={fbTopic} onChange={(e) => setFbTopic(e.target.value)} placeholder={t("tutor.dash.topicPlaceholder")} />
                </label>
                <label className={ui.wide}>{t("tutor.dash.feedbackLabel")}
                  <textarea className={ui.textarea} value={fbText} onChange={(e) => setFbText(e.target.value)} placeholder={t("tutor.dash.feedbackPlaceholder")} required />
                </label>
                <div className={`${ui.formActions} ${ui.wide}`}>
                  <button
                    type="button"
                    className={ui.btnCoral}
                    disabled={busy === "feedback" || !fbSessionId || !fbText.trim()}
                    onClick={() => runAction("feedback", () => sendSessionFeedback(classId(fbSessionId), fbTopic.trim(), fbText.trim()), t("tutor.dash.feedbackSaved"))}
                  >
                    {busy === "feedback" ? t("tutor.dash.sending") : t("tutor.dash.sendFeedback")}
                  </button>
                </div>
              </div>
            </section>
          </div>

          <aside className={ui.sidePane}>
            <section className={ui.band} aria-label={t("tutor.dash.scheduledClasses")}>
              <Calendar title={t("tutor.dash.scheduledClasses")} events={sessions} />
            </section>

            <section className={ui.band} aria-labelledby="up-h">
              <h2 id="up-h" className={ui.bandLabel}>{t("tutor.dash.upcoming")}</h2>
              {upcoming.length > 0 ? (
                <ul className={ui.sessions}>
                  {upcoming.map((s) => (
                    <li key={s.id}>
                      <span className={ui.when}>
                        <b>{dayNumber(s.startsAt)}</b>
                        <em>{weekday(s.startsAt)} · {localTime(s.startsAt)}</em>
                      </span>
                      <span className={ui.what}>{s.learner}<small>{s.topic}</small></span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className={ui.bandEmpty}>{t("tutor.dash.noUpcoming")}</p>
              )}
            </section>
          </aside>
        </div>
      </div>
    </DashboardShell>
  );
}
