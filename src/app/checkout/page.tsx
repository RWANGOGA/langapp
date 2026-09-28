import type { Metadata } from "next";
import Link from "next/link";
import { ChevronDown, GraduationCap } from "lucide-react";
import { getPlans } from "@/lib/packages-data";
import CheckoutClient from "./CheckoutClient";
import styles from "./checkout.module.css";

export const metadata: Metadata = { title: "Choose your package & pay" };

export default async function CheckoutPage() {
  const plans = await getPlans();
  return (
    <div className={styles.page}>
      <header className={styles.topbar}>
        <Link href="/" className={styles.brand}><GraduationCap size={26} color="#f2541b" aria-hidden /> EduLearn Global</Link>
        <nav className={styles.nav} aria-label="Main"><Link href="/courses">Courses</Link><Link href="/pricing">Pricing</Link><Link href="/support">Support</Link></nav>
        <button type="button" className={styles.user} aria-label="Account menu"><span className={styles.avatar} aria-hidden>K</span><ChevronDown size={18} /></button>
      </header>
      <CheckoutClient plans={plans} />
    </div>
  );
}