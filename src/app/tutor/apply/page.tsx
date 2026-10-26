"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import ApplicantFrame from "@/components/tutor/ApplicantFrame";
import { useAuth } from "@/lib/auth";
import { type ApplicationCompleteness } from "@/lib/tutor-requirements";
import { useLanguage } from "@/i18n/LanguageProvider";
import ui from "@/components/portal/bands.module.css";
import styles from "./apply.module.css";

// Relative so requests go through the Next rewrite and stay first-party.
// Calling ${NEXT_PUBLIC_API_URL} directly is cross-origin and fails CORS
// against the deployed frontend origin.
const PROXY = "/api/v1";

interface TutorApplicationData {
  full_name: string;
  country: string;
  date_of_birth: string;
  id_verification_provider: string;
  id_verification_id: string;
  id_document_url: string;
  qualification_type: string;
  qualification_file_url: string;
  english_proof_type: string;
  english_score: string;
  english_proof_url: string;
  intro_video_url: string;
  years_experience: number;
  specialties: string[];
  languages: string[];
  availability: string;
  tech_confirmed: boolean;
  code_of_conduct_accepted: boolean;
  privacy_agreement_accepted: boolean;
  recording_consent: boolean;
  reference_1_name: string;
  reference_1_email: string;
  reference_2_name: string;
  reference_2_email: string;
  background_check_provider: string;
}

// Display labels are translated; the stored value stays the English name the
// API expects.
const specialtiesOptions: { value: string; key: string }[] = [
  { value: "Business English", key: "apply.spec.business" },
  { value: "Conversational English", key: "apply.spec.conversation" },
  { value: "IELTS Prep", key: "apply.spec.ielts" },
  { value: "TOEFL Prep", key: "apply.spec.toefl" },
  { value: "TOEIC Prep", key: "apply.spec.toeic" },
  { value: "Academic Writing", key: "apply.spec.academic" },
  { value: "General English", key: "apply.spec.general" },
  { value: "English Grammar", key: "apply.spec.grammar" },
  { value: "English Pronunciation", key: "apply.spec.pronunciation" },
];

const languagesOptions: { value: string; key: string }[] = [
  { value: "English", key: "apply.lang.en" },
  { value: "Spanish", key: "apply.lang.es" },
  { value: "French", key: "apply.lang.fr" },
  { value: "German", key: "apply.lang.de" },
  { value: "Chinese", key: "apply.lang.zh" },
  { value: "Japanese", key: "apply.lang.ja" },
  { value: "Korean", key: "apply.lang.ko" },
  { value: "Vietnamese", key: "apply.lang.vi" },
  { value: "Portuguese", key: "apply.lang.pt" },
  { value: "Italian", key: "apply.lang.it" },
  { value: "Russian", key: "apply.lang.ru" },
  { value: "Arabic", key: "apply.lang.ar" },
  { value: "Thai", key: "apply.lang.th" },
  { value: "Indonesian", key: "apply.lang.id" },
  { value: "Turkish", key: "apply.lang.tr" },
];

type RequiredField = keyof TutorApplicationData;

// Mirrors app/services/application_completeness.py on the backend: same
// steps, same titles, same presence rules (consents affirmatively true,
// lists non-empty, emails parseable). Keeping the two in sync means the
// form can gate submit on what the applicant has actually typed - the
// server-side completeness endpoint only ever sees a saved draft, and
// nothing is saved until submit.
const requiredByStep: { step: number; titleKey: string; introKey: string; fields: RequiredField[] }[] = [
  { step: 1, titleKey: "apply.step1.title", introKey: "apply.step1.intro", fields: ["full_name", "country"] },
  {
    step: 2,
    titleKey: "apply.step2.title",
    introKey: "apply.step2.intro",
    fields: [
      "id_verification_provider",
      "id_verification_id",
      "id_document_url",
      "qualification_type",
      "qualification_file_url",
    ],
  },
  {
    step: 3,
    titleKey: "apply.step3.title",
    introKey: "apply.step3.intro",
    fields: ["english_proof_type", "english_score", "english_proof_url"],
  },
  {
    step: 4,
    titleKey: "apply.step4.title",
    introKey: "apply.step4.intro",
    fields: ["intro_video_url"],
  },
  { step: 5, titleKey: "apply.step5.title", introKey: "apply.step5.intro", fields: ["specialties", "languages"] },
  { step: 6, titleKey: "apply.step6.title", introKey: "apply.step6.intro", fields: ["availability"] },
  {
    step: 7,
    titleKey: "apply.step7.title",
    introKey: "apply.step7.intro",
    fields: [
      "tech_confirmed",
      "code_of_conduct_accepted",
      "privacy_agreement_accepted",
      "recording_consent",
    ],
  },
  { step: 8, titleKey: "apply.step8.title", introKey: "apply.step8.intro", fields: ["reference_1_name", "reference_1_email"] },
];

// Translation keys for the fields the rail reports as outstanding, so "what's
// left" reads as an instruction rather than a column name.
const FIELD_LABEL: Record<string, string> = {
  full_name: "apply.field.fullName",
  country: "apply.field.country",
  id_verification_provider: "apply.field.idProvider",
  id_verification_id: "apply.field.idNumber",
  id_document_url: "apply.field.idLink",
  qualification_type: "apply.field.qualType",
  qualification_file_url: "apply.field.qualLink",
  english_proof_type: "apply.field.englishTest",
  english_score: "apply.field.englishScore",
  english_proof_url: "apply.field.englishLink",
  intro_video_url: "apply.field.videoLink",
  specialties: "apply.field.specialties",
  languages: "apply.field.languages",
  availability: "apply.field.availability",
  tech_confirmed: "apply.miss.tech",
  code_of_conduct_accepted: "apply.miss.conduct",
  privacy_agreement_accepted: "apply.miss.privacy",
  recording_consent: "apply.miss.recording",
  reference_1_name: "apply.field.ref1Name",
  reference_1_email: "apply.field.ref1Email",
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isFieldMissing(name: RequiredField, value: TutorApplicationData[RequiredField]): boolean {
  if (typeof value === "boolean") return !value;
  if (Array.isArray(value)) return value.length === 0;
  const text = String(value ?? "").trim();
  if (!text) return true;
  if (name === "reference_1_email" || name === "reference_2_email") {
    return !emailPattern.test(text);
  }
  return false;
}

function evaluateLocalCompleteness(
  data: TutorApplicationData,
  translate: (key: string) => string,
): ApplicationCompleteness {
  const steps = requiredByStep.map(({ step, titleKey, fields }) => {
    const missing = fields.filter((name) => isFieldMissing(name, data[name]));
    return { step, title: translate(titleKey), complete: missing.length === 0, missing };
  });
  const incomplete_steps = steps.filter((s) => !s.complete).map((s) => s.step);
  return { steps, incomplete_steps, can_submit: incomplete_steps.length === 0 };
}

export default function TutorApplicationPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const { isAuthenticated, isTutor, isLoading: authLoading } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [applicationExists, setApplicationExists] = useState(false);
  const [applicationStatus, setApplicationStatus] = useState<string | null>(null);
  // A file that exists but is past the editable window (in review, approved or
  // withdrawn) must not open a fresh form - that would invite a duplicate
  // submission the API would reject. It points to the status page instead.
  const [locked, setLocked] = useState(false);

  const [data, setData] = useState<TutorApplicationData>({
    full_name: "",
    country: "",
    date_of_birth: "",
    id_verification_provider: "",
    id_verification_id: "",
    id_document_url: "",
    qualification_type: "",
    qualification_file_url: "",
    english_proof_type: "",
    english_score: "",
    english_proof_url: "",
    intro_video_url: "",
    years_experience: 0,
    specialties: [],
    languages: [],
    availability: "",
    // Consents start unticked. Pre-ticking a legal agreement records
    // acceptance the applicant never gave.
    tech_confirmed: false,
    code_of_conduct_accepted: false,
    privacy_agreement_accepted: false,
    recording_consent: false,
    reference_1_name: "",
    reference_1_email: "",
    reference_2_name: "",
    reference_2_email: "",
    background_check_provider: "",
  });

  // Recomputed on every keystroke so the rail and the submit gate reflect what
  // the applicant has actually typed - a server round-trip can never see
  // unsaved input.
  const completeness = useMemo(() => evaluateLocalCompleteness(data, t), [data, t]);

  const checkExistingApplication = useCallback(async () => {
    try {
      const response = await fetch(`${PROXY}/tutor/applications/me`, {
        credentials: "include",
      });
      if (response.ok) {
        const app = await response.json();
        const editable = ["submitted", "documents_review", "rejected"].includes(app.status);
        if (editable) {
          setApplicationExists(true);
          setApplicationStatus(app.status);
          // Resume where the applicant left off rather than restarting at step 1.
          setCurrentStep(app.current_step || 1);
          setData((prev) => ({
            ...prev,
            full_name: app.full_name || prev.full_name,
            country: app.country || prev.country,
            date_of_birth: app.date_of_birth || prev.date_of_birth,
            id_verification_provider: app.id_verification_provider || prev.id_verification_provider,
            id_verification_id: app.id_verification_id || prev.id_verification_id,
            id_document_url: app.id_document_url || prev.id_document_url,
            qualification_type: app.qualification_type || prev.qualification_type,
            qualification_file_url: app.qualification_file_url || prev.qualification_file_url,
            english_proof_type: app.english_proof_type || prev.english_proof_type,
            english_score: app.english_score || prev.english_score,
            english_proof_url: app.english_proof_url || prev.english_proof_url,
            intro_video_url: app.intro_video_url || prev.intro_video_url,
            years_experience: app.years_experience ?? prev.years_experience,
            specialties: app.specialties?.length ? app.specialties : prev.specialties,
            languages: app.languages?.length ? app.languages : prev.languages,
            availability: app.availability_json || prev.availability,
            // Consents are restored only if they were genuinely recorded.
            tech_confirmed: app.tech_confirmed === true,
            code_of_conduct_accepted: app.code_of_conduct_accepted === true,
            privacy_agreement_accepted: app.privacy_agreement_accepted === true,
            recording_consent: app.recording_consent === true,
            reference_1_name: app.reference_1_name || prev.reference_1_name,
            reference_1_email: app.reference_1_email || prev.reference_1_email,
            reference_2_name: app.reference_2_name || prev.reference_2_name,
            reference_2_email: app.reference_2_email || prev.reference_2_email,
            background_check_provider:
              app.background_check_provider || prev.background_check_provider,
          }));
        } else {
          // The file exists but is no longer applicant-editable (in review past
          // documents, approved, or withdrawn). A fresh form here would only
          // produce a duplicate the API rejects, so point to the status page.
          setApplicationExists(true);
          setApplicationStatus(app.status);
          setLocked(true);
        }
      }
    } catch {
      // No application found, continue with fresh form
    }
  }, []);

  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated) {
        router.push(`/auth/login?callbackUrl=${encodeURIComponent("/tutor/apply")}`);
        return;
      }
      // Any signed-in applicant may have a draft to resume. This used to be
      // gated on `isTutor`, which is inverted: only students can apply, so a
      // student's saved application was never loaded back.
      void checkExistingApplication();
    }
  }, [isAuthenticated, isTutor, authLoading, router, checkExistingApplication]);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError("");

    try {
      // PATCH takes a flat payload (TutorApplicationUpdate); POST takes the
      // nested step1..step8 shape. Previously both used the nested shape, so
      // saving over an existing application silently changed nothing.
      const flat = {
        full_name: data.full_name,
        country: data.country,
        date_of_birth: data.date_of_birth || undefined,
        id_verification_provider: data.id_verification_provider || undefined,
        id_verification_id: data.id_verification_id || undefined,
        id_document_url: data.id_document_url || undefined,
        qualification_type: data.qualification_type || undefined,
        qualification_file_url: data.qualification_file_url || undefined,
        english_proof_type: data.english_proof_type || undefined,
        english_score: data.english_score || undefined,
        english_proof_url: data.english_proof_url || undefined,
        intro_video_url: data.intro_video_url || undefined,
        years_experience: data.years_experience,
        specialties: data.specialties,
        languages: data.languages,
        availability_json: data.availability || undefined,
        tech_confirmed: data.tech_confirmed,
        code_of_conduct_accepted: data.code_of_conduct_accepted,
        privacy_agreement_accepted: data.privacy_agreement_accepted,
        recording_consent: data.recording_consent,
        reference_1_name: data.reference_1_name || undefined,
        reference_1_email: data.reference_1_email || undefined,
        reference_2_name: data.reference_2_name || undefined,
        reference_2_email: data.reference_2_email || undefined,
        background_check_provider: data.background_check_provider || undefined,
      };

      const nested = {
        step1: { full_name: data.full_name, country: data.country, date_of_birth: data.date_of_birth || undefined },
        step2: {
          id_verification_provider: data.id_verification_provider || undefined,
          id_verification_id: data.id_verification_id || undefined,
          id_document_url: data.id_document_url || undefined,
          qualification_type: data.qualification_type || undefined,
          qualification_file_url: data.qualification_file_url || undefined,
        },
        step3: {
          english_proof_type: data.english_proof_type || undefined,
          english_score: data.english_score || undefined,
          english_proof_url: data.english_proof_url || undefined,
        },
        step4: { intro_video_url: data.intro_video_url || undefined, years_experience: data.years_experience },
        step5: { specialties: data.specialties, languages: data.languages },
        step6: { availability: data.availability || undefined },
        step7: {
          tech_confirmed: data.tech_confirmed,
          code_of_conduct_accepted: data.code_of_conduct_accepted,
          privacy_agreement_accepted: data.privacy_agreement_accepted,
          recording_consent: data.recording_consent,
        },
        step8: {
          reference_1_name: data.reference_1_name || undefined,
          reference_1_email: data.reference_1_email || undefined,
          reference_2_name: data.reference_2_name || undefined,
          reference_2_email: data.reference_2_email || undefined,
          background_check_provider: data.background_check_provider || undefined,
        },
      };

      // PATCH takes a flat payload (TutorApplicationUpdate) and only accepts
      // applications in submitted/documents_review. POST takes the nested
      // step1..step8 shape and is the resubmission path for rejected ones,
      // so the right verb depends on the stored application's status.
      const editInPlace =
        applicationExists &&
        (applicationStatus === "submitted" || applicationStatus === "documents_review");
      const method = editInPlace ? "PATCH" : "POST";
      const url = editInPlace ? `${PROXY}/tutor/applications/me` : `${PROXY}/tutor/applications`;

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(editInPlace ? flat : nested),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || t("apply.error.generic"));
      }

      setSuccess(true);
      setTimeout(() => {
        // Applicants are students until approved, so /tutor (the tutor
        // dashboard) would bounce them. /tutor/requirements now shows where
        // the file stands and what happens next.
        router.push("/tutor/requirements");
      }, 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("apply.error.fallback"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const nextStep = () => setCurrentStep((s) => Math.min(8, s + 1));
  const prevStep = () => setCurrentStep((s) => Math.max(1, s - 1));
  const goToStep = (n: number) => setCurrentStep(n);

  const toggleSpecialty = (specialty: string) => {
    setData((d) => ({
      ...d,
      specialties: d.specialties.includes(specialty)
        ? d.specialties.filter((s) => s !== specialty)
        : [...d.specialties, specialty],
    }));
  };

  const toggleLanguage = (language: string) => {
    setData((d) => ({
      ...d,
      languages: d.languages.includes(language)
        ? d.languages.filter((l) => l !== language)
        : [...d.languages, language],
    }));
  };

  const set = <K extends keyof TutorApplicationData>(key: K, value: TutorApplicationData[K]) =>
    setData((d) => ({ ...d, [key]: value }));

  if (authLoading) {
    return (
      <ApplicantFrame>
        <p className={ui.bandEmpty}>{t("apply.loading")}</p>
      </ApplicantFrame>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  if (success) {
    return (
      <ApplicantFrame signedIn>
        <section className={ui.bandStatement} role="status">
          <span className={ui.bandLabel}>{t("apply.success.label")}</span>
          <h1 className={ui.bandTitle}>{t("apply.success.title")}</h1>
          <p>{t("apply.success.body")}</p>
          <p className={ui.joinRow}>
            <Link href="/tutor/requirements" className={ui.btnCoral}>
              {t("apply.success.action")}
            </Link>
          </p>
        </section>
      </ApplicantFrame>
    );
  }

  if (locked) {
    const approved = applicationStatus === "approved";
    return (
      <ApplicantFrame signedIn>
        <section className={ui.bandStatement} role="status">
          <span className={ui.bandLabel}>{t("apply.locked.label")}</span>
          <h1 className={ui.bandTitle}>
            {approved ? t("apply.locked.approvedTitle") : t("apply.locked.reviewTitle")}
          </h1>
          <p>{approved ? t("apply.locked.approvedBody") : t("apply.locked.reviewBody")}</p>
          <p className={ui.joinRow}>
            <Link href={approved ? "/tutor" : "/tutor/requirements"} className={ui.btnCoral}>
              {approved ? t("apply.locked.openDashboard") : t("apply.locked.reviewAction")}
            </Link>
          </p>
        </section>
      </ApplicantFrame>
    );
  }

  const meta = requiredByStep[currentStep - 1];

  return (
    <ApplicantFrame signedIn>
      <div className={ui.pageHeading}>
        <div>
          <span className={ui.kicker}>{t("apply.kicker")}</span>
          <h1>{t("apply.title")}</h1>
          <p>{t("apply.lede")}</p>
        </div>
      </div>

      {applicationExists && applicationStatus === "rejected" && (
        <section className={ui.band}>
          <span className={ui.bandLabel}>{t("apply.reopened.label")}</span>
          <h2 className={ui.bandTitle}>{t("apply.reopened.title")}</h2>
          <p className={ui.bandEmpty}>{t("apply.reopened.body")}</p>
        </section>
      )}

      {error && (
        <section className={ui.band} role="alert">
          <span className={ui.bandLabel}>{t("apply.error.label")}</span>
          <p className={ui.bandEmpty}>{error}</p>
        </section>
      )}

      <div className={ui.split}>
        <div className={ui.mainPane}>
          <section className={ui.band} aria-labelledby="step-heading">
            <div className={ui.bandHead}>
              <span className={ui.bandLabel}>{t("apply.stepCounter", { step: currentStep })}</span>
              <span className={ui.bandLabel}>
                {completeness.can_submit
                  ? t("apply.readyToSubmit")
                  : t("apply.toFinish", { count: completeness.incomplete_steps.length })}
              </span>
            </div>
            <h2 id="step-heading" className={ui.bandTitle}>
              {t(meta.titleKey)}
            </h2>
            <p className={ui.bandEmpty}>{t(meta.introKey)}</p>

            {currentStep === 1 && (
              <div className={ui.form}>
                <label>
                  {t("apply.field.fullName")}
                  <input className={ui.input} type="text" value={data.full_name} onChange={(e) => set("full_name", e.target.value)} />
                </label>
                <label>
                  {t("apply.field.country")}
                  <input className={ui.input} type="text" value={data.country} onChange={(e) => set("country", e.target.value)} />
                </label>
                <label>
                  {t("apply.field.dob")}
                  <input className={ui.input} type="date" value={data.date_of_birth} onChange={(e) => set("date_of_birth", e.target.value)} />
                </label>
              </div>
            )}

            {currentStep === 2 && (
              <div className={ui.form}>
                <label>
                  {t("apply.field.idProvider")}
                  <select className={ui.select} value={data.id_verification_provider} onChange={(e) => set("id_verification_provider", e.target.value)}>
                    <option value="">{t("apply.ph.selectProvider")}</option>
                    <option value="jumio">Jumio</option>
                    <option value="onfido">Onfido</option>
                    <option value="other">{t("apply.opt.other")}</option>
                  </select>
                </label>
                <label>
                  {t("apply.field.idNumber")}
                  <input className={ui.input} type="text" value={data.id_verification_id} onChange={(e) => set("id_verification_id", e.target.value)} />
                </label>
                <label>
                  {t("apply.field.idLink")}
                  <input className={ui.input} type="url" placeholder="https://…" value={data.id_document_url} onChange={(e) => set("id_document_url", e.target.value)} />
                  <span className={styles.fieldNote}>{t("apply.field.idLinkNote")}</span>
                </label>
                <label>
                  {t("apply.field.qualType")}
                  <input className={ui.input} type="text" placeholder={t("apply.ph.qualType")} value={data.qualification_type} onChange={(e) => set("qualification_type", e.target.value)} />
                </label>
                <label>
                  {t("apply.field.qualLink")}
                  <input className={ui.input} type="url" placeholder="https://…" value={data.qualification_file_url} onChange={(e) => set("qualification_file_url", e.target.value)} />
                </label>
              </div>
            )}

            {currentStep === 3 && (
              <div className={ui.form}>
                <label>
                  {t("apply.field.englishTest")}
                  <select className={ui.select} value={data.english_proof_type} onChange={(e) => set("english_proof_type", e.target.value)}>
                    <option value="">{t("apply.ph.selectTest")}</option>
                    <option value="IELTS">IELTS</option>
                    <option value="TOEFL">TOEFL</option>
                    <option value="TOEIC">TOEIC</option>
                    <option value="Cambridge">{t("apply.opt.cambridge")}</option>
                    <option value="Duolingo">{t("apply.opt.duolingo")}</option>
                    <option value="other">{t("apply.opt.other")}</option>
                  </select>
                </label>
                <label>
                  {t("apply.field.englishScore")}
                  <input className={ui.input} type="text" placeholder={t("apply.ph.score")} value={data.english_score} onChange={(e) => set("english_score", e.target.value)} />
                </label>
                <label className={ui.wide}>
                  {t("apply.field.englishLink")}
                  <input className={ui.input} type="url" placeholder="https://…" value={data.english_proof_url} onChange={(e) => set("english_proof_url", e.target.value)} />
                </label>
              </div>
            )}

            {currentStep === 4 && (
              <div className={ui.form}>
                <label className={ui.wide}>
                  {t("apply.field.videoLink")}
                  <input className={ui.input} type="url" placeholder="https://…" value={data.intro_video_url} onChange={(e) => set("intro_video_url", e.target.value)} />
                </label>
                <label>
                  {t("apply.field.years")}
                  <input className={ui.input} type="number" min="0" max="50" value={data.years_experience} onChange={(e) => set("years_experience", parseInt(e.target.value) || 0)} />
                </label>
              </div>
            )}

            {currentStep === 5 && (
              <>
                <span className={ui.subHead}>{t("apply.field.specialties")}</span>
                <div className={styles.chips}>
                  {specialtiesOptions.map((spec) => (
                    <label key={spec.value} className={`${styles.chip} ${data.specialties.includes(spec.value) ? styles.chipOn : ""}`}>
                      <input type="checkbox" checked={data.specialties.includes(spec.value)} onChange={() => toggleSpecialty(spec.value)} />
                      {t(spec.key)}
                    </label>
                  ))}
                </div>
                <span className={ui.subHead}>{t("apply.field.languages")}</span>
                <div className={styles.chips}>
                  {languagesOptions.map((lang) => (
                    <label key={lang.value} className={`${styles.chip} ${data.languages.includes(lang.value) ? styles.chipOn : ""}`}>
                      <input type="checkbox" checked={data.languages.includes(lang.value)} onChange={() => toggleLanguage(lang.value)} />
                      {t(lang.key)}
                    </label>
                  ))}
                </div>
              </>
            )}

            {currentStep === 6 && (
              <label>
                {t("apply.field.availability")}
                <textarea className={ui.textarea} rows={5} placeholder={t("apply.ph.availability")} value={data.availability} onChange={(e) => set("availability", e.target.value)} />
              </label>
            )}

            {currentStep === 7 && (
              <div className={styles.consents}>
                {(
                  [
                    ["tech_confirmed", "apply.consent.tech"],
                    ["code_of_conduct_accepted", "apply.consent.conduct"],
                    ["privacy_agreement_accepted", "apply.consent.privacy"],
                    ["recording_consent", "apply.consent.recording"],
                  ] as const
                ).map(([key, labelKey]) => (
                  <label key={key} className={`${styles.consent} ${data[key] ? styles.consentOn : ""}`}>
                    <input type="checkbox" checked={data[key]} onChange={(e) => set(key, e.target.checked)} />
                    {t(labelKey)}
                  </label>
                ))}
              </div>
            )}

            {currentStep === 8 && (
              <div className={ui.form}>
                <label>
                  {t("apply.field.ref1Name")}
                  <input className={ui.input} type="text" value={data.reference_1_name} onChange={(e) => set("reference_1_name", e.target.value)} />
                </label>
                <label>
                  {t("apply.field.ref1Email")}
                  <input className={ui.input} type="email" value={data.reference_1_email} onChange={(e) => set("reference_1_email", e.target.value)} />
                </label>
                <label>
                  {t("apply.field.ref2Name")}
                  <input className={ui.input} type="text" value={data.reference_2_name} onChange={(e) => set("reference_2_name", e.target.value)} />
                </label>
                <label>
                  {t("apply.field.ref2Email")}
                  <input className={ui.input} type="email" value={data.reference_2_email} onChange={(e) => set("reference_2_email", e.target.value)} />
                </label>
                <label className={ui.wide}>
                  {t("apply.field.bgProvider")}
                  <select className={ui.select} value={data.background_check_provider} onChange={(e) => set("background_check_provider", e.target.value)}>
                    <option value="">{t("apply.ph.selectProvider")}</option>
                    <option value="checkr">Checkr</option>
                    <option value="goodhire">GoodHire</option>
                    <option value="goodly">Goodly</option>
                  </select>
                </label>
              </div>
            )}

            <div className={styles.stepNav}>
              {currentStep > 1 ? (
                <button type="button" className={ui.btn} onClick={prevStep} disabled={isSubmitting}>
                  {t("apply.nav.previous")}
                </button>
              ) : (
                <span />
              )}
              {currentStep < 8 ? (
                <button type="button" className={ui.btnCoral} onClick={nextStep} disabled={isSubmitting}>
                  {t("apply.nav.next")}
                </button>
              ) : (
                <button
                  type="button"
                  className={ui.btnCoral}
                  onClick={handleSubmit}
                  // The local rules mirror the API's submit gate, including the
                  // four step-7 consents, so the button never offers a
                  // submission the server would reject with 422.
                  disabled={isSubmitting || !completeness.can_submit}
                >
                  {isSubmitting ? t("apply.nav.submitting") : t("apply.nav.submit")}
                </button>
              )}
            </div>
          </section>
        </div>

        <aside className={ui.sidePane}>
          <span className={ui.bandLabel}>{t("apply.progress.label")}</span>
          <ol className={styles.steps} aria-label={t("apply.progress.aria")}>
            {completeness.steps.map((s) => {
              const note = s.complete
                ? t("apply.progress.complete")
                : s.missing.map((m) => t(FIELD_LABEL[m] ?? m)).join(", ");
              return (
                <li
                  key={s.step}
                  className={
                    s.step === currentStep
                      ? styles.stepCurrent
                      : s.complete
                        ? styles.stepDone
                        : undefined
                  }
                >
                  <button type="button" className={styles.step} onClick={() => goToStep(s.step)} aria-current={s.step === currentStep ? "step" : undefined}>
                    <span className={styles.stepMark} aria-hidden />
                    <span>
                      <span className={styles.stepTitle}>{s.title}</span>
                      <span className={styles.stepNote}>{note}</span>
                    </span>
                    <span className={styles.stepWhen}>
                      {s.step === currentStep
                        ? t("apply.progress.now")
                        : s.complete
                          ? t("apply.progress.done")
                          : t("apply.progress.step", { step: s.step })}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
          <p className={styles.fieldNote}>
            <Link href="/tutor/requirements" className={ui.textLink}>
              {t("apply.progress.reviewLink")}
            </Link>
          </p>
        </aside>
      </div>
    </ApplicantFrame>
  );
}
