import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2, ExternalLink, Star } from "lucide-react";
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

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link href="/tutors" className={styles.brand}><ArrowLeft size={18} aria-hidden /> All tutors</Link>
        <Link href="/" className={styles.headerLink}>Nile Language</Link>
      </header>
      <article className={styles.profile}>
        <div className={styles.profileHero}>
          {tutor.avatarUrl ? <Image src={tutor.avatarUrl} alt={tutor.name} width={140} height={140} className={styles.profileAvatar} /> : <div className={styles.profileAvatarFallback}>{tutor.name.split(" ").map((part) => part[0]).join("").slice(0, 2)}</div>}
          <div>
            <p className={styles.profileEyebrow}>Approved Nile Language tutor</p>
            <h1>{tutor.name}</h1>
            <p className={styles.profileHeadline}>{tutor.headline}</p>
            <p className={styles.meta}><Star size={15} fill="#f5b301" stroke="#f5b301" aria-hidden /> <strong>{tutor.rating.toFixed(1)}</strong> · {tutor.reviews} reviews · {tutor.years} years · {tutor.country}</p>
          </div>
        </div>
        <div className={styles.profileGrid}>
          <section className={styles.profileSection}><h2>About this tutor</h2><p>{tutor.bio || "This tutor has not added a biography yet."}</p></section>
          <section className={styles.profileSection}><h2>Teaching profile</h2><p><strong>Specialties:</strong> {tutor.specialties.join(", ") || "Not listed"}</p><p><strong>Languages:</strong> {tutor.speaks.join(", ") || "English"}</p><p><strong>Availability:</strong> {tutor.availability || "Discuss availability during onboarding"}</p></section>
          <section className={styles.profileSection}><h2>Verified evidence</h2><p><CheckCircle2 size={16} aria-hidden /> {tutor.qualificationType || "Teaching qualification reviewed"}</p><p><CheckCircle2 size={16} aria-hidden /> {tutor.englishProofType || "English proficiency reviewed"}{tutor.englishScore ? ` · ${tutor.englishScore}` : ""}</p>{tutor.introVideoUrl && <a className={styles.profileLink} href={tutor.introVideoUrl} target="_blank" rel="noreferrer">Watch introduction <ExternalLink size={15} aria-hidden /></a>}</section>
          <section className={styles.profileSection}><h2>Onboarding fee</h2><p className={styles.fee}>{tutor.onboardingFeeUsd > 0 ? `$${tutor.onboardingFeeUsd} USD` : "No onboarding fee"}</p><p className={styles.feeNote}>The fee, when applicable, is confirmed before a learner starts a paid booking.</p></section>
        </div>
        <Link href={`/auth/register?role=learner&tutor=${encodeURIComponent(tutor.id)}`} className={styles.primary}>Book a trial with {tutor.name.split(" ")[0]}</Link>
      </article>
    </main>
  );
}