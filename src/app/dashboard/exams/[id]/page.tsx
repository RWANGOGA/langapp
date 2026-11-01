import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLearnerDashboard } from "@/lib/dashboard-data";
import { getLearnerPaper } from "@/lib/exam-data";
import DashboardShell from "@/components/dashboard/DashboardShell";
import TakeContent from "./TakeContent";

export const metadata: Metadata = { title: "Exam | Learner Dashboard" };

export default async function LearnerExamPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [{ learner }, paper] = await Promise.all([getLearnerDashboard(), getLearnerPaper(id).catch(() => null)]);

  // A paper that is not yours, or no longer there, reads the same way: there is
  // nothing here to open. The API answers 404 either way, so nothing is leaked.
  if (!paper) notFound();

  return (
    <DashboardShell learner={learner}>
      <TakeContent paper={paper} />
    </DashboardShell>
  );
}
