"use client";

import Link from "next/link";
import { CalendarClock, CreditCard, RefreshCw } from "lucide-react";
import type { PaymentSummary as PaymentSummaryData } from "@/lib/payment-data";
import { useLanguage } from "@/i18n/LanguageProvider";
import styles from "./dashboard.module.css";
import SubscriptionActions from "./SubscriptionActions";

export default function PaymentSummary({ payment }: { payment: PaymentSummaryData }) {
  const { t } = useLanguage();
  const date = (value: string | null) => value ? new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(new Date(value)) : t("learner.pay.notSet");
  const paid = payment.status === "paid";
  const pending = payment.fulfillment_status === "matching_pending";
  return (
    <section className={styles.paymentSummary} aria-labelledby="payment-summary-title">
      <div className={styles.paymentSummaryHead}><div><p className={styles.kicker}>{t("learner.pay.kicker")}</p><h2 id="payment-summary-title">{t("learner.pay.title")}</h2></div><span className={`${styles.paymentStatus} ${paid ? styles.paymentPaid : styles.paymentUnpaid}`}>{pending ? t("learner.pay.matching") : paid ? t("learner.pay.paid") : payment.status}</span></div>
      <div className={styles.paymentDetails}><div><CreditCard size={18} /><span><small>{t("learner.pay.package")}</small><b>{payment.package_name || t("learner.pay.noPackage")}</b></span></div><div><CalendarClock size={18} /><span><small>{t("learner.pay.started")}</small><b>{date(payment.started_at)}</b></span></div><div><RefreshCw size={18} /><span><small>{t("learner.pay.renewal")}</small><b>{date(payment.renews_at || payment.expires_at)}</b></span></div></div>
      {pending && <p className={styles.paymentNotice}>{t("learner.pay.pendingNotice")}</p>}
      {!paid && <Link href="/checkout" className={styles.paymentAction}>{t("learner.pay.choosePackage")}</Link>}
      <SubscriptionActions active={paid && Boolean(payment.renews_at)} />
    </section>
  );
}
