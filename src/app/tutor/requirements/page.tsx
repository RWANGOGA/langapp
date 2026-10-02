import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, FileText, GraduationCap } from "lucide-react";
import { getTutorRequirements } from "@/lib/tutor-requirements-server";
import styles from "./requirements.module.css";

export const metadata: Metadata = {
  title: "Become a tutor — requirements & verification",
  description:
    "Documents, checks and agreements needed to teach on Nile Language. Read before you apply.",
};

export const dynamic = "force-dynamic";

export default async function TutorRequirementsPage() {
  const requirements = await getTutorRequirements();

  if (!requirements) {
    return (
      <main className={styles.page}>
        <div className={styles.state}>
          <h1 className={styles.stateTitle}>Requirements are unavailable right now</h1>
          <p className={styles.stateText}>
            We could not load the tutor requirements. Please try again shortly.
          </p>
        </div>
      </main>
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.topbar}>
        <Link href="/" className={styles.brand}>
          <GraduationCap size={24} color="#f2541b" aria-hidden /> Nile Language
        </Link>
        <nav className={styles.nav} aria-label="Main">
          <Link href="/tutors" className={styles.navLink}>
            Find a tutor
          </Link>
          <Link href="/auth/login" className={styles.navLink}>
            Sign in
          </Link>
        </nav>
      </header>

      <main className={styles.wrap}>
        <span className={styles.eyebrow}>Step 0 of {requirements.total_steps}</span>
        <h1 className={styles.title}>Become a tutor</h1>
        <p className={styles.lede}>
          Teaching on Nile Language is a reviewed process. Before you create an account,
          here is everything you will need to provide and what we check. Gather your
          documents first — most applicants finish in one sitting.
        </p>

        {/* Submitting is not approval. Stated before anything else. */}
        <div className={styles.disclaimer} role="note">
          <AlertTriangle size={20} aria-hidden />
          <p>{requirements.disclaimer}</p>
        </div>

        <section className={styles.section} aria-labelledby="eligibility-heading">
          <div className={styles.sectionHead}>
            <h2 id="eligibility-heading" className={styles.sectionTitle}>
              Who can apply
            </h2>
            <p className={styles.sectionHint}>You must be able to meet all of these.</p>
          </div>
          <ul className={styles.eligibility}>
            {requirements.eligibility.map((item) => (
              <li key={item}>
                <CheckCircle2 size={18} aria-hidden />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className={styles.section} aria-labelledby="documents-heading">
          <div className={styles.sectionHead}>
            <h2 id="documents-heading" className={styles.sectionTitle}>
              Documents and information you will need
            </h2>
            <p className={styles.sectionHint}>
              Upload each document during your application and prepare the profile information below.
            </p>
          </div>
          <div className={styles.docs}>
            {requirements.documents.map((doc) => (
              <article key={doc.id} className={styles.doc}>
                <div className={styles.docHead}>
                  <h3 className={styles.docTitle}>
                    <FileText size={15} aria-hidden /> {doc.title}
                  </h3>
                  <span
                    className={`${styles.badge} ${doc.required ? "" : styles.badgeOptional}`}
                  >
                    {doc.required ? "Required" : "Optional"}
                  </span>
                </div>
                <p className={styles.docDesc}>{doc.description}</p>
                <div className={styles.docMeta}>
                  {doc.accepted_formats.length > 0 && (
                    <p>
                      <strong>Formats:</strong> {doc.accepted_formats.join(", ")}
                      {doc.max_size_mb ? ` · max ${doc.max_size_mb} MB` : ""}
                    </p>
                  )}
                  {doc.examples.length > 0 && (
                    <p>
                      <strong>Examples:</strong> {doc.examples.join(" · ")}
                    </p>
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.section} aria-labelledby="review-heading">
          <div className={styles.sectionHead}>
            <h2 id="review-heading" className={styles.sectionTitle}>
              What happens after you submit
            </h2>
            <p className={styles.sectionHint}>
              Each stage is reviewed by a person. Timings are indicative, not guaranteed.
            </p>
          </div>
          <ol className={styles.stages}>
            {requirements.review_stages.map((stage) => (
              <li key={stage.key} className={styles.stage}>
                <span className={styles.stageNum} aria-hidden />
                <div className={styles.stageBody}>
                  <h3 className={styles.stageTitle}>{stage.title}</h3>
                  <p className={styles.stageDesc}>{stage.description}</p>
                  <span className={styles.stageDays}>{stage.indicative_days}</span>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className={styles.section} aria-labelledby="policies-heading">
          <div className={styles.sectionHead}>
            <h2 id="policies-heading" className={styles.sectionTitle}>
              Agreements you will accept
            </h2>
            <p className={styles.sectionHint}>
              These are confirmed by you during the application and form part of your tutor
              agreement.
            </p>
          </div>
          <ul className={styles.policies}>
            {requirements.policies.map((policy) => (
              <li key={policy.id}>
                <span className={styles.policyTitle}>{policy.title}</span>
                <span className={styles.policySummary}>{policy.summary}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className={styles.cta} aria-labelledby="start-heading">
          <h2 id="start-heading" className={styles.ctaTitle}>
            Ready to apply?
          </h2>
          <p className={styles.ctaText}>
            Creating an account does not make you a tutor. Your account becomes a tutor
            account only after every document has been reviewed and the demo lesson has
            been passed.
          </p>
          <div className={styles.ctaActions}>
            <Link
              href="/auth/register?intent=tutor"
              className={`${styles.btn} ${styles.btnPrimary}`}
            >
              Start my application
            </Link>
            <Link href="/tutors" className={`${styles.btn} ${styles.btnGhost}`}>
              Browse tutors instead
            </Link>
          </div>
        </section>

        <p className={styles.footnote}>
          Requirements version {requirements.version}
        </p>
      </main>
    </div>
  );
}