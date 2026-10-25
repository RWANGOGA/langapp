import type { Metadata } from "next";
import { getLearnerDashboard } from "@/lib/dashboard-data";
import DashboardShell from "@/components/dashboard/DashboardShell";
import ProgressContent from "./ProgressContent";

export const metadata: Metadata = { title: "Progress | Learner Dashboard" };

export default async function LearnerProgressPage() {
  const { learner, progress } = await getLearnerDashboard();
  return (
    <DashboardShell learner={learner}>
      <ProgressContent progress={progress} />
    </DashboardShell>
  );
}
