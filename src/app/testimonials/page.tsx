import type { Metadata } from "next";
import { getTestimonials } from "@/lib/testimonials-data";
import TestimonialsContent from "@/components/marketing/TestimonialsContent";

export const metadata: Metadata = {
  title: "Testimonials | Nile Language",
  description:
    "What learners and tutors say about studying English here — in their own words, with their own name and identity next to the quote.",
  alternates: { canonical: "/testimonials" },
};

// The wall carries sentences people have put their names to, and it has to be
// able to take one down the moment it is withdrawn. Uncached on purpose.
export const dynamic = "force-dynamic";

export default async function TestimonialsPage() {
  const testimonials = await getTestimonials();
  return <TestimonialsContent testimonials={testimonials} />;
}
