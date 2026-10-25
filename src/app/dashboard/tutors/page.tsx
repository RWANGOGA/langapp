import type { Metadata } from "next";
import { getLearnerDashboard } from "@/lib/dashboard-data";
import DashboardShell from "@/components/dashboard/DashboardShell";
import TutorContent from "./TutorContent";

export const metadata: Metadata = { title: "My Tutor | Learner Dashboard" };

export default async function LearnerTutorPage() {
  const { learner, tutor, progress, nextClass } = await getLearnerDashboard();
  return (
    <DashboardShell learner={learner}>
      <TutorContent tutor={tutor} progress={progress} nextClass={nextClass} />
    </DashboardShell>
  );
}
