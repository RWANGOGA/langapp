import type { Metadata } from "next";
import Link from "next/link";
import ui from "@/components/portal/bands.module.css";
import styles from "../checkout.module.css";

export const metadata: Metadata = { title: "Order received — Nile Language" };

export default async function CheckoutSuccessPage({ searchParams }: { searchParams: Promise<{ order?: string }> }) {
  const { order } = await searchParams;

  return (
    <main className={styles.page}>
      <div className={ui.pageStack}>
        <section className={ui.bandStatement} role="status">
          <span className={ui.bandLabel}>{order ? `Order #${order}` : "Order received"}</span>
          <h1 className={ui.bandTitle}>Your order is placed</h1>
          <p>
            We've recorded your order and marked it pending. You are not charged on this page. Once
            your payment is confirmed, tutor matching begins automatically.
          </p>
          <p className={ui.joinRow}>
            <Link href="/dashboard" className={ui.btnCoral}>
              Go to dashboard
            </Link>
            <Link href="/dashboard/notifications" className={ui.btn}>
              View notifications
            </Link>
          </p>
        </section>
        <p className={ui.packageNote}>
          Your order's status, and any next step, appear here and in your notifications as it moves.
        </p>
      </div>
    </main>
  );
}
