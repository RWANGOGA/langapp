export interface RequirementDocument {
  id: string;
  title: string;
  description: string;
  required: boolean;
  accepted_formats: string[];
  max_size_mb: number | null;
  examples: string[];
}

export interface ReviewStage {
  key: string;
  title: string;
  description: string;
  indicative_days: string;
}

export interface TutorPolicy {
  id: string;
  title: string;
  summary: string;
}

export interface TutorRequirements {
  version: string;
  updated_at: string;
  eligibility: string[];
  documents: RequirementDocument[];
  review_stages: ReviewStage[];
  policies: TutorPolicy[];
  disclaimer: string;
  total_steps: number;
}

export interface StepCompletion {
  step: number;
  title: string;
  complete: boolean;
  missing: string[];
}

export interface ApplicationCompleteness {
  steps: StepCompletion[];
  incomplete_steps: number[];
  can_submit: boolean;
}

export const DEFAULT_TUTOR_REQUIREMENTS: TutorRequirements = {
  version: "2026-09-30",
  updated_at: "2026-09-30T00:00:00.000Z",
  eligibility: [
    "You are 18 or older and able to work as an independent contractor.",
    "You can demonstrate native or near-native English proficiency.",
    "You can commit to at least 8 teaching hours per week.",
    "You have a quiet space and a reliable internet connection for lessons.",
    "You are willing to complete a background check before your first class.",
  ],
  documents: [
    { id: "government_id", title: "Government-issued photo ID", description: "Passport or national identity card with a legible photo and expiry date.", required: true, accepted_formats: ["pdf", "jpg", "jpeg", "png"], max_size_mb: 10, examples: ["Passport", "National ID card", "Driver licence"] },
    { id: "proof_of_address", title: "Proof of address", description: "A utility bill or bank statement from the last 3 months, if requested during review.", required: false, accepted_formats: ["pdf", "jpg", "jpeg", "png"], max_size_mb: 10, examples: ["Electricity bill", "Bank statement"] },
    { id: "teaching_qualification", title: "Teaching qualification", description: "TEFL, CELTA, IELTS or a degree transcript evidencing teaching ability.", required: true, accepted_formats: ["pdf", "jpg", "jpeg", "png"], max_size_mb: 10, examples: ["TEFL certificate", "CELTA certificate", "English degree transcript"] },
    { id: "english_proof", title: "English proficiency evidence", description: "An official test score or university transcript confirming your qualification.", required: true, accepted_formats: ["pdf", "jpg", "jpeg", "png"], max_size_mb: 10, examples: ["IELTS score report", "TOEFL score report", "Cambridge certificate"] },
    { id: "intro_video", title: "Introduction video", description: "A 2-5 minute introduction to you and your teaching style. A direct link is accepted.", required: true, accepted_formats: ["mp4", "mov", "youtube", "vimeo"], max_size_mb: 200, examples: ["Unlisted YouTube link", "Direct .mp4 URL"] },
    { id: "references", title: "Professional references", description: "At least one referee who can confirm your teaching experience. A second is optional.", required: true, accepted_formats: [], max_size_mb: null, examples: ["Former employer", "Language school", "Academic supervisor"] },
    { id: "teaching_profile", title: "Teaching profile and availability", description: "Prepare the subjects and languages you teach, plus the weekly time slots when you can accept lessons.", required: true, accepted_formats: [], max_size_mb: null, examples: ["Conversation", "Business English", "Monday-Friday availability"] },
  ],
  review_stages: [
    { key: "documents_review", title: "Document review", description: "We verify every document is current, legible and belongs to you.", indicative_days: "2-3 business days" },
    { key: "english_test", title: "English assessment", description: "A short written and spoken check confirms you can teach at the advertised level.", indicative_days: "2 business days" },
    { key: "demo_lesson", title: "Demo lesson", description: "A short trial lesson with our academic team, scored out of 100.", indicative_days: "3-5 business days" },
    { key: "approved", title: "Account activation", description: "Your tutor profile is published and you can accept your first class.", indicative_days: "Immediate" },
  ],
  policies: [
    { id: "code_of_conduct", title: "Code of conduct", summary: "Professional and respectful behaviour with every student." },
    { id: "privacy_agreement", title: "Privacy agreement", summary: "How student data is handled and retained." },
    { id: "recording_consent", title: "Recording consent", summary: "Sessions may be recorded for quality and dispute purposes." },
    { id: "background_check", title: "Background check disclosure", summary: "Consent to a background check before your first class." },
  ],
  disclaimer: "Submitting an application does not guarantee approval or grant tutor access. Your account becomes a tutor account only after every document has been reviewed and the demo lesson has been passed.",
  total_steps: 8,
};

const PROXY = "/api/v1";

/** What the applicant still owes. Same rules the submit gate enforces. */
export async function getApplicationCompleteness(): Promise<ApplicationCompleteness | null> {
  try {
    const res = await fetch(`${PROXY}/tutor/applications/me/completeness`, {
      credentials: "include",
    });
    if (res.status === 401 || !res.ok) return null;
    return (await res.json()) as ApplicationCompleteness;
  } catch {
    return null;
  }
}