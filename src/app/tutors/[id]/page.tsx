import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTutorProfile } from "@/lib/tutors-data";
import TutorProfileContent from "@/components/marketing/TutorProfileContent";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const tutor = await getTutorProfile((await params).id);
  return { title: tutor ? `${tutor.name} | Nile Language Tutors` : "Tutor profile | Nile Language" };
}

export default async function TutorProfilePage({ params }: Props) {
  const tutor = await getTutorProfile((await params).id);
  if (!tutor) notFound();

  // The page is fetched out of the backend and the not-found decision stays on
  // the server; only the words are rendered, so they can be rendered in the
  // visitor's language.
  return <TutorProfileContent tutor={tutor} />;
}
