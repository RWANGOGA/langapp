"use client";

import { ReactNode, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/tutor/DashboardLayout";
import DashboardShell from "@/components/tutor/DashboardShell";
import { useAuth } from "@/lib/auth";
import { getTutorDashboard, TutorDashboard } from "@/lib/tutor-data";
import styles from "@/components/tutor/tutor.module.css";

/**
 * Guard + frame shared by the tutor sub-pages (Learners, Schedule, Notes,
 * Settings). Bounces non-tutors, and reuses the dashboard endpoint for the
 * real header (name + unread badge) so no page invents shell data.
 */
export default function TutorPageShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, isTutor } = useAuth();
  const [header, setHeader] = useState<TutorDashboard["tutor"] | null>(null);

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.push(`/auth/login?callbackUrl=${encodeURIComponent("/tutor")}`);
      } else if (!isTutor) {
        router.push("/dashboard");
      }
    }
  }, [isAuthenticated, isTutor, isLoading, router]);

  useEffect(() => {
    if (isAuthenticated && isTutor) {
      getTutorDashboard()
        .then((d) => setHeader(d.tutor))
        // If the header fetch fails the name from the session is still
        // truthful; only the unread badge falls back to none.
        .catch(() => setHeader({ name: user?.full_name ?? "Tutor", role: "Tutor", unread: 0 }));
    }
  }, [isAuthenticated, isTutor, user?.full_name]);

  if (isLoading || !isAuthenticated || !isTutor || !header) {
    return (
      <div className={styles.loading}>
        <div className={styles.loadingSpinner}>Loading...</div>
      </div>
    );
  }

  return (
    <DashboardLayout>
      <DashboardShell tutor={header}>{children}</DashboardShell>
    </DashboardLayout>
  );
}
