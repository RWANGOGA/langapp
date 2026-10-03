import Link from "next/link";
import { ArrowRight, CheckCircle2, Clock3 } from "lucide-react";
import styles from "../checkout.module.css";

export default async function CheckoutSuccessPage({ searchParams }: { searchParams: Promise<{ order?: string }> }) {
  const { order } = await searchParams;

  return (
    <main className={styles.resultPage}>
      <div className={styles.resultCard}>
        <CheckCircle2 size={48} className={styles.resultIcon} aria-hidden />
        <p className={styles.resultEyebrow}>Order {order ? `#${order}` : "received"}</p>
        <h1>Payment request received</h1>
        <p>Your payment is being confirmed securely. We will start tutor matching as soon as the payment provider confirms it.</p>
        <div className={styles.resultNotice}><Clock3 size={18} aria-hidden /><span>Matching status will appear in your dashboard and notifications.</span></div>
        <div className={styles.resultActions}><Link href="/dashboard" className={styles.resultPrimary}>Go to dashboard <ArrowRight size={16} /></Link><Link href="/dashboard/notifications" className={styles.resultSecondary}>View notifications</Link></div>
      </div>
    </main>
  );
}
