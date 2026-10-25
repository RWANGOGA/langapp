import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { apiGet } from "@/lib/api";
import DashboardShell from "@/components/dashboard/DashboardShell";
import DashboardContent from "./DashboardContent";
import { getLearnerDashboard } from "@/lib/dashboard-data";
import { getPaymentSummary } from "@/lib/payment-data";

export const metadata: Metadata = { title: "Learner Dashboard" };

export default async function DashboardPage() {
  const me = await apiGet<{ role: string }>("/auth/me");
  if (me?.role === "tutor") redirect("/tutor");
  if (me?.role === "admin") redirect("/admin");
  const [{ learner, tutor, nextClass, progress, classes }, payment] = await Promise.all([getLearnerDashboard(), getPaymentSummary()]);

  return (
    <DashboardShell learner={learner}>
      <DashboardContent
        learner={learner}
        tutor={tutor}
        nextClass={nextClass}
        progress={progress}
        classes={classes}
        payment={payment}
      />
    </DashboardShell>
  );
}
