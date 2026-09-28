"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getAdminDashboard } from "@/lib/admin-data";
import AdminShell from "@/components/admin/AdminShell";
import TutorRoster from "@/components/admin/TutorRoster";
import AssignmentMatrix from "@/components/admin/AssignmentMatrix";
import { MeetingsPanel } from "@/components/admin/MeetingsPanel";
import { SubscriptionManagement } from "@/components/admin/SubscriptionManagement";
import { ActivityLog } from "@/components/admin/ActivityLog";
import { useAuth } from "@/lib/auth";
import styles from "@/components/admin/admin.module.css";

export default function AdminPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading, isAdmin } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.push(`/auth/login?callbackUrl=${encodeURIComponent("/admin")}`);
      } else if (!isAdmin) {
        router.push("/auth/login");
      }
    }
  }, [isAuthenticated, isAdmin, isLoading, router]);

  const data = getAdminDashboard();

  if (isLoading || !isAuthenticated || !isAdmin) {
    return (
      <div className={styles.loading}>
        <div>Loading...</div>
      </div>
    );
  }

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