export interface DirectoryTutor {
  id: string; name: string; headline: string; country: string;
  rating: number; reviews: number; years: number; speaks: string[]; specialties: string[];
  bio: string; avatarUrl: string | null; qualificationType: string | null;
  englishProofType: string | null; englishScore: string | null;
  introVideoUrl: string | null; availability: string | null; onboardingFeeUsd: number;
}

// Server-rendered reads go straight to FastAPI through API_URL (the internal
// origin) instead of re-entering the public edge, where every render shares one
// client IP and one rate-limit budget. Same rule as src/lib/api.ts.
const BASE = process.env.API_URL
  ? `${process.env.API_URL.replace(/\/+$/, "")}/api/v1`
  : process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8004/api/v1";

/** Server loader: FastAPI `GET {API_URL}/api/v1/tutors`.
 *
 * Deliberately uncached. Approving or delisting a tutor changes the answer, and
 * that decision is made in the API, which has no way to tell this server to
 * throw a snapshot away. A 5-minute revalidate therefore published a list that
 * no longer existed - four tutors on a page whose endpoint returned one,
 * including a QA account that had been removed. A directory is a claim about
 * who teaches here; it is read fresh, every visit. */
export async function getTutorDirectory(): Promise<DirectoryTutor[]> {
  try {
    const res = await fetch(`${BASE}/tutors`, { cache: "no-store" });
    if (!res.ok) return [];
    const data = await res.json() as { tutors: Array<Record<string, unknown>> };
    return data.tutors.map((t) => ({
      id: String(t.id), name: String(t.name), headline: String(t.headline), country: String(t.country),
      rating: Number(t.rating), reviews: Number(t.reviews), years: Number(t.years_experience),
      speaks: (t.languages as string[]) ?? [], specialties: (t.specialties as string[]) ?? [],
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
  try {
    // Uncached for the same reason as the directory: a tutor who is no longer
    // approved must not keep a profile page alive off a cached answer.
    const res = await fetch(`${BASE}/tutors/${encodeURIComponent(id)}`, { cache: "no-store" });
    if (!res.ok) return null;
    const t = await res.json() as Record<string, unknown>;
    return {
      id: String(t.id), name: String(t.name), headline: String(t.headline), country: String(t.country),
      rating: Number(t.rating), reviews: Number(t.reviews), years: Number(t.years_experience),
      speaks: (t.languages as string[]) ?? [], specialties: (t.specialties as string[]) ?? [],
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