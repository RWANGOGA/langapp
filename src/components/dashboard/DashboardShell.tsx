"use client";

import PortalShell, { type PortalNavItem } from "@/components/portal/PortalShell";
import type { LearnerDashboard } from "@/lib/dashboard-data";
import { useLanguage } from "@/i18n/LanguageProvider";

export default function DashboardShell({ learner, children }: { learner: LearnerDashboard["learner"]; children: React.ReactNode }) {
  const { t } = useLanguage();

  // One navigation surface only: the sidebar. The header stays for identity,
  // not for a second copy of the same links.
  const NAV: PortalNavItem[] = [
    { href: "/dashboard", label: t("nav.dashboard"), icon: "dashboard" },
    { href: "/dashboard/tutors", label: t("nav.myTutor"), icon: "tutors" },
    { href: "/dashboard/progress", label: t("nav.progress"), icon: "progress" },
    { href: "/dashboard/notifications", label: t("nav.notifications"), icon: "notifications" },
  ];

  return (
    <PortalShell
      portalLabel={t("portal.learner")}
      homeHref="/dashboard"
      navAriaLabel={t("portal.aria.learner")}
      nav={NAV}
      identity={{
        name: learner.name,
        meta: (
          <>
            {t("portal.level")}{" "}
            <b>{learner.level === "Not set" ? t("portal.levelNotSet") : learner.level}</b>
          </>
        ),
        avatar: learner.avatar,
      }}
      unread={learner.unread}
      notificationsHref="/dashboard/notifications"
      footer={{ href: "/", label: t("portal.backToSite") }}
    >
      {children}
    </PortalShell>
  );
}
