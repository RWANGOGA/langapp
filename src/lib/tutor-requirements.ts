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

/** Relative URL so the request goes through the Next rewrite and stays first-party. */
const PROXY = "/api/v1";

/** Public: no session required. Falls back to nothing so the page can render guidance offline. */
export async function getTutorRequirements(): Promise<TutorRequirements | null> {
  try {
    const res = await fetch(`${PROXY}/tutor/requirements`);
    if (!res.ok) return null;
    return (await res.json()) as TutorRequirements;
  } catch {
    return null;
  }
}

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