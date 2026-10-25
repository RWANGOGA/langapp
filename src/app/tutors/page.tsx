import type { Metadata } from "next";
import { getTutorDirectory } from "@/lib/tutors-data";
import TutorsContent from "@/components/marketing/TutorsContent";

export const metadata: Metadata = {
  title: "Our Certified English Tutors | Nile Language",
  description:
    "Browse the real Nile Language faculty — every tutor cleared identity checks, credential review, tested English proficiency and an observed demo lesson.",
  alternates: { canonical: "/tutors" },
};

export default async function TutorsPage() {
  const tutors = await getTutorDirectory();
  return <TutorsContent tutors={tutors} />;
}
