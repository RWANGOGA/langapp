import { relativeTime } from "@/lib/utils";
import type { PaymentActivity, PaymentAnalytics } from "@/lib/admin-data";
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
  const money = (value: number) =>
    value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });

  return (
    <section className={ui.band} aria-labelledby="payments-h">
      <div className={ui.bandHead}>
        <h2 id="payments-h" className={ui.bandLabel}>Payment oversight</h2>
        <span className={ui.bandLabel}>
          {analytics ? "refreshed every 30 seconds" : "figures unavailable"}
        </span>
      </div>

      <ul className={ui.statsFour}>
        <li>
          <span><small>Gross revenue (USD)</small><b>${money(analytics?.gross_revenue_usd ?? 0)}</b></span>
        </li>
        <li>
          <span><small>Paid orders</small><b>{analytics?.successful_payments ?? 0}</b></span>
        </li>
        <li>
          <span><small>Active subscriptions</small><b>{analytics?.active_subscriptions ?? 0}</b></span>
        </li>
        <li>
          <span><small>Awaiting a match</small><b>{analytics?.matching_pending ?? 0}</b></span>
        </li>
      </ul>

      <h3 className={ui.subHead}>Recent payments</h3>
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
              <span className={ui.statusPill}>{event.new_state ?? "unknown"}</span>
            </li>
          ))}
        </ul>
      ) : (
        <div className={ui.bandStatement}>
          <p className={ui.bandLabel}>No payments yet</p>
          <p>Orders appear here as soon as a learner checks out, with the state each one reached.</p>
        </div>
      )}
    </section>
  );
}
