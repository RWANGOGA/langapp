import type { Leader, Plan, StatusCount } from "@/lib/admin-data";
import ui from "@/components/portal/bands.module.css";

export function SubscriptionManagement({
  plans,
  leaders,
  statuses,
}: {
  plans: Plan[];
  leaders: Leader[];
  statuses: StatusCount[];
}) {
  // Packages exist as a catalogue before anyone buys; a row of 0% bars would
  // look like measured demand, so the empty case is stated in words instead.
  const hasOrders = plans.some((plan) => plan.share > 0);

  return (
    <section className={ui.band} aria-labelledby="subscriptions-h">
      <div className={ui.bandHead}>
        <h2 id="subscriptions-h" className={ui.bandLabel}>Packages and subscriptions</h2>
        <span className={ui.bandLabel}>{plans.length} {plans.length === 1 ? "package" : "packages"}</span>
      </div>
      <p className={ui.bandEmpty}>
        Share of orders by package, the state those orders are in, and the tutors carrying the most
        sessions.
      </p>

      {hasOrders ? (
        plans.map((plan) => (
          <div className={ui.figureRow} key={plan.name}>
            <p className={ui.figure}>{plan.share}<span>%</span></p>
            <div className={ui.figureBody}>
              <div className={ui.bar}>
                <i style={{ width: `${Math.min(100, Math.max(0, plan.share))}%` }} />
              </div>
              <div className={ui.figureMeta}>
                <span>{plan.name}</span>
                <span>of all orders</span>
              </div>
            </div>
          </div>
        ))
      ) : (
        <p className={ui.bandEmpty}>
          {plans.length > 0
            ? `${plans.length} packages are on sale, but none has been ordered yet, so there is no share to show.`
            : "No package has been created yet."}
        </p>
      )}

      <h3 className={ui.subHead}>Order states</h3>
      {statuses.length > 0 ? (
        <dl className={ui.rows}>
          {statuses.map((status) => (
            <div key={status.label}>
              <dt>{status.label}</dt>
              <dd>{status.count ?? 0}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className={ui.bandEmpty}>No order has been recorded yet.</p>
      )}

      <h3 className={ui.subHead}>Busiest tutors</h3>
      {leaders.length > 0 ? (
        <dl className={ui.rows}>
          {leaders.map((leader) => (
            <div key={leader.name}>
              <dt>{leader.name}</dt>
              <dd>{leader.value} upcoming {leader.value === 1 ? "session" : "sessions"}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className={ui.bandEmpty}>No tutor is carrying a scheduled session yet.</p>
      )}
    </section>
  );
}
