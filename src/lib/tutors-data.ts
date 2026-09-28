export type Specialty = "Business" | "Conversation" | "IELTS" | "TOEIC" | "Academic";
export interface DirectoryTutor {
  id: string; name: string; headline: string; country: string;
  rating: number; reviews: number; years: number; speaks: string[]; specialties: Specialty[];
}

export const SPECIALTIES: Specialty[] = ["Business", "Conversation", "IELTS", "TOEIC", "Academic"];

const TUTORS: DirectoryTutor[] = [
  { id: "sarah-johnson", name: "Sarah Johnson", headline: "Senior English Tutor - Business & Conversation", country: "USA", rating: 4.9, reviews: 412, years: 8, speaks: ["English"], specialties: ["Business", "Conversation"] },
  { id: "david-kim", name: "David Kim", headline: "TOEIC and academic writing coach", country: "Canada", rating: 5.0, reviews: 268, years: 6, speaks: ["English", "Korean", "Japanese"], specialties: ["TOEIC", "Academic"] },
  { id: "emily-carter", name: "Emily Carter", headline: "IELTS examiner-trained speaking tutor", country: "UK", rating: 4.8, reviews: 190, years: 5, speaks: ["English", "Vietnamese"], specialties: ["IELTS", "Academic"] },
  { id: "michael-brown", name: "Michael Brown", headline: "Relaxed everyday conversation practice", country: "Australia", rating: 4.7, reviews: 143, years: 4, speaks: ["English"], specialties: ["Conversation"] },
  { id: "olivia-martin", name: "Olivia Martin", headline: "Business English and TOEIC preparation", country: "USA", rating: 4.9, reviews: 356, years: 7, speaks: ["English", "Japanese"], specialties: ["Business", "TOEIC"] },
  { id: "daniel-wright", name: "Daniel Wright", headline: "IELTS band 7+ and interview skills", country: "Ireland", rating: 4.8, reviews: 221, years: 9, speaks: ["English", "Vietnamese"], specialties: ["IELTS", "Business"] },
];

/** Server loader: FastAPI `GET {API_URL}/api/v1/tutors`, else the mocks above. */
export async function getTutorDirectory(): Promise<DirectoryTutor[]> {
  const base = process.env.NEXT_PUBLIC_API_URL;
  if (base) {
    try {
      const res = await fetch(`${base}/tutors`, { next: { revalidate: 300 } });
      if (res.ok) {
        const data = await res.json() as { tutors: Array<{ id: string; name: string; headline: string; country: string; rating: number; reviews: number; years_experience: number; languages: string[]; specialties: string[] }> };
        return data.tutors.map((t) => ({
          id: t.id,
          name: t.name,
          headline: t.headline,
          country: t.country,
          rating: t.rating,
          reviews: t.reviews,
          years: t.years_experience,
          speaks: t.languages,
          specialties: t.specialties,
        })) as DirectoryTutor[];
      }
    } catch { /* fall back to mock */ }
  }
  return TUTORS;
}