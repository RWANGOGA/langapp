import { Video } from "lucide-react";
import { Card } from "@/components/ui/Card";
import type { Meeting } from "@/lib/admin-data";
import styles from "./admin.module.css";

export default function MeetingsPanel({ meetings }: { meetings: Meeting[] }) {
  return (
    <Card className={styles.adminCard}>
      <h3 className={styles.cardTitle}>Video Meeting Integration Panel</h3>
      {meetings.map((meeting) => (
        <div key={meeting.provider} className={styles.meetingRow}>
          <div className={styles.meetingInfo}>
            <strong>
              <Video size={14} strokeWidth={2} className={styles.meetingIcon} />
              {meeting.provider}
            </strong>
            {meeting.sessions.map((session) => (
              <span key={session}>{session}</span>
            ))}
          </div>
          <button type="button" className={styles.createLinkBtn}>Create Link</button>
        </div>
      ))}
    </Card>
  );
}
