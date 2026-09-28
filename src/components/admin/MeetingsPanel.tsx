import { Link2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import type { Meeting } from "@/lib/admin-data";
import styles from "./admin.module.css";

const LOGO = { "Google Meet": ["#00832d", "G"], Zoom: ["#2d8cff", "Z"], "MS Teams": ["#5059c9", "T"] } as const;

export function MeetingsPanel({ meetings }: { meetings: Meeting[] }) {
  return (
    <Card className={styles.adminCard}>
      <div className={styles.cardHeader}>
        <h3>Video Meeting Integration Panel</h3>
        <select className={styles.selectSm} aria-label="View"><option>Link Management</option><option>Credentials</option></select>
      </div>
      <div className={styles.intHead}><span>Platform</span><span>Upcoming Session</span><span>Integration Status</span><span /></div>
      {meetings.map((m) => (
        <div key={m.provider} className={styles.intRow}>
          <strong className={styles.provider}><i style={{ background: LOGO[m.provider][0] }}>{LOGO[m.provider][1]}</i>{m.provider}</strong>
          <span className={styles.sessions}>{m.sessions.map((s) => <span key={s}>{s}</span>)}</span>
          <span className={`${styles.integ} ${m.connected ? styles.integOn : ""}`}>{m.connected ? "Connected" : "Integration"} <Link2 size={14} aria-hidden /></span>
          {/* TODO: POST /api/meetings/link (Meet / Zoom / Teams Graph) */}
          <Button variant="navy" size="sm" className={styles.createLinkBtn}>Create Link</Button>
        </div>
      ))}
    </Card>
  );
}