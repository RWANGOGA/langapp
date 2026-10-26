"use client";

import Link from "next/link";
import { ArrowLeft, BadgeCheck, PlayCircle } from "lucide-react";
import type { DirectoryTutor } from "@/lib/tutors-data";
import { useLanguage } from "@/i18n/LanguageProvider";
import styles from "@/app/tutors/page.module.css";

/**
 * The profile page's own words are translated. Everything about the tutor - the
 * name, the headline, the introduction they wrote, the qualification they hold -
 * is theirs, and is printed exactly as the backend sent it. A translated "Based
 * in" must never turn into a translated country.
 */
export default function TutorProfileContent({ tutor }: { tutor: DirectoryTutor }) {
  const { t } = useLanguage();

  // Assembled here rather than served as strings because which lines appear
  // depends on what this person actually submitted: a TEFL and a TOEFL score
  // are facts about them, the sentence around them is ours.
  const evidence: string[] = [];
  if (tutor.qualificationType) {
    evidence.push(
      t("tutors.profile.evidence.qualification", { type: tutor.qualificationType }),
    );
  }
  if (tutor.englishProofType) {
    evidence.push(
      tutor.englishScore
        ? t("tutors.profile.evidence.proficiency", {
            type: tutor.englishProofType,
            score: tutor.englishScore,
          })
        : t("tutors.profile.evidence.proficiencyUnscored", {
            type: tutor.englishProofType,
          }),
    );
  }
  evidence.push(t("tutors.profile.evidence.identity"));
  evidence.push(t("tutors.profile.evidence.references"));

  return (
    <main className={styles.profile}>
      <Link href="/tutors" className={styles.back}>
        <ArrowLeft size={14} aria-hidden /> {t("tutors.profile.back")}
      </Link>

      <h1 className={styles.profileName}>{tutor.name}</h1>
      <p className={styles.profileHeadline}>{tutor.headline}</p>

      <p className={styles.profileMeta}>
        {tutor.reviews > 0 ? (
          <>
            <strong>{tutor.rating.toFixed(1)}</strong>{" "}
            {t(
              tutor.reviews === 1 ? "tutors.fromReviewsOne" : "tutors.fromReviewsOther",
              { n: tutor.reviews },
            )}
          </>
        ) : (
          <>{t("tutors.newlyApproved")}</>
        )}
        <span>{t("tutors.yrsTeaching", { n: tutor.years })}</span>
        {tutor.country && (
          <span>{t("tutors.profile.basedIn", { country: tutor.country })}</span>
        )}
        <span>
          {t("tutors.speaks", {
            langs: tutor.speaks.join(", ") || t("tutors.defaultLang"),
          })}
        </span>
      </p>

      <section className={styles.profileSection}>
        <h2>{t("tutors.profile.about")}</h2>
        <p>{tutor.bio || t("tutors.profile.noBio")}</p>
        {tutor.specialties.length > 0 && (
          <p>{t("tutors.profile.focus", { areas: tutor.specialties.join(", ") })}</p>
        )}
      </section>

      <section className={styles.profileSection}>
        <h2>{t("tutors.profile.evidence")}</h2>
        <ul>
          {evidence.map((line) => (
            <li key={line}>
              <BadgeCheck size={16} aria-hidden /> {line}
            </li>
          ))}
        </ul>
        {tutor.introVideoUrl && (
          <a className={styles.videoLink} href={tutor.introVideoUrl} target="_blank" rel="noreferrer">
            <PlayCircle size={16} aria-hidden /> {t("tutors.profile.video")}
          </a>
        )}
      </section>

      <section className={styles.profileSection}>
        <h2>{t("tutors.profile.availability")}</h2>
        <p>{tutor.availability || t("tutors.profile.noAvailability")}</p>
      </section>

      <Link
        href={`/auth/register?role=learner&tutor=${encodeURIComponent(tutor.id)}`}
        className={styles.profileCta}
      >
        {t("tutors.startTrial")}
      </Link>
    </main>
  );
}
