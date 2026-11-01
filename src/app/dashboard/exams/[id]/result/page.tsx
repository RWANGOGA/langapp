import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLearnerDashboard } from "@/lib/dashboard-data";
import { getLearnerExams, getLearnerResult, type LearnerResult } from "@/lib/exam-data";
import DashboardShell from "@/components/dashboard/DashboardShell";
import ResultContent from "./ResultContent";

export const metadata: Metadata = { title: "Exam result | Learner Dashboard" };

export default async function LearnerExamResultPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [{ learner }, rows] = await Promise.all([getLearnerDashboard(), getLearnerExams()]);
  const row = rows.find((r) => String(r.id) === id);
  if (!row) notFound();

  // The state is read before the result is asked for, so "your tutor has not
  // published this yet" is reported from what the list already knows instead of
  // being inferred from a failed call - which could equally have been an outage.
  let result: LearnerResult | null = null;
  if (row.state === "released") result = await getLearnerResult(id).catch(() => null);

  return (
    <DashboardShell learner={learner}>
      <ResultContent state={row.state} result={result} title={row.title} />
    </DashboardShell>
  );
}
