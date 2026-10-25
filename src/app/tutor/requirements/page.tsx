import type { Metadata } from "next";
import ApplicantFrame from "@/components/tutor/ApplicantFrame";
import { getTutorRequirements } from "@/lib/tutor-requirements-server";
import { getApplicantState } from "@/lib/application-status";
import RequirementsContent from "./RequirementsContent";

export const metadata: Metadata = {
  title: "Become a tutor — requirements, review and your progress",
  description:
    "Documents, checks and agreements needed to teach on Nile Language - and, once you have applied, where your application stands.",
};

export const dynamic = "force-dynamic";

export default async function TutorRequirementsPage() {
  const [requirements, state] = await Promise.all([getTutorRequirements(), getApplicantState()]);
  const view = state.kind === "ok" ? state.view : null;

  return (
    <ApplicantFrame signedIn={view !== null}>
      <RequirementsContent requirements={requirements} state={state} />
    </ApplicantFrame>
  );
}
