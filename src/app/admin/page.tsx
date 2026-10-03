"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAdminDashboard, getPaymentActivity, getPaymentAnalytics, type AdminDashboard, type PaymentActivity, type PaymentAnalytics } from "@/lib/admin-data";
import AdminShell from "@/components/admin/AdminShell";
import TutorRoster from "@/components/admin/TutorRoster";
import StudentRoster from "@/components/admin/StudentRoster";
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
  const [paymentActivity, setPaymentActivity] = useState<PaymentActivity[]>([]);
  const [paymentAnalytics, setPaymentAnalytics] = useState<PaymentAnalytics | null>(null);

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
      Promise.all([getAdminDashboard(), getPaymentActivity(), getPaymentAnalytics()])
        .then(([d, activity, analytics]) => { setData(d); setPaymentActivity(activity); setPaymentAnalytics(analytics); })
        .catch((err) => {
          console.error("Admin dashboard fetch error:", err);
          setError(err instanceof Error ? err.message : "Failed to load admin dashboard data. Please try again.");
        });
    }
  }, [isAuthenticated, isAdmin, isLoading, router]);

  useEffect(() => {
    if (!isAuthenticated || !isAdmin) return;
    const refresh = () => Promise.all([getPaymentActivity(), getPaymentAnalytics()]).then(([activity, analytics]) => {
      setPaymentActivity(activity);
      setPaymentAnalytics(analytics);
    }).catch(() => undefined);
    const interval = window.setInterval(refresh, 30000);
    return () => window.clearInterval(interval);
  }, [isAuthenticated, isAdmin]);

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
    <AdminShell kpis={data.kpis} unread={data.unread}>
      <div className={styles.adminGrid}>
        <div className={styles.adminLeft}>
          <TutorRoster tutors={data.tutors} />
          <StudentRoster students={data.students} />
        </div>
        <div className={styles.adminRight}>
          <AssignmentMatrix rows={data.matrix} studentNames={data.student_names} />
        </div>
      </div>

      <div className={styles.adminBottom}>
        <MeetingsPanel meetings={data.meetings} />
        <SubscriptionManagement plans={data.plans} leaders={data.leaders} statuses={data.statuses} bars={data.bars} />
        <ActivityLog items={data.activity} />
      </div>
      <section className={styles.paymentOversight} aria-labelledby="payment-oversight-title">
        <div className={styles.adminCard}><div className={styles.cardHeader}><h3 id="payment-oversight-title">Payment oversight</h3><span className={styles.livePill}>Live data</span></div><div className={styles.adminMetricGrid}><div><small>Gross revenue</small><b>${paymentAnalytics?.gross_revenue_usd ?? 0}</b></div><div><small>Successful payments</small><b>{paymentAnalytics?.successful_payments ?? 0}</b></div><div><small>Active subscriptions</small><b>{paymentAnalytics?.active_subscriptions ?? 0}</b></div><div><small>Matching pending</small><b>{paymentAnalytics?.matching_pending ?? 0}</b></div></div></div>
        <div className={styles.adminCard}><div className={styles.cardHeader}><h3>Payment activity</h3><span className={styles.activityRefresh}>Refresh on load</span></div><ul className={styles.paymentActivityList}>{paymentActivity.slice(0, 8).map((event) => <li key={event.id}><span><b>{event.event_type}</b><small>{event.summary}</small></span><time>{new Date(event.created_at).toLocaleString()}</time></li>)}{paymentActivity.length === 0 && <li>No payment events recorded yet.</li>}</ul></div>
      </section>
    </AdminShell>
  );
}