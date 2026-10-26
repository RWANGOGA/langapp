import type { Metadata } from "next";
import LegalContent from "@/components/marketing/LegalContent";

export const metadata: Metadata = {
  title: "Privacy | Nile Language",
  description: "What Nile Language holds about you, why it holds it, and who can see it.",
};

export default function PrivacyPage() {
  return <LegalContent variant="privacy" />;
}
