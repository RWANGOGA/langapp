import Link from "next/link";
import { CalendarClock, CreditCard, RefreshCw } from "lucide-react";
import type { PaymentSummary as PaymentSummaryData } from "@/lib/payment-data";
import styles from "./dashboard.module.css";
import SubscriptionActions from "./SubscriptionActions";

const date = (value: string | null) => value ? new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(new Date(value)) : "Not set";

export default function PaymentSummary({ payment }: { payment: PaymentSummaryData }) {
  const paid = payment.status === "paid";
  const pending = payment.fulfillment_status === "matching_pending";
  return (
    <section className={styles.paymentSummary} aria-labelledby="payment-summary-title">
      <div className={styles.paymentSummaryHead}><div><p className={styles.kicker}>Billing overview</p><h2 id="payment-summary-title">Payment Summary</h2></div><span className={`${styles.paymentStatus} ${paid ? styles.paymentPaid : styles.paymentUnpaid}`}>{pending ? "Matching pending" : paid ? "Paid" : payment.status}</span></div>
      <div className={styles.paymentDetails}><div><CreditCard size={18} /><span><small>Package</small><b>{payment.package_name || "No package yet"}</b></span></div><div><CalendarClock size={18} /><span><small>Started</small><b>{date(payment.started_at)}</b></span></div><div><RefreshCw size={18} /><span><small>Renewal / expiration</small><b>{date(payment.renews_at || payment.expires_at)}</b></span></div></div>
      {pending && <p className={styles.paymentNotice}>Payment succeeded. We are still finding the right tutor for your selected subject.</p>}
      {!paid && <Link href="/checkout" className={styles.paymentAction}>Choose a package</Link>}
      <SubscriptionActions active={paid && Boolean(payment.renews_at)} />
    </section>
  );
}
