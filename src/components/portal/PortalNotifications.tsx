"use client";

import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { apiGetClient } from "@/lib/api-client";
import type { LearnerNotification } from "@/lib/notifications-data";
import NotificationList from "@/components/dashboard/NotificationList";
import { useLanguage } from "@/i18n/LanguageProvider";
import ui from "@/components/portal/bands.module.css";

/**
 * The inbox behind the bell, for the portals that have no page of their own.
 * It reads the same endpoint the learner inbox does, so a bell that shows a
 * number always has somewhere to go when it is pressed.
 */
export default function PortalNotifications() {
  const { t } = useLanguage();
  const [inbox, setInbox] = useState<{ notifications: LearnerNotification[]; unread: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiGetClient<{ notifications: LearnerNotification[]; unread: number }>("/notifications")
      .then((page) => setInbox(page ?? { notifications: [], unread: 0 }))
      .catch((e) => setError(e instanceof Error ? e.message : "Could not read your notifications"));
  }, []);

  const unread = inbox?.unread ?? 0;

  return (
    <div className={ui.pageStack}>
      <header className={ui.pageHeading}>
        <div>
          <p className={ui.kicker}>{t("portal.notifKicker")}</p>
          <h1>{t("nav.notifications")}</h1>
          <p>
            {error
              ? error
              : inbox === null
                ? t("portal.notifLoading")
                : unread
                  ? t(unread === 1 ? "learner.notif.unreadOne" : "learner.notif.unreadOther", { n: unread })
                  : t("learner.notif.caughtUp")}
          </p>
        </div>
      </header>

      {error && <p role="alert" className={ui.lede}>{error}</p>}

      {inbox && inbox.notifications.length > 0 && (
        <NotificationList initialNotifications={inbox.notifications} />
      )}

      {inbox && inbox.notifications.length === 0 && (
        <section className={ui.band} aria-label={t("learner.notif.emptyTitle")}>
          <div className={ui.bandStatement}>
            <p className={ui.bandLabel}>
              <Bell size={13} aria-hidden /> {t("learner.notif.emptyTitle")}
            </p>
            <p>{t("portal.notifEmptyBody")}</p>
          </div>
        </section>
      )}
    </div>
  );
}
