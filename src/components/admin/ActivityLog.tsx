"use client";

import type { Activity } from "@/lib/admin-data";
import { relativeTime } from "@/lib/utils";
import { useLanguage } from "@/i18n/LanguageProvider";
import ui from "@/components/portal/bands.module.css";

export function ActivityLog({ items }: { items: Activity[] }) {
  const { t } = useLanguage();
  return (
    <section className={ui.band} aria-labelledby="activity-h">
      <div className={ui.bandHead}>
        <h2 id="activity-h" className={ui.bandLabel}>{t("admin.activity.title")}</h2>
        <span className={ui.bandLabel}>{t("admin.activity.latest", { n: items.length })}</span>
      </div>

      {items.length > 0 ? (
        <ul className={ui.sessions} aria-live="polite">
          {items.map((item) => (
            <li key={item.id}>
              <span className={ui.avatarSquare} aria-hidden>{item.initial}</span>
              <span className={ui.what}>{item.text}</span>
              <span className={ui.when}><em>{relativeTime(item.at)}</em></span>
            </li>
          ))}
        </ul>
      ) : (
        <p className={ui.bandEmpty}>
          {t("admin.activity.empty")}
        </p>
      )}
    </section>
  );
}
