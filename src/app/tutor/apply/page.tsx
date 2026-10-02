"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { getApplicationCompleteness, type ApplicationCompleteness } from "@/lib/tutor-requirements";
import styles from "./page.module.css";

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

export default function TutorApplicationPage() {
  const router = useRouter();
  const { isAuthenticated, isTutor, isLoading: authLoading } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [applicationExists, setApplicationExists] = useState(false);
  const [completeness, setCompleteness] = useState<ApplicationCompleteness | null>(null);

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
        }
      }
    } catch {
      // No application found, continue with fresh form
    }
  }, []);

  const refreshCompleteness = useCallback(async () => {
    const report = await getApplicationCompleteness();
    setCompleteness(report);
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
      void refreshCompleteness();
    }
  }, [isAuthenticated, isTutor, authLoading, router, checkExistingApplication, refreshCompleteness]);

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
        step1: {
          full_name: data.full_name,
          country: data.country,
          date_of_birth: data.date_of_birth || undefined,
        },
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
        step4: {
          intro_video_url: data.intro_video_url || undefined,
          years_experience: data.years_experience,
        },
        step5: {
          specialties: data.specialties,
          languages: data.languages,
        },
        step6: {
          availability: data.availability || undefined,
        },
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

      const method = applicationExists ? "PATCH" : "POST";
      const url = applicationExists
        ? `${PROXY}/tutor/applications/me`
        : `${PROXY}/tutor/applications`;

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(applicationExists ? flat : nested),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || "Submission failed");
      }

      setSuccess(true);
      await refreshCompleteness();
      setTimeout(() => {
        // Applicants are students until approved, so /tutor (the tutor
        // dashboard) would bounce them. Return to the start of the journey.
        router.push("/tutor/requirements");
      }, 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  const nextStep = () => setCurrentStep(currentStep + 1);
  const prevStep = () => setCurrentStep(currentStep - 1);

  const toggleSpecialty = (specialty: string) => {
    if (data.specialties.includes(specialty)) {
      setData({ ...data, specialties: data.specialties.filter(s => s !== specialty) });
    } else {
      setData({ ...data, specialties: [...data.specialties, specialty] });
    }
  };

  const toggleLanguage = (language: string) => {
    if (data.languages.includes(language)) {
      setData({ ...data, languages: data.languages.filter(l => l !== language) });
    } else {
      setData({ ...data, languages: [...data.languages, language] });
    }
  };

  if (authLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  if (success) {
    return (
      <div className={styles.container}>
        <div className={styles.successCard}>
          <div className={styles.successIcon}>✓</div>
          <h2>Application Submitted!</h2>
          <p>Your tutor application has been submitted successfully. We&apos;ll review it and get back to you soon.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <h1>Become a Tutor</h1>
          <p>Step {currentStep} of 8</p>
        </div>

        <Link href="/tutor/requirements" className={styles.requirementsLink}>
          <strong>Not started yet?</strong> Review the documents and checks you will
          need before submitting this application.
        </Link>

        {error && <div className={styles.error}>{error}</div>}

        <form onSubmit={(e) => e.preventDefault()} className={styles.form}>
          {currentStep === 1 && (
            <>
              <div className={styles.field}>
                <label htmlFor="full_name">Full Name</label>
                <input
                  id="full_name"
                  type="text"
                  value={data.full_name}
                  onChange={(e) => setData({ ...data, full_name: e.target.value })}
                  required
                />
              </div>
              <div className={styles.field}>
                <label htmlFor="country">Country</label>
                <input
                  id="country"
                  type="text"
                  value={data.country}
                  onChange={(e) => setData({ ...data, country: e.target.value })}
                  required
                />
              </div>
              <div className={styles.field}>
                <label htmlFor="date_of_birth">Date of Birth</label>
                <input
                  id="date_of_birth"
                  type="date"
                  value={data.date_of_birth}
                  onChange={(e) => setData({ ...data, date_of_birth: e.target.value })}
                />
              </div>
            </>
          )}

          {currentStep === 2 && (
            <>
              <div className={styles.stepIntro}>
                <strong>Identity and qualification documents</strong>
                <span>Provide a Google Drive link or a secure hosted file. Make sure the review team can open it.</span>
              </div>
              <div className={styles.field}>
                <label htmlFor="id_verification_provider">ID verification provider <em>Required</em></label>
                <select
                  id="id_verification_provider"
                  value={data.id_verification_provider}
                  onChange={(e) => setData({ ...data, id_verification_provider: e.target.value })}
                >
                  <option value="">Select provider</option>
                  <option value="jumio">Jumio</option>
                  <option value="onfido">Onfido</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className={styles.field}>
                <label htmlFor="id_verification_id">ID verification number <em>Required</em></label>
                <input
                  id="id_verification_id"
                  type="text"
                  value={data.id_verification_id}
                  onChange={(e) => setData({ ...data, id_verification_id: e.target.value })}
                />
              </div>
              <div className={styles.field}>
                <label htmlFor="id_document_url">Government ID link <em>Required</em></label>
                <input
                  id="id_document_url"
                  type="url"
                  value={data.id_document_url}
                  onChange={(e) => setData({ ...data, id_document_url: e.target.value })}
                  placeholder="Google Drive or secure file URL"
                  required
                />
                <small>Set the sharing permission so the review team can open the file.</small>
              </div>
              <div className={styles.field}>
                <label htmlFor="qualification_type">Qualification type <em>Required</em></label>
                <input
                  id="qualification_type"
                  type="text"
                  value={data.qualification_type}
                  onChange={(e) => setData({ ...data, qualification_type: e.target.value })}
                  placeholder="e.g., TEFL, CELTA, etc."
                />
              </div>
              <div className={styles.field}>
                <label htmlFor="qualification_file_url">Qualification file link <em>Required</em></label>
                <input
                  id="qualification_file_url"
                  type="url"
                  value={data.qualification_file_url}
                  onChange={(e) => setData({ ...data, qualification_file_url: e.target.value })}
                  placeholder="https://..."
                />
              </div>
            </>
          )}

          {currentStep === 3 && (
            <>
              <div className={styles.stepIntro}>
                <strong>English proficiency evidence</strong>
                <span>Enter the test result and link to the score report or certificate.</span>
              </div>
              <div className={styles.field}>
                <label htmlFor="english_proof_type">English proficiency test <em>Required</em></label>
                <select
                  id="english_proof_type"
                  value={data.english_proof_type}
                  onChange={(e) => setData({ ...data, english_proof_type: e.target.value })}
                >
                  <option value="">Select test type</option>
                  <option value="IELTS">IELTS</option>
                  <option value="TOEFL">TOEFL</option>
                  <option value="TOEIC">TOEIC</option>
                  <option value="Cambridge">Cambridge English</option>
                  <option value="Duolingo">Duolingo English Test</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className={styles.field}>
                <label htmlFor="english_score">English score <em>Required</em></label>
                <input
                  id="english_score"
                  type="text"
                  value={data.english_score}
                  onChange={(e) => setData({ ...data, english_score: e.target.value })}
                  placeholder="e.g., 8.0, 105, etc."
                />
              </div>
              <div className={styles.field}>
                <label htmlFor="english_proof_url">English proof link <em>Required</em></label>
                <input
                  id="english_proof_url"
                  type="url"
                  value={data.english_proof_url}
                  onChange={(e) => setData({ ...data, english_proof_url: e.target.value })}
                  placeholder="Google Drive or secure file URL"
                  required
                />
              </div>
            </>
          )}

          {currentStep === 4 && (
            <>
              <div className={styles.stepIntro}>
                <strong>Introduction video</strong>
                <span>Share a 2-5 minute Google Drive, YouTube, Vimeo, or secure video link.</span>
              </div>
              <div className={styles.field}>
                <label htmlFor="intro_video_url">Intro video link <em>Required</em></label>
                <input
                  id="intro_video_url"
                  type="url"
                  value={data.intro_video_url}
                  onChange={(e) => setData({ ...data, intro_video_url: e.target.value })}
                  placeholder="https://..."
                />
              </div>
              <div className={styles.field}>
                <label htmlFor="years_experience">Years of teaching experience <em>Required</em></label>
                <input
                  id="years_experience"
                  type="number"
                  min="0"
                  max="50"
                  value={data.years_experience}
                  onChange={(e) => setData({ ...data, years_experience: parseInt(e.target.value) || 0 })}
                  required
                />
              </div>
            </>
          )}

          {currentStep === 5 && (
            <>
              <div className={styles.field}>
                <label>Teaching Specialties</label>
                <div className={styles.checkboxGrid}>
                  {specialtiesOptions.map((spec) => (
                    <label key={spec} className={styles.checkboxItem}>
                      <input
                        type="checkbox"
                        checked={data.specialties.includes(spec)}
                        onChange={() => toggleSpecialty(spec)}
                      />
                      <span>{spec}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className={styles.field}>
                <label>Languages You Can Teach</label>
                <div className={styles.checkboxGrid}>
                  {languagesOptions.map((lang) => (
                    <label key={lang} className={styles.checkboxItem}>
                      <input
                        type="checkbox"
                        checked={data.languages.includes(lang)}
                        onChange={() => toggleLanguage(lang)}
                      />
                      <span>{lang}</span>
                    </label>
                  ))}
                </div>
              </div>
            </>
          )}

          {currentStep === 6 && (
            <div className={styles.field}>
              <label htmlFor="availability">Your Availability</label>
              <textarea
                id="availability"
                value={data.availability}
                onChange={(e) => setData({ ...data, availability: e.target.value })}
                placeholder='e.g., Monday-Friday 9am-5pm UTC, Weekend flexible...'
                rows={5}
              />
            </div>
          )}

          {currentStep === 7 && (
            <div className={styles.checkboxGroup}>
              <h3>Terms &amp; Agreements</h3>
              <label className={styles.checkboxItem}>
                <input
                  type="checkbox"
                  checked={data.tech_confirmed}
                  onChange={(e) => setData({ ...data, tech_confirmed: e.target.checked })}
                />
                <span>I have confirmed my technical setup</span>
              </label>
              <label className={styles.checkboxItem}>
                <input
                  type="checkbox"
                  checked={data.code_of_conduct_accepted}
                  onChange={(e) => setData({ ...data, code_of_conduct_accepted: e.target.checked })}
                  required
                />
                <span>I accept the Code of Conduct</span>
              </label>
              <label className={styles.checkboxItem}>
                <input
                  type="checkbox"
                  checked={data.privacy_agreement_accepted}
                  onChange={(e) => setData({ ...data, privacy_agreement_accepted: e.target.checked })}
                  required
                />
                <span>I accept the Privacy Policy</span>
              </label>
              <label className={styles.checkboxItem}>
                <input
                  type="checkbox"
                  checked={data.recording_consent}
                  onChange={(e) => setData({ ...data, recording_consent: e.target.checked })}
                  required
                />
                <span>I consent to recording of my demo lesson</span>
              </label>
            </div>
          )}

          {currentStep === 8 && (
            <>
              <div className={styles.field}>
                <label>Reference 1</label>
                <input
                  type="text"
                  placeholder="Full name"
                  value={data.reference_1_name}
                  onChange={(e) => setData({ ...data, reference_1_name: e.target.value })}
                />
                <input
                  type="email"
                  placeholder="Email"
                  value={data.reference_1_email}
                  onChange={(e) => setData({ ...data, reference_1_email: e.target.value })}
                />
              </div>
              <div className={styles.field}>
                <label>Reference 2</label>
                <input
                  type="text"
                  placeholder="Full name"
                  value={data.reference_2_name}
                  onChange={(e) => setData({ ...data, reference_2_name: e.target.value })}
                />
                <input
                  type="email"
                  placeholder="Email"
                  value={data.reference_2_email}
                  onChange={(e) => setData({ ...data, reference_2_email: e.target.value })}
                />
              </div>
              <div className={styles.field}>
                <label htmlFor="background_check_provider">Background Check Provider</label>
                <select
                  id="background_check_provider"
                  value={data.background_check_provider}
                  onChange={(e) => setData({ ...data, background_check_provider: e.target.value })}
                >
                  <option value="">Select provider</option>
                  <option value="checkr">Checkr</option>
                  <option value="goodhire">GoodHire</option>
                  <option value="goodly">Goodly</option>
                </select>
              </div>
            </>
          )}

          <div className={styles.navigation}>
            {currentStep > 1 && (
              <button
                type="button"
                className={styles.prevBtn}
                onClick={prevStep}
                disabled={isSubmitting}
              >
                Previous
              </button>
            )}
            {currentStep < 8 && (
              <button
                type="button"
                className={styles.nextBtn}
                onClick={nextStep}
                disabled={isSubmitting}
              >
                Next
              </button>
            )}
            {currentStep === 8 && (
              <>
                {/* Same rules the API enforces, so the button never offers a
                    submission the server would reject with 422. */}
                {completeness && !completeness.can_submit && (
                  <div className={styles.completenessWarning} role="status">
                    <strong>Before you can submit:</strong>
                    <ul>
                      {completeness.steps
                        .filter((s) => !s.complete)
                        .map((s) => (
                          <li key={s.step}>
                            Step {s.step} — {s.title}: {s.missing.join(", ")}
                          </li>
                        ))}
                    </ul>
                  </div>
                )}
                {completeness?.can_submit && (
                  <div className={styles.completenessOk} role="status">
                    All required information is present. Submitting sends your
                    application to the review team.
                  </div>
                )}
                <button
                  type="button"
                  className={styles.submitBtn}
                  onClick={handleSubmit}
                  disabled={
                    isSubmitting ||
                    !data.code_of_conduct_accepted ||
                    !data.privacy_agreement_accepted ||
                    !data.recording_consent ||
                    // Never offer a submit the completeness gate would reject.
                    (completeness !== null && !completeness.can_submit)
                  }
                >
                  {isSubmitting ? "Submitting..." : "Submit Application"}
                </button>
              </>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}