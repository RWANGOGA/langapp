import type { Metadata } from "next";
import { getLearnerDashboard } from "@/lib/dashboard-data";
import { getLearnerExams } from "@/lib/exam-data";
import DashboardShell from "@/components/dashboard/DashboardShell";
import ExamsContent from "./ExamsContent";

export const metadata: Metadata = { title: "Exams | Learner Dashboard" };

export default async function LearnerExamsPage() {
  const [{ learner }, exams] = await Promise.all([
    getLearnerDashboard(),
    getLearnerExams(),
  ]);

  return (
    <DashboardShell learner={learner}>
      <ExamsContent exams={exams} />
    </DashboardShell>
  );
}
