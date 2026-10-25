"use client";

import type { Leader, Plan, StatusCount } from "@/lib/admin-data";
import { useLanguage } from "@/i18n/LanguageProvider";
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
  const { t } = useLanguage();
  // Packages exist as a catalogue before anyone buys; a row of 0% bars would
  // look like measured demand, so the empty case is stated in words instead.
  const hasOrders = plans.some((plan) => plan.share > 0);

  return (
    <section className={ui.band} aria-labelledby="subscriptions-h">
      <div className={ui.bandHead}>
        <h2 id="subscriptions-h" className={ui.bandLabel}>{t("admin.subs.title")}</h2>
        <span className={ui.bandLabel}>
          {t(plans.length === 1 ? "admin.subs.countOne" : "admin.subs.countOther", { n: plans.length })}
        </span>
      </div>
      <p className={ui.bandEmpty}>
        {t("admin.subs.intro")}
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
                <span>{t("admin.subs.ofOrders")}</span>
              </div>
            </div>
          </div>
        ))
      ) : (
        <p className={ui.bandEmpty}>
          {plans.length > 0
            ? t("admin.subs.noneOrdered", { n: plans.length })
            : t("admin.subs.noPackage")}
        </p>
      )}

      <h3 className={ui.subHead}>{t("admin.subs.orderStates")}</h3>
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
        <p className={ui.bandEmpty}>{t("admin.subs.noOrder")}</p>
      )}

      <h3 className={ui.subHead}>{t("admin.subs.busiest")}</h3>
      {leaders.length > 0 ? (
        <dl className={ui.rows}>
          {leaders.map((leader) => (
            <div key={leader.name}>
              <dt>{leader.name}</dt>
              <dd>{t(leader.value === 1 ? "admin.subs.upcomingOne" : "admin.subs.upcomingOther", { n: leader.value })}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className={ui.bandEmpty}>{t("admin.subs.noLeader")}</p>
      )}
    </section>
  );
}
