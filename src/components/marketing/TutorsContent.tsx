"use client";

import { Hero, PageShell } from "@/components/marketing/Sections";
import type { DirectoryTutor } from "@/lib/tutors-data";
import { useLanguage } from "@/i18n/LanguageProvider";
import TutorDirectory from "@/app/tutors/TutorDirectory";

/**
 * Tutors page chrome is translated; the faculty themselves (names, headlines,
 * specialties, ratings) come from the backend and are passed in as props.
 */
export default function TutorsContent({ tutors }: { tutors: DirectoryTutor[] }) {
  const { t } = useLanguage();

  return (
    <PageShell>
      <Hero
        kicker={t("tutors.hero.kicker")}
        title={t("tutors.hero.title")}
        lede={t("tutors.hero.lede")}
      />
      <TutorDirectory tutors={tutors} />
    </PageShell>
  );
}
