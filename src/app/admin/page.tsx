"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAdminDashboard, type AdminDashboard } from "@/lib/admin-data";
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
  const [data, setData] = useState<AdminDashboard | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.push(`/auth/login?callbackUrl=${encodeURIComponent("/admin")}`);
        return;
      }
      if (!isAdmin) {
        router.push("/auth/login");
        return;
      }
      
      // Fetch data after auth check
      getAdminDashboard()
        .then((d) => setData(d))
        .catch((err) => {
          console.error("Admin dashboard fetch error:", err);
          setError(err instanceof Error ? err.message : "Failed to load admin dashboard data. Please try again.");
        });
    }
  }, [isAuthenticated, isAdmin, isLoading, router]);

  if (isLoading || !isAuthenticated || !isAdmin) {
    return (
      <div className={styles.loading}>
        <div>Loading...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className={styles.error}>
        <h2>Error Loading Dashboard</h2>
        <p>{error || "Failed to load admin dashboard"}</p>
        <button onClick={() => window.location.reload()} className="btn-primary">Retry</button>
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