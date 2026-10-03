"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { getAdminDashboard, type AdminDashboard } from "@/lib/admin-data";
import AdminShell from "@/components/admin/AdminShell";
import TutorRoster from "@/components/admin/TutorRoster";
import StudentRoster from "@/components/admin/StudentRoster";
import { MeetingsPanel } from "@/components/admin/MeetingsPanel";
import { SubscriptionManagement } from "@/components/admin/SubscriptionManagement";
import { ActivityLog } from "@/components/admin/ActivityLog";
import styles from "@/components/admin/admin.module.css";

type Section = "dashboard" | "tutors" | "students" | "classes" | "meetings" | "subscriptions" | "reports" | "settings";

const sections = new Set<Section>([
  "dashboard",
  "tutors",
  "students",
  "classes",
  "meetings",
  "subscriptions",
  "reports",
  "settings",
]);

function EmptySection({ title, description }: { title: string; description: string }) {
  return (
    <section className={styles.adminCard}>
      <h2>{title}</h2>
      <p>{description}</p>
    </section>
  );
}

function SectionContent({ section, data }: { section: Section; data: AdminDashboard }) {
  switch (section) {
    case "tutors":
      return <TutorRoster tutors={data.tutors} />;
    case "students":
      return <StudentRoster students={data.students} />;
    case "meetings":
      return <MeetingsPanel meetings={data.meetings} />;
    case "subscriptions":
      return <SubscriptionManagement plans={data.plans} leaders={data.leaders} statuses={data.statuses} bars={data.bars} />;
    case "reports":
      return <ActivityLog items={data.activity} />;
    case "classes":
      return <EmptySection title="Classes" description="Class management is not connected to the backend yet." />;
    case "settings":
      return <EmptySection title="Settings" description="Admin settings are not connected to the backend yet." />;
    default:
      return <EmptySection title="Dashboard" description="Choose a section from the admin navigation." />;
  }
}

export default function AdminSectionPage() {
  const router = useRouter();
  const params = useParams<{ section: string }>();
  const { isAuthenticated, isLoading, isAdmin } = useAuth();
  const [data, setData] = useState<AdminDashboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const section = sections.has(params.section as Section) ? (params.section as Section) : "dashboard";

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated || !isAdmin) {
      router.push("/dashboard");
      return;
    }

    getAdminDashboard()
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load admin data."));
  }, [isAuthenticated, isAdmin, isLoading, router]);

  if (isLoading || !isAuthenticated || !isAdmin) {
    return <div className={styles.loading}>Loading...</div>;
  }

  if (error || !data) {
    return (
      <div className={styles.error}>
        <h2>Error Loading Admin Section</h2>
        <p>{error || "Failed to load admin data."}</p>
        <button type="button" onClick={() => window.location.reload()} className="btn-primary">Retry</button>
      </div>
    );
  }

  return (
    <AdminShell kpis={data.kpis} unread={data.unread} activeSection={section}>
      <div className={styles.adminGrid}>
        <div className={styles.adminLeft}>
          <SectionContent section={section} data={data} />
        </div>
      </div>
    </AdminShell>
  );
}
