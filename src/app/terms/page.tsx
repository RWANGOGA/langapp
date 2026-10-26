import type { Metadata } from "next";
import LegalContent from "@/components/marketing/LegalContent";

export const metadata: Metadata = {
  title: "Terms | Nile Language",
  description: "What you can expect from Nile Language, and what we ask of you.",
};

export default function TermsPage() {
  return <LegalContent variant="terms" />;
}
