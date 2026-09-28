"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import styles from "./page.module.css";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { PackageSelector } from "@/components/checkout/PackageSelector";
import { CheckoutForm } from "@/components/checkout/CheckoutForm";

function CheckoutContent() {
  const searchParams = useSearchParams();
  const packageId = searchParams.get("package") || "intensive";

  return (
    <div className={`${styles.checkoutPage}`}>
      <Navbar />
      <main className={`${styles.checkoutMain}`}>
        <PackageSelector />
        <CheckoutForm packageId={packageId} />
      </main>
      <Footer />
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className={`${styles.checkoutPage}`}>Loading...</div>}>
      <CheckoutContent />
    </Suspense>
  );
}