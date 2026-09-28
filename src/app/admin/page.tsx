import { getAdminDashboard } from "@/lib/admin-data";
import AdminShell from "@/components/admin/AdminShell";
import TutorRoster from "@/components/admin/TutorRoster";
import AssignmentMatrix from "@/components/admin/AssignmentMatrix";
import { MeetingsPanel } from "@/components/admin/MeetingsPanel";
import { SubscriptionManagement } from "@/components/admin/SubscriptionManagement";
import { ActivityLog } from "@/components/admin/ActivityLog";
import styles from "@/components/admin/admin.module.css";

export default async function AdminPage() {
  const data = await getAdminDashboard();

  return (
    <AdminShell kpis={data.kpis}>
      <div className={styles.adminGrid}>
        <div className={styles.adminLeft}>
          <TutorRoster tutors={data.tutors} />
        </div>
        <div className={styles.adminRight}>
          <AssignmentMatrix rows={data.matrix} />
        </div>
      </div>

      <div className={styles.adminBottom}>
        <MeetingsPanel meetings={data.meetings} />
        <SubscriptionManagement plans={data.plans} leaders={data.leaders} statuses={data.statuses} bars={data.bars} />
        <ActivityLog items={data.activity} />
      </div>
    </AdminShell>
  );
}