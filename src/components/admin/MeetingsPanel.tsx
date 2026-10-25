"use client";

import type { Meeting } from "@/lib/admin-data";
import { useLanguage } from "@/i18n/LanguageProvider";
import ui from "@/components/portal/bands.module.css";

export function MeetingsPanel({ meetings }: { meetings: Meeting[] }) {
  const { t } = useLanguage();
  return (
    <section className={ui.band} aria-labelledby="meetings-h">
      <div className={ui.bandHead}>
        <h2 id="meetings-h" className={ui.bandLabel}>{t("admin.meetings.title")}</h2>
        <span className={ui.bandLabel}>{t("admin.meetings.subtitle")}</span>
      </div>

      {meetings.length > 0 ? (
        <ul className={ui.sessions}>
          {meetings.map((meeting) => (
            <li key={meeting.provider}>
              <span className={ui.avatarSquare} aria-hidden>
                {meeting.provider.slice(0, 2).toUpperCase()}
              </span>
              <span className={ui.what}>
                {meeting.provider}
                <small>
                  {meeting.sessions.length > 0
                    ? meeting.sessions.join(" · ")
                    : t("admin.meetings.noSession")}
                </small>
              </span>
              <span className={`${ui.statusPill} ${meeting.connected ? ui.statusOk : ""}`}>
                {meeting.connected ? t("admin.meetings.inUse") : t("admin.meetings.notInUse")}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className={ui.bandEmpty}>{t("admin.meetings.empty")}</p>
      )}

      {/* The old panel offered a "Create Link" button wired to nothing. Links
          are set by the tutor per session, so the panel says so instead. */}
      <p className={ui.packageNote}>
        {t("admin.meetings.note")}
      </p>
    </section>
  );
}
