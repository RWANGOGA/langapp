export type TestimonialKind = "LEARNER" | "TUTOR" | "PILOT";

export interface Testimonial {
  id: string;
  name: string;
  kind: TestimonialKind;
  region: string | null;
  quote: string;
  /** True for the school's own notes from the pilot programme, which have no
   * account behind them and are labelled as such wherever they are rendered. */
  isPilotNote: boolean;
}

// Server-rendered reads go straight to FastAPI through API_URL (the internal
// origin) instead of re-entering the public edge. Same rule as src/lib/api.ts
// and src/lib/tutors-data.ts.
const BASE = process.env.API_URL
  ? `${process.env.API_URL.replace(/\/+$/, "")}/api/v1`
  : process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8004/api/v1";

/** Server loader: FastAPI `GET {API_URL}/api/v1/testimonials`.
 *
 * Uncached. A wall that quotes people by name has to be able to take a sentence
 * down and have it gone from the site on the next visit - not gone in five
 * minutes, which is what a revalidate window would have meant. */
export async function getTestimonials(): Promise<Testimonial[]> {
  try {
    const res = await fetch(`${BASE}/testimonials`, { cache: "no-store" });
    if (!res.ok) return [];
    const data = (await res.json()) as { testimonials: Array<Record<string, unknown>> };
    return (data.testimonials ?? []).map((t) => ({
      id: String(t.id),
      name: String(t.name),
      kind: (t.kind as TestimonialKind) ?? "LEARNER",
      region: (t.region as string | null) ?? null,
      quote: String(t.quote),
      isPilotNote: Boolean(t.is_pilot_note),
    }));
  } catch {
    return [];
  }
}
