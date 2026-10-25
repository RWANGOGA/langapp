import type { Metadata } from "next";
import { getCheckoutRegions, getPlans } from "@/lib/packages-data";
import CheckoutClient from "./CheckoutClient";

export const metadata: Metadata = { title: "Choose your package & pay" };
export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  const [plans, regions] = await Promise.all([getPlans(), getCheckoutRegions()]);
  return <CheckoutClient plans={plans} regions={regions} />;
}