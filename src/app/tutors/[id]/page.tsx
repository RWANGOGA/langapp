import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BadgeCheck, PlayCircle } from "lucide-react";
import { getTutorProfile } from "@/lib/tutors-data";
import styles from "../page.module.css";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const tutor = await getTutorProfile((await params).id);
  return { title: tutor ? `${tutor.name} | Nile Language Tutors` : "Tutor profile | Nile Language" };
}

export default async function TutorProfilePage({ params }: Props) {
  const tutor = await getTutorProfile((await params).id);
  if (!tutor) notFound();

  const evidence: string[] = [];
  if (tutor.qualificationType) evidence.push(`${tutor.qualificationType} teaching qualification — document reviewed and verified by our team`);
  if (tutor.englishProofType) evidence.push(`${tutor.englishProofType} proficiency${tutor.englishScore ? ` · score ${tutor.englishScore}` : ""} — result verified by our team`);
  evidence.push("Identity and background checks completed");
  evidence.push("References contacted and demo lesson observed before approval");

  return (
    <main className={styles.profile}>
      <Link href="/tutors" className={styles.back}>
        <ArrowLeft size={14} aria-hidden /> All tutors
      </Link>

      <h1 className={styles.profileName}>{tutor.name}</h1>
      <p className={styles.profileHeadline}>{tutor.headline}</p>

      <p className={styles.profileMeta}>
        {tutor.reviews > 0 ? (
          <><strong>{tutor.rating.toFixed(1)}</strong> from {tutor.reviews} learner reviews</>
        ) : (
          <>Newly approved faculty</>
        )}
        <span><strong>{tutor.years}</strong> years teaching</span>
        {tutor.country && <span>Based in <strong>{tutor.country}</strong></span>}
        <span>Speaks <strong>{tutor.speaks.join(", ") || "English"}</strong></span>
      </p>

      <section className={styles.profileSection}>
        <h2>About</h2>
        <p>{tutor.bio || "This tutor has not written an introduction yet — it lands on their profile once they add one from the tutor portal."}</p>
        {tutor.specialties.length > 0 && (
          <p>Focus areas: <strong>{tutor.specialties.join(", ")}</strong></p>
        )}
      </section>

      <section className={styles.profileSection}>
        <h2>Verified evidence</h2>
        <ul>
          {evidence.map((e) => (
            <li key={e}><BadgeCheck size={16} aria-hidden /> {e}</li>
          ))}
        </ul>
        {tutor.introVideoUrl && (
          <a className={styles.videoLink} href={tutor.introVideoUrl} target="_blank" rel="noreferrer">
            <PlayCircle size={16} aria-hidden /> Watch the introduction video
          </a>
        )}
      </section>

      <section className={styles.profileSection}>
        <h2>Weekly availability</h2>
        <p>{tutor.availability || "Availability windows appear once the tutor publishes them from their portal."}</p>
      </section>

      <Link
        href={`/auth/register?role=learner&tutor=${encodeURIComponent(tutor.id)}`}
        className={styles.profileCta}
      >
        Start with a trial
      </Link>
    </main>
  );
}
