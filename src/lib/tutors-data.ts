export type Specialty = "Business" | "Conversation" | "IELTS" | "TOEIC" | "Academic";
export interface DirectoryTutor {
  id: string; name: string; headline: string; country: string;
  rating: number; reviews: number; years: number; speaks: string[]; specialties: Specialty[];
  bio: string; avatarUrl: string | null; qualificationType: string | null;
  englishProofType: string | null; englishScore: string | null;
  introVideoUrl: string | null; availability: string | null; onboardingFeeUsd: number;
}

export const SPECIALTIES: Specialty[] = ["Business", "Conversation", "IELTS", "TOEIC", "Academic"];

/** Server loader: FastAPI `GET {API_URL}/api/v1/tutors`. */
export async function getTutorDirectory(): Promise<DirectoryTutor[]> {
  const base = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8004/api/v1";
  try {
    const res = await fetch(`${base}/tutors`, { next: { revalidate: 300 } });
    if (!res.ok) return [];
    const data = await res.json() as { tutors: Array<Record<string, unknown>> };
    return data.tutors.map((t) => ({
      id: String(t.id), name: String(t.name), headline: String(t.headline), country: String(t.country),
      rating: Number(t.rating), reviews: Number(t.reviews), years: Number(t.years_experience),
      speaks: (t.languages as string[]) ?? [], specialties: (t.specialties as Specialty[]) ?? [],
      bio: String(t.bio ?? ""), avatarUrl: (t.avatar_url as string | null) ?? null,
      qualificationType: (t.qualification_type as string | null) ?? null,
      englishProofType: (t.english_proof_type as string | null) ?? null,
      englishScore: (t.english_score as string | null) ?? null,
      introVideoUrl: (t.intro_video_url as string | null) ?? null,
      availability: (t.availability as string | null) ?? null,
      onboardingFeeUsd: Number(t.onboarding_fee_usd ?? 0),
    }));
  } catch {
    return [];
  }
}

export async function getTutorProfile(id: string): Promise<DirectoryTutor | null> {
  const base = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8004/api/v1";
  try {
    const res = await fetch(`${base}/tutors/${encodeURIComponent(id)}`, { next: { revalidate: 300 } });
    if (!res.ok) return null;
    const t = await res.json() as Record<string, unknown>;
    return {
      id: String(t.id), name: String(t.name), headline: String(t.headline), country: String(t.country),
      rating: Number(t.rating), reviews: Number(t.reviews), years: Number(t.years_experience),
      speaks: (t.languages as string[]) ?? [], specialties: (t.specialties as Specialty[]) ?? [],
      bio: String(t.bio ?? ""), avatarUrl: (t.avatar_url as string | null) ?? null,
      qualificationType: (t.qualification_type as string | null) ?? null,
      englishProofType: (t.english_proof_type as string | null) ?? null,
      englishScore: (t.english_score as string | null) ?? null,
      introVideoUrl: (t.intro_video_url as string | null) ?? null,
      availability: (t.availability as string | null) ?? null,
      onboardingFeeUsd: Number(t.onboarding_fee_usd ?? 0),
    };
  } catch {
    return null;
  }
}