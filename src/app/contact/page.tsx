import type { Metadata } from "next";
import ContactContent from "@/components/marketing/ContactContent";

export const metadata: Metadata = {
  title: "Contact | Nile Language",
  description: "Write to a person about lessons, prices, teaching or your account.",
};

export default function ContactPage() {
  return <ContactContent />;
}
