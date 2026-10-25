import type { Metadata } from "next";
import { getCheckoutRegions, getPlans, type Plan } from "@/lib/packages-data";
import CheckoutClient from "./CheckoutClient";

export const metadata: Metadata = { title: "Choose your package & pay" };
export const dynamic = "force-dynamic";

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ package?: string }>;
}) {
  const [plans, regions] = await Promise.all([getPlans(), getCheckoutRegions()]);
  // The package a visitor picked on /pricing travels in the query string, so it
  // must survive the sign-in round trip: the gate in proxy.ts keeps the whole
  // URL, and this page hands the choice to the form as its starting point.
  const { package: requestedPackage } = await searchParams;
  const initialPlanId = plans.some((plan) => plan.id === requestedPackage)
    ? (requestedPackage as Plan["id"])
    : undefined;
  return <CheckoutClient plans={plans} regions={regions} initialPlanId={initialPlanId} />;
}