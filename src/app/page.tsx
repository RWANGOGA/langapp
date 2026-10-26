import type { Metadata } from "next";
import { getTestimonials } from "@/lib/testimonials-data";
import HomeContent from "@/components/marketing/HomeContent";

export const metadata: Metadata = {
  title: "Nile Language — Learn English with Dedicated 1-on-1 Tutors",
  description:
    "Personalized online English lessons with verified tutors: one teacher, one measured goal, and a weekly cycle of live lessons and recorded progress.",
  alternates: { canonical: "/" },
};

export default async function HomePage() {
  // The voices strip is the real wall, not a curated trio: whatever is newest
  // is what a visitor sees, which is why this read is uncached.
  const testimonials = await getTestimonials();
  return <HomeContent testimonials={testimonials} />;
}
