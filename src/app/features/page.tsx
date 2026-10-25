import type { Metadata } from "next";
import FeaturesContent from "@/components/marketing/FeaturesContent";

export const metadata: Metadata = {
  title: "Features | Nile Language",
  description:
    "A verified tutor, a measured goal and a weekly cycle of live lessons, written feedback and recorded progress.",
};

export default function FeaturesPage() {
  return <FeaturesContent />;
}
