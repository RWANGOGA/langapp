"use client";

import { relativeTime } from "@/lib/utils";
import type { PaymentActivity, PaymentAnalytics } from "@/lib/admin-data";
import { useLanguage } from "@/i18n/LanguageProvider";
import ui from "@/components/portal/bands.module.css";

/**
 * Payments, read straight from the order ledger. The figures come from
 * /admin/payment/analytics and the feed from /admin/payment/activity, both
 * refreshed while the overview is open.
 */
export default function PaymentOversight({
  analytics,
  events,
}: {
  analytics: PaymentAnalytics | null;
  events: PaymentActivity[];
}) {
  const { t } = useLanguage();
  const money = (value: number) =>
    value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });

  return (
    <section className={ui.band} aria-labelledby="payments-h">
      <div className={ui.bandHead}>
        <h2 id="payments-h" className={ui.bandLabel}>{t("admin.pay.title")}</h2>
        <span className={ui.bandLabel}>
          {analytics ? t("admin.pay.refreshed") : t("admin.pay.unavailable")}
        </span>
      </div>

      <ul className={ui.statsFour}>
        <li>
          <span><small>{t("admin.pay.gross")}</small><b>${money(analytics?.gross_revenue_usd ?? 0)}</b></span>
        </li>
        <li>
          <span><small>{t("admin.pay.paidOrders")}</small><b>{analytics?.successful_payments ?? 0}</b></span>
        </li>
        <li>
          <span><small>{t("admin.pay.activeSubs")}</small><b>{analytics?.active_subscriptions ?? 0}</b></span>
        </li>
        <li>
          <span><small>{t("admin.pay.awaitingMatch")}</small><b>{analytics?.matching_pending ?? 0}</b></span>
        </li>
      </ul>

      <h3 className={ui.subHead}>{t("admin.pay.recent")}</h3>
      {events.length > 0 ? (
        <ul className={ui.sessions} aria-live="polite">
          {events.slice(0, 8).map((event) => (
            <li key={event.id}>
              <span className={ui.when}>
                <b>{event.amount != null ? `$${money(event.amount)}` : "—"}</b>
                <em>{relativeTime(event.created_at)}</em>
              </span>
              <span className={ui.what}>
                {event.event_type.replace(/_/g, " ")}
                <small>{event.summary}</small>
              </span>
              <span className={ui.statusPill}>{event.new_state ?? t("admin.pay.unknown")}</span>
            </li>
          ))}
        </ul>
      ) : (
        <div className={ui.bandStatement}>
          <p className={ui.bandLabel}>{t("admin.pay.emptyTitle")}</p>
          <p>{t("admin.pay.emptyBody")}</p>
        </div>
      )}
    </section>
  );
}
