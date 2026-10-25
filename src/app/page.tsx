import type { Metadata } from "next";
import HomeContent from "@/components/marketing/HomeContent";

export const metadata: Metadata = {
  title: "Nile Language — Learn English with Dedicated 1-on-1 Tutors",
  description:
    "Personalized online English lessons with verified tutors: one teacher, one measured goal, and a weekly cycle of live lessons and recorded progress.",
  alternates: { canonical: "/" },
};

export default function HomePage() {
  return <HomeContent />;
}
