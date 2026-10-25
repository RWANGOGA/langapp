"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import ApplicantFrame from "@/components/tutor/ApplicantFrame";
import { useAuth } from "@/lib/auth";
import { type ApplicationCompleteness } from "@/lib/tutor-requirements";
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

const specialtiesOptions = [
  "Business English",
  "Conversational English",
  "IELTS Prep",
  "TOEFL Prep",
  "TOEIC Prep",
  "Academic Writing",
  "General English",
  "English Grammar",
  "English Pronunciation",
  "Spanish",
  "French",
  "German",
  "Chinese",
  "Japanese",
  "Korean",
];

const languagesOptions = [
  "English",
  "Spanish",
  "French",
  "German",
  "Chinese",
  "Japanese",
  "Korean",
  "Vietnamese",
  "Portuguese",
  "Italian",
  "Russian",
  "Arabic",
  "Thai",
  "Indonesian",
  "Turkish",
];

type RequiredField = keyof TutorApplicationData;

// Mirrors app/services/application_completeness.py on the backend: same
// steps, same titles, same presence rules (consents affirmatively true,
// lists non-empty, emails parseable). Keeping the two in sync means the
// form can gate submit on what the applicant has actually typed - the
// server-side completeness endpoint only ever sees a saved draft, and
// nothing is saved until submit.
const requiredByStep: { step: number; title: string; intro: string; fields: RequiredField[] }[] = [
  { step: 1, title: "Personal details", intro: "Your legal name and the country you're applying from.", fields: ["full_name", "country"] },
  {
    step: 2,
    title: "Identity and qualification documents",
    intro: "Link a government photo ID and your teaching qualification. Set the sharing permission so the review team can open each file.",
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
    title: "English proficiency evidence",
    intro: "Enter your test and score, then link the score report or certificate.",
    fields: ["english_proof_type", "english_score", "english_proof_url"],
  },
  {
    step: 4,
    title: "Introduction video",
    intro: "A 2-5 minute video introducing yourself and your teaching style. An unlisted link is fine.",
    fields: ["intro_video_url"],
  },
  { step: 5, title: "Specialties and languages", intro: "What you teach, and the languages you can teach in.", fields: ["specialties", "languages"] },
  { step: 6, title: "Availability", intro: "The days and hours you can reliably take lessons - say which time zone.", fields: ["availability"] },
  {
    step: 7,
    title: "Agreements and consent",
    intro: "Four confirmations are required before you can teach. Tick each one to accept.",
    fields: [
      "tech_confirmed",
      "code_of_conduct_accepted",
      "privacy_agreement_accepted",
      "recording_consent",
    ],
  },
  { step: 8, title: "References", intro: "At least one referee who can confirm your teaching experience. A second is optional.", fields: ["reference_1_name", "reference_1_email"] },
];

// Human names for the fields the rail reports as outstanding, so "what's left"
// reads as an instruction rather than a column name.
const FIELD_LABEL: Record<string, string> = {
  full_name: "full name",
  country: "country",
  id_verification_provider: "ID verification provider",
  id_verification_id: "ID verification number",
  id_document_url: "government ID link",
  qualification_type: "qualification type",
  qualification_file_url: "qualification file link",
  english_proof_type: "English test",
  english_score: "English score",
  english_proof_url: "English proof link",
  intro_video_url: "introduction video link",
  specialties: "specialties",
  languages: "languages",
  availability: "availability",
  tech_confirmed: "technical setup confirmation",
  code_of_conduct_accepted: "code of conduct",
  privacy_agreement_accepted: "privacy agreement",
  recording_consent: "recording consent",
  reference_1_name: "reference 1 name",
  reference_1_email: "reference 1 email",
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

function evaluateLocalCompleteness(data: TutorApplicationData): ApplicationCompleteness {
  const steps = requiredByStep.map(({ step, title, fields }) => {
    const missing = fields.filter((name) => isFieldMissing(name, data[name]));
    return { step, title, complete: missing.length === 0, missing };
  });
  const incomplete_steps = steps.filter((s) => !s.complete).map((s) => s.step);
  return { steps, incomplete_steps, can_submit: incomplete_steps.length === 0 };
}

export default function TutorApplicationPage() {
  const router = useRouter();
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
  const completeness = useMemo(() => evaluateLocalCompleteness(data), [data]);

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
        throw new Error(errorData.detail || "Submission failed");
      }

      setSuccess(true);
      setTimeout(() => {
        // Applicants are students until approved, so /tutor (the tutor
        // dashboard) would bounce them. /tutor/requirements now shows where
        // the file stands and what happens next.
        router.push("/tutor/requirements");
      }, 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
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
        <p className={ui.bandEmpty}>Loading your application…</p>
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
          <span className={ui.bandLabel}>Submitted</span>
          <h1 className={ui.bandTitle}>Your application is in</h1>
          <p>
            We've received it. Taking you to your application status now, where you can see which
            stage it's at and what happens next.
          </p>
          <p className={ui.joinRow}>
            <Link href="/tutor/requirements" className={ui.btnCoral}>
              See where my file stands
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
          <span className={ui.bandLabel}>Application in review</span>
          <h1 className={ui.bandTitle}>
            {approved ? "You're approved" : "Your application is with our team"}
          </h1>
          <p>
            {approved
              ? "Your tutor account is active. Open your dashboard to start teaching."
              : "This stage is no longer editable by you - a reviewer is working through your file. You can follow exactly where it stands and what happens next on your application status page."}
          </p>
          <p className={ui.joinRow}>
            <Link href={approved ? "/tutor" : "/tutor/requirements"} className={ui.btnCoral}>
              {approved ? "Open my dashboard" : "See where my file stands"}
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
          <span className={ui.kicker}>Tutor application</span>
          <h1>Become a tutor</h1>
          <p>
            Eight short steps. Nothing is saved until you submit, so keep your documents to hand.
            The progress list shows exactly what is still outstanding.
          </p>
        </div>
      </div>

      {applicationExists && applicationStatus === "rejected" && (
        <section className={ui.band}>
          <span className={ui.bandLabel}>Reopened</span>
          <h2 className={ui.bandTitle}>Update and resubmit</h2>
          <p className={ui.bandEmpty}>
            Your previous application wasn't approved. You can revise anything below and submit
            again; your earlier answers are already filled in.
          </p>
        </section>
      )}

      {error && (
        <section className={ui.band} role="alert">
          <span className={ui.bandLabel}>Not submitted</span>
          <p className={ui.bandEmpty}>{error}</p>
        </section>
      )}

      <div className={ui.split}>
        <div className={ui.mainPane}>
          <section className={ui.band} aria-labelledby="step-heading">
            <div className={ui.bandHead}>
              <span className={ui.bandLabel}>Step {currentStep} of 8</span>
              <span className={ui.bandLabel}>{completeness.can_submit ? "Ready to submit" : `${completeness.incomplete_steps.length} to finish`}</span>
            </div>
            <h2 id="step-heading" className={ui.bandTitle}>
              {meta.title}
            </h2>
            <p className={ui.bandEmpty}>{meta.intro}</p>

            {currentStep === 1 && (
              <div className={ui.form}>
                <label>
                  Full name
                  <input className={ui.input} type="text" value={data.full_name} onChange={(e) => set("full_name", e.target.value)} />
                </label>
                <label>
                  Country
                  <input className={ui.input} type="text" value={data.country} onChange={(e) => set("country", e.target.value)} />
                </label>
                <label>
                  Date of birth
                  <input className={ui.input} type="date" value={data.date_of_birth} onChange={(e) => set("date_of_birth", e.target.value)} />
                </label>
              </div>
            )}

            {currentStep === 2 && (
              <div className={ui.form}>
                <label>
                  ID verification provider
                  <select className={ui.select} value={data.id_verification_provider} onChange={(e) => set("id_verification_provider", e.target.value)}>
                    <option value="">Select provider</option>
                    <option value="jumio">Jumio</option>
                    <option value="onfido">Onfido</option>
                    <option value="other">Other</option>
                  </select>
                </label>
                <label>
                  ID verification number
                  <input className={ui.input} type="text" value={data.id_verification_id} onChange={(e) => set("id_verification_id", e.target.value)} />
                </label>
                <label>
                  Government ID link
                  <input className={ui.input} type="url" placeholder="https://…" value={data.id_document_url} onChange={(e) => set("id_document_url", e.target.value)} />
                  <span className={styles.fieldNote}>A Google Drive or secure file link the review team can open.</span>
                </label>
                <label>
                  Qualification type
                  <input className={ui.input} type="text" placeholder="e.g. TEFL, CELTA" value={data.qualification_type} onChange={(e) => set("qualification_type", e.target.value)} />
                </label>
                <label>
                  Qualification file link
                  <input className={ui.input} type="url" placeholder="https://…" value={data.qualification_file_url} onChange={(e) => set("qualification_file_url", e.target.value)} />
                </label>
              </div>
            )}

            {currentStep === 3 && (
              <div className={ui.form}>
                <label>
                  English proficiency test
                  <select className={ui.select} value={data.english_proof_type} onChange={(e) => set("english_proof_type", e.target.value)}>
                    <option value="">Select test type</option>
                    <option value="IELTS">IELTS</option>
                    <option value="TOEFL">TOEFL</option>
                    <option value="TOEIC">TOEIC</option>
                    <option value="Cambridge">Cambridge English</option>
                    <option value="Duolingo">Duolingo English Test</option>
                    <option value="other">Other</option>
                  </select>
                </label>
                <label>
                  English score
                  <input className={ui.input} type="text" placeholder="e.g. 8.0, 105" value={data.english_score} onChange={(e) => set("english_score", e.target.value)} />
                </label>
                <label className={ui.wide}>
                  English proof link
                  <input className={ui.input} type="url" placeholder="https://…" value={data.english_proof_url} onChange={(e) => set("english_proof_url", e.target.value)} />
                </label>
              </div>
            )}

            {currentStep === 4 && (
              <div className={ui.form}>
                <label className={ui.wide}>
                  Introduction video link
                  <input className={ui.input} type="url" placeholder="https://…" value={data.intro_video_url} onChange={(e) => set("intro_video_url", e.target.value)} />
                </label>
                <label>
                  Years of teaching experience
                  <input className={ui.input} type="number" min="0" max="50" value={data.years_experience} onChange={(e) => set("years_experience", parseInt(e.target.value) || 0)} />
                </label>
              </div>
            )}

            {currentStep === 5 && (
              <>
                <span className={ui.subHead}>Teaching specialties</span>
                <div className={styles.chips}>
                  {specialtiesOptions.map((spec) => (
                    <label key={spec} className={`${styles.chip} ${data.specialties.includes(spec) ? styles.chipOn : ""}`}>
                      <input type="checkbox" checked={data.specialties.includes(spec)} onChange={() => toggleSpecialty(spec)} />
                      {spec}
                    </label>
                  ))}
                </div>
                <span className={ui.subHead}>Languages you can teach</span>
                <div className={styles.chips}>
                  {languagesOptions.map((lang) => (
                    <label key={lang} className={`${styles.chip} ${data.languages.includes(lang) ? styles.chipOn : ""}`}>
                      <input type="checkbox" checked={data.languages.includes(lang)} onChange={() => toggleLanguage(lang)} />
                      {lang}
                    </label>
                  ))}
                </div>
              </>
            )}

            {currentStep === 6 && (
              <label>
                Your availability
                <textarea className={ui.textarea} rows={5} placeholder="e.g. Monday–Friday 9am–5pm UTC, weekends flexible" value={data.availability} onChange={(e) => set("availability", e.target.value)} />
              </label>
            )}

            {currentStep === 7 && (
              <div className={styles.consents}>
                {(
                  [
                    ["tech_confirmed", "I have confirmed my technical setup."],
                    ["code_of_conduct_accepted", "I accept the Code of Conduct."],
                    ["privacy_agreement_accepted", "I accept the Privacy Agreement."],
                    ["recording_consent", "I consent to my demo lesson being recorded."],
                  ] as const
                ).map(([key, label]) => (
                  <label key={key} className={`${styles.consent} ${data[key] ? styles.consentOn : ""}`}>
                    <input type="checkbox" checked={data[key]} onChange={(e) => set(key, e.target.checked)} />
                    {label}
                  </label>
                ))}
              </div>
            )}

            {currentStep === 8 && (
              <div className={ui.form}>
                <label>
                  Reference 1 name
                  <input className={ui.input} type="text" value={data.reference_1_name} onChange={(e) => set("reference_1_name", e.target.value)} />
                </label>
                <label>
                  Reference 1 email
                  <input className={ui.input} type="email" value={data.reference_1_email} onChange={(e) => set("reference_1_email", e.target.value)} />
                </label>
                <label>
                  Reference 2 name (optional)
                  <input className={ui.input} type="text" value={data.reference_2_name} onChange={(e) => set("reference_2_name", e.target.value)} />
                </label>
                <label>
                  Reference 2 email (optional)
                  <input className={ui.input} type="email" value={data.reference_2_email} onChange={(e) => set("reference_2_email", e.target.value)} />
                </label>
                <label className={ui.wide}>
                  Background check provider (optional)
                  <select className={ui.select} value={data.background_check_provider} onChange={(e) => set("background_check_provider", e.target.value)}>
                    <option value="">Select provider</option>
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
                  Previous
                </button>
              ) : (
                <span />
              )}
              {currentStep < 8 ? (
                <button type="button" className={ui.btnCoral} onClick={nextStep} disabled={isSubmitting}>
                  Next
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
                  {isSubmitting ? "Submitting…" : "Submit application"}
                </button>
              )}
            </div>
          </section>
        </div>

        <aside className={ui.sidePane}>
          <span className={ui.bandLabel}>Your progress</span>
          <ol className={styles.steps} aria-label="Application steps">
            {completeness.steps.map((s) => {
              const note = s.complete
                ? "Complete"
                : s.missing.map((m) => FIELD_LABEL[m] ?? m).join(", ");
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
                      {s.step === currentStep ? "Now" : s.complete ? "Done" : `Step ${s.step}`}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
          <p className={styles.fieldNote}>
            <Link href="/tutor/requirements" className={ui.textLink}>
              Review the full requirements first
            </Link>
          </p>
        </aside>
      </div>
    </ApplicantFrame>
  );
}
