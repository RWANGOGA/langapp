import type { Meeting } from "@/lib/admin-data";
import ui from "@/components/portal/bands.module.css";

export function MeetingsPanel({ meetings }: { meetings: Meeting[] }) {
  return (
    <section className={ui.band} aria-labelledby="meetings-h">
      <div className={ui.bandHead}>
        <h2 id="meetings-h" className={ui.bandLabel}>Meetings</h2>
        <span className={ui.bandLabel}>next 24 hours</span>
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
                    : "No session booked in the next 24 hours"}
                </small>
              </span>
              <span className={`${ui.statusPill} ${meeting.connected ? ui.statusOk : ""}`}>
                {meeting.connected ? "In use" : "Not in use"}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className={ui.bandEmpty}>No video provider has been used for a session yet.</p>
      )}

      {/* The old panel offered a "Create Link" button wired to nothing. Links
          are set by the tutor per session, so the panel says so instead. */}
      <p className={ui.packageNote}>
        Provider accounts are not connected yet. Tutors paste a meeting link onto each session.
      </p>
    </section>
  );
}
