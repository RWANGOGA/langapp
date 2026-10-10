import type { Metadata } from "next";
import { getPlans } from "@/lib/packages-data";
import CheckoutClient from "./CheckoutClient";
import styles from "./checkout.module.css";

export const metadata: Metadata = { title: "Choose your package & pay" };
export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  const plans = await getPlans();
  return (
    <div className={styles.page}>
      <CheckoutClient plans={plans} />
    </div>
  );
}