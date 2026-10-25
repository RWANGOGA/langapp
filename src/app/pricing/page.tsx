import type { Metadata } from "next";
import PricingContent from "@/components/marketing/PricingContent";
import { getPlans } from "@/lib/packages-data";

export const metadata: Metadata = {
  title: "Pricing | Nile Language",
  description:
    "One-to-one English programs with a verified tutor. Published prices, local payment methods, no hidden fees.",
};

export default async function PricingPage() {
  const plans = await getPlans();
  return <PricingContent plans={plans} />;
}
