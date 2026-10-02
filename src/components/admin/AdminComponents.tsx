"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, Bell, Eye, Pencil, Search, Star, Trash2, MoreHorizontal } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { AssignmentModal } from "./AssignmentModal";
import type { Kpi, CellStatus, MatrixRow, Meeting, Plan, Leader, Activity, TutorStatus } from "@/lib/admin-data";
import styles from "./admin.module.css";

export { default as TutorRoster } from "./TutorRoster";

type BadgeVariant = "coral" | "teal" | "success" | "navy";

const CELL_VARIANT: Record<Exclude<CellStatus, "empty">, BadgeVariant> = {
  pending: "coral", confirmed: "navy", completed: "teal", assigned: "navy", alert: "coral", plus: "teal",
};
const CELL_LABEL: Record<CellStatus, string> = {
  pending: "Pending", confirmed: "Confirmed", completed: "Completed", alert: "Alert", assigned: "Assigned", plus: "+", empty: "",
};
const LEGEND: Exclude<CellStatus, "empty" | "assigned" | "plus">[] = ["pending", "confirmed", "completed", "alert"];

const STATUS_VARIANT: Record<TutorStatus, "teal" | "navy" | "coral"> = {
  Active: "teal",
  Assigned: "navy",
  Onboarding: "coral",
};

const formatToday = () =>
  new Intl.DateTimeFormat("en-US", { weekday: "long", month: "short", day: "numeric", year: "numeric" }).format(new Date());

interface Student {
  id: number;
  name: string;
  email: string;
  isAssigned: boolean;
  currentTutorId?: number;
  currentTutorName?: string;
}

interface Tutor {
  id: number;
  name: string;
  email: string;
  rating: number;
  isApproved: boolean;
  specialties: string[];
}

/* Shell: rendered once by the page. Active sidebar link comes from the URL, not a hard-coded id. */
export function AdminLayout({ kpis, adminName, children }: { kpis: Kpi[]; adminName: string; children: React.ReactNode }) {
  return (
    <div className={styles.adminLayout}>
      <header className={styles.adminHeader}>
        <div className={styles.headerBrand}><span className={styles.brandMark} aria-hidden>◍</span>Nile Language</div>
        <div className={styles.headerActions}>
          <span className={styles.headerAvatar} aria-hidden>{adminName[0]}</span>
          <span>Admin Profile</span>
          <button type="button" className={styles.notificationBell}>
            <Bell size={16} strokeWidth={1.8} /> Notifications
          </button>
        </div>
      </header>
      <div className={styles.adminBody}>
        <aside className={styles.adminSidebar} aria-label="Admin sections">
          <a href="/admin/dashboard" className={`${styles.sidebarItem} ${styles.active}`}>
            <span className={styles.sidebarIcon} aria-hidden>▦</span>
            <span>Dashboard</span>
          </a>
          <a href="/admin/tutors" className={styles.sidebarItem}>
            <span className={styles.sidebarIcon} aria-hidden>👥</span>
            <span>Tutors</span>
          </a>
          <a href="/admin/students" className={styles.sidebarItem}>
            <span className={styles.sidebarIcon} aria-hidden>👥</span>
            <span>Students</span>
          </a>
          <a href="/admin/classes" className={styles.sidebarItem}>
            <span className={styles.sidebarIcon} aria-hidden>🗓</span>
            <span>Classes</span>
          </a>
          <a href="/admin/meetings" className={styles.sidebarItem}>
            <span className={styles.sidebarIcon} aria-hidden>🎥</span>
            <span>Meetings</span>
          </a>
          <a href="/admin/subscriptions" className={styles.sidebarItem}>
            <span className={styles.sidebarIcon} aria-hidden>💳</span>
            <span>Subscriptions</span>
          </a>
          <a href="/admin/reports" className={styles.sidebarItem}>
            <span className={styles.sidebarIcon} aria-hidden>📄</span>
            <span>Reports</span>
          </a>
          <a href="/admin/settings" className={`${styles.sidebarItem} ${styles.push}`}>
            <span className={styles.sidebarIcon} aria-hidden>⚙</span>
            <span>Settings</span>
          </a>
        </aside>
        <main className={styles.adminMain}>
          <div className={styles.adminHeaderContent}>
            <div>
              <h1 className={styles.adminTitle}>Admin & Tutor Management Dashboard</h1>
              <p className={styles.adminSubtitle}>Welcome, {adminName}! | {formatToday()}</p>
            </div>
            <dl className={styles.kpiGrid}>
              {kpis.map((k) => (
                <div key={k.label} className={styles.kpiCard}>
                  <dt className={styles.kpiLabel}>{k.label}</dt>
                  <dd className={styles.kpiValue}>{k.value}</dd>
                </div>
              ))}
            </dl>
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}

export function AssignmentMatrix({ rows }: { rows: MatrixRow[] }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState<number | undefined>(undefined);
  const [selectedTutorId, setSelectedTutorId] = useState<number | undefined>(undefined);
  const [modalMode, setModalMode] = useState<'assign' | 'unassign'>('assign');

  // Mock data for students and tutors
  const mockStudents: Student[] = [
    { id: 1, name: "Emma Johnson", email: "emma@example.com", isAssigned: true, currentTutorId: 101, currentTutorName: "Sarah Miller" },
    { id: 2, name: "David Chen", email: "david@example.com", isAssigned: false },
    { id: 3, name: "Lisa Rodriguez", email: "lisa@example.com", isAssigned: true, currentTutorId: 102, currentTutorName: "Michael Brown" },
    { id: 4, name: "James Wilson", email: "james@example.com", isAssigned: false },
    { id: 5, name: "Maria Garcia", email: "maria@example.com", isAssigned: false },
  ];

  const mockTutors: Tutor[] = [
    { id: 101, name: "Sarah Miller", email: "sarah@example.com", rating: 4.9, isApproved: true, specialties: ["English", "Business"] },
    { id: 102, name: "Michael Brown", email: "michael@example.com", rating: 4.7, isApproved: true, specialties: ["Academic", "IELTS"] },
    { id: 103, name: "Jennifer Lee", email: "jennifer@example.com", rating: 4.8, isApproved: true, specialties: ["Conversation", "Grammar"] },
    { id: 104, name: "Robert Davis", email: "robert@example.com", rating: 4.6, isApproved: true, specialties: ["Writing", "Reading"] },
    { id: 105, name: "Amanda Taylor", email: "amanda@example.com", rating: 4.9, isApproved: true, specialties: ["IELTS", "Speaking"] },
  ];

  const handleAssignStudent = async (studentId: number, tutorId: number) => {
    console.log(`Assigning student ${studentId} to tutor ${tutorId}`);
    await new Promise(resolve => setTimeout(resolve, 1000));
  };

  const handleUnassignStudent = async (studentId: number) => {
    console.log(`Unassigning student ${studentId}`);
    await new Promise(resolve => setTimeout(resolve, 1000));
  };

  const openAssignModal = (studentId?: number, tutorId?: number) => {
    setSelectedStudentId(studentId);
    setSelectedTutorId(tutorId);
    setModalMode('assign');
    setIsModalOpen(true);
  };

  const openUnassignModal = (studentId: number) => {
    setSelectedStudentId(studentId);
    setSelectedTutorId(undefined);
    setModalMode('unassign');
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedStudentId(undefined);
    setSelectedTutorId(undefined);
  };

  return (
    <Card className={styles.adminCard}>
      <div className={styles.cardHeader}>
        <h3>Student-Tutor Assignment Matrix</h3>
        <Button variant="teal" size="sm" className={styles.assignmentToolsBtn} onClick={() => openAssignModal()}>
          Assignment Tools
        </Button>
      </div>
      <div className={styles.matrixContainer} role="table" aria-label="Student tutor assignments">
        <div className={styles.matrixHeader} role="row">
          <span role="columnheader">Tutor</span>
          {[1, 2, 3, 4, 5].map((n) => <span key={n} role="columnheader">Student {n}</span>)}
          <span role="columnheader">Action</span>
        </div>
        {rows.map((r) => (
          <div key={r.tutor} className={styles.matrixRow} role="row">
            <span className={styles.matrixTutor} role="rowheader">{r.tutor}</span>
            {r.cells.map((c, i) => (
              <span key={i} className={styles.matrixStatus} role="cell">
                {c !== "empty" && (
                  <Badge
                    variant={CELL_VARIANT[c]}
                    className={[styles.statusBadge, c === "alert" && styles.alert, c === "plus" && styles.plus].filter(Boolean).join(" ")}
                  >
                    {CELL_LABEL[c]}
                  </Badge>
                )}
              </span>
            ))}
            <span className={styles.matrixAction} role="cell">
              <span className={styles.actionIcons}>
                <button type="button" aria-label={`View ${r.tutor}`} onClick={() => openAssignModal(1, 101)}><Eye size={15} /></button>
                <button type="button" aria-label={`Edit ${r.tutor}`} onClick={() => openAssignModal(1, 101)}><Pencil size={15} /></button>
                <button type="button" aria-label={`Remove ${r.tutor}`} onClick={() => openUnassignModal(1)}><Trash2 size={15} /></button>
              </span>
            </span>
          </div>
        ))}
      </div>
      <ul className={styles.matrixLegend}>
        {LEGEND.map((s) => (
          <li key={s} className={styles.legendItem}><i className={`${styles.legendDot} ${styles[s]}`} />{CELL_LABEL[s]}</li>
        ))}
      </ul>

      {/* Assignment Modal */}
      <AssignmentModal
        isOpen={isModalOpen}
        onClose={closeModal}
        onAssign={handleAssignStudent}
        onUnassign={handleUnassignStudent}
        students={mockStudents}
        tutors={mockTutors}
        selectedStudentId={selectedStudentId}
        selectedTutorId={selectedTutorId}
      />
    </Card>
  );
}

export function MeetingsPanel({ meetings }: { meetings: Meeting[] }) {
  return (
    <Card className={styles.adminCard}>
      <div className={styles.cardHeader}><h3>Video Meeting Integration Panel</h3></div>
      {meetings.map((m) => (
        <div key={m.provider} className={styles.meetingRow}>
          <div className={styles.meetingInfo}>
            <strong>{m.provider}</strong>
            {m.sessions.map((s) => <span key={s}>{s}</span>)}
          </div>
          {/* TODO: POST /api/meetings/link (Meet / Zoom / Teams Graph) */}
          <Button variant="navy" size="sm" className={styles.createLinkBtn}>Create Link</Button>
        </div>
      ))}
    </Card>
  );
}

export function SubscriptionManagement({ plans, leaders }: { plans: Plan[]; leaders: Leader[] }) {
  let acc = 0;
  const stops = plans.map((p) => `${p.color} ${acc}% ${(acc += p.share)}%`).join(", ");
  return (
    <Card className={styles.adminCard}>
      <div className={styles.cardHeader}><h3>Package & Subscription Management</h3></div>
      <div className={styles.donutChart} style={{ background: `conic-gradient(${stops})` }} role="img" aria-label={plans.map((p) => `${p.name} ${p.share}%`).join(", ")} />
      <ul className={styles.chartLegend}>
        {plans.map((p) => <li key={p.name} className={styles.legendItem}><i className={styles.legendDot} style={{ background: p.color }} />{p.name}</li>)}
      </ul>
      <div className={styles.subscriptionLeaders}>
        <h4>Top Performers</h4>
        {leaders.map((l) => <div key={l.name} className={styles.leaderRow}><span>{l.name}</span><strong>{l.value}</strong></div>)}
      </div>
    </Card>
  );
}

export function ActivityLog({ items }: { items: Activity[] }) {
  return (
    <Card className={`${styles.adminCard} ${styles.activityLogCard}`}>
      <div className={styles.cardHeader}><h3>Real-time Activity Log & Notifications</h3></div>
      <ul aria-live="polite">
        {items.map((a) => (
          <li key={a.id} className={styles.activityItem}>
            <span className={styles.activityAvatar} aria-hidden>{a.initial}</span>
            <span className={styles.activityText}>{a.text}</span>
            <small className={styles.activityTime}>{a.time}</small>
          </li>
        ))}
      </ul>
    </Card>
  );
}