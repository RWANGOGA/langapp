"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, CalendarDays, GraduationCap, LayoutDashboard, UserPlus, Users } from "lucide-react";
import {
  getAdminDashboard,
  getPaymentActivity,
  getPaymentAnalytics,
  type AdminDashboard,
  type PaymentActivity,
  type PaymentAnalytics,
} from "@/lib/admin-data";
import AdminShell from "@/components/admin/AdminShell";
import TutorRoster from "@/components/admin/TutorRoster";
import StudentRoster from "@/components/admin/StudentRoster";
import AssignmentMatrix from "@/components/admin/AssignmentMatrix";
import { MeetingsPanel } from "@/components/admin/MeetingsPanel";
import { SubscriptionManagement } from "@/components/admin/SubscriptionManagement";
import { ActivityLog } from "@/components/admin/ActivityLog";
import PaymentOversight from "@/components/admin/PaymentOversight";
import { useAuth } from "@/lib/auth";
import ui from "@/components/portal/bands.module.css";

// Four headline numbers, each with the icon that names it. Keyed by label so a
// reordered payload cannot put the learner icon beside the session count.
const KPI_ICONS = {
  "Total Tutors": Users,
  "Active Students": GraduationCap,
  "Scheduled Sessions": CalendarDays,
  "Awaiting a tutor": UserPlus,
} as Record<string, typeof Users>;

export default function AdminPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, isAdmin } = useAuth();
  const [data, setData] = useState<AdminDashboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [paymentActivity, setPaymentActivity] = useState<PaymentActivity[]>([]);
  const [paymentAnalytics, setPaymentAnalytics] = useState<PaymentAnalytics | null>(null);

  // An assignment shifts the rosters, the KPIs and the matrix at once, so the
  // overview refetches the operation side rather than patching single rows.
  const reloadDashboard = useCallback(() => {
    getAdminDashboard().then(setData).catch(() => {});
  }, []);

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.push(`/auth/login?callbackUrl=${encodeURIComponent("/admin")}`);
        return;
      }
      if (!isAdmin) {
        router.push("/dashboard");
        return;
      }

      Promise.allSettled([getAdminDashboard(), getPaymentActivity(), getPaymentAnalytics()])
        .then(([dashboard, activity, analytics]) => {
          if (dashboard.status === "rejected") {
            throw dashboard.reason;
          }
          setData(dashboard.value);
          // The ledger is a separate resource: if it is down, the rosters and
          // the matrix still have something true to say, so only the payment
          // band reports the gap.
          if (activity.status === "fulfilled") setPaymentActivity(activity.value);
          if (analytics.status === "fulfilled") setPaymentAnalytics(analytics.value);
        })
        .catch((err) => {
          console.error("Admin dashboard fetch error:", err);
          setError(err instanceof Error ? err.message : "Failed to load admin dashboard data.");
        });
    }
  }, [isAuthenticated, isAdmin, isLoading, router]);

  // Payments move while the page is open; the rest of the operation does not
  // change second to second, so only the money side polls.
  useEffect(() => {
    if (!isAuthenticated || !isAdmin) return;
    const refresh = () =>
      Promise.allSettled([getPaymentActivity(), getPaymentAnalytics()])
        .then(([activity, analytics]) => {
          if (activity.status === "fulfilled") setPaymentActivity(activity.value);
          if (analytics.status === "fulfilled") setPaymentAnalytics(analytics.value);
        });
    const interval = window.setInterval(refresh, 30000);
    return () => window.clearInterval(interval);
  }, [isAuthenticated, isAdmin]);

  if (isLoading || !isAuthenticated || !isAdmin) {
    return (
      <AdminShell adminName={user?.full_name} unread={0}>
        <div className={ui.pageStack}>
          <p className={ui.lede}>Checking your access…</p>
        </div>
      </AdminShell>
    );
  }

  // Loading and failure are different states. The overview runs several
  // database round trips and can take a few seconds; showing "could not be
  // loaded" while it is still arriving is a lie, so only a real error renders
  // the retry band.
  if (error) {
    return (
      <AdminShell adminName={user?.full_name} unread={0}>
        <div className={ui.pageStack}>
          <p role="alert" className={ui.statusBad}>
            {error}
          </p>
          <p>
            <button type="button" className={ui.btn} onClick={() => window.location.reload()}>
              Try again
            </button>
          </p>
        </div>
      </AdminShell>
    );
  }

  if (!data) {
    return (
      <AdminShell adminName={user?.full_name} unread={0}>
        <div className={ui.pageStack}>
          <p className={ui.lede}>Loading the overview…</p>
        </div>
      </AdminShell>
    );
  }

  return (
    <AdminShell adminName={user?.full_name} unread={data.unread}>
      <div className={ui.pageStack}>
        <header className={ui.pageHeading}>
          <div>
            <p className={ui.kicker}>Admin overview</p>
            <h1>Everything the school is running</h1>
            <p>
              Tutors, learners, sessions and payments in one place. Every figure below is read from
              the live database, and anything not yet connected says so instead of pretending.
            </p>
          </div>
          <Link className={ui.headerAction} href="/admin/tutors">
            Tutor roster <ArrowRight size={14} aria-hidden />
          </Link>
        </header>

        <ul className={ui.statsFour}>
          {data.kpis.map((kpi) => {
            const Icon = KPI_ICONS[kpi.label] ?? LayoutDashboard;
            return (
              <li key={kpi.label}>
                <Icon size={16} aria-hidden />
                <span><small>{kpi.label}</small><b>{kpi.value}</b></span>
              </li>
            );
          })}
        </ul>

        {/* The one task on the overview that is a decision, not a figure: how
            many tutor applications the school currently owes an answer on. */}
        <section className={ui.band} aria-label="Tutor application review queue">
          <div className={ui.figureRowAligned}>
            <div className={ui.figureBody}>
              <p className={ui.bandLabel}>Tutor applications</p>
              <h3 className={ui.bandTitle}>
                {data.applications_in_review === 0
                  ? "No applications are waiting on a decision"
                  : `${data.applications_in_review} ${data.applications_in_review === 1 ? "application is" : "applications are"} waiting on a decision`}
              </h3>
              <p className={ui.rowNote}>
                Open the review queue to read each applicant's evidence and move the file forward,
                approve it, or reject it with a note.
              </p>
            </div>
            <Link className={ui.headerAction} href="/admin/applications">
              Review queue <ArrowRight size={14} aria-hidden />
            </Link>
          </div>
        </section>

        <div className={ui.split}>
          <div className={ui.mainPane}>
            <TutorRoster tutors={data.tutors} />
            <StudentRoster students={data.students} tutors={data.tutors} onRefresh={reloadDashboard} />
            <SubscriptionManagement plans={data.plans} leaders={data.leaders} statuses={data.statuses} />
          </div>
          <aside className={ui.sidePane}>
            <MeetingsPanel meetings={data.meetings} />
            <ActivityLog items={data.activity} />
          </aside>
        </div>

        <AssignmentMatrix rows={data.matrix} studentNames={data.student_names} />
        <PaymentOversight analytics={paymentAnalytics} events={paymentActivity} />
      </div>
    </AdminShell>
  );
}
