"use client";

import PortalShell, { type PortalNavItem } from "@/components/portal/PortalShell";
import type { TutorDashboard } from "@/lib/tutor-data";
import { useLanguage } from "@/i18n/LanguageProvider";

export default function DashboardShell({ tutor, children }: { tutor: TutorDashboard["tutor"]; children: React.ReactNode }) {
  const { t } = useLanguage();

  // One navigation surface only: the sidebar.
  const NAV: PortalNavItem[] = [
    { href: "/tutor", label: t("nav.dashboard"), icon: "dashboard" },
    { href: "/tutor/learners", label: t("nav.myLearners"), icon: "learners" },
    { href: "/tutor/schedule", label: t("nav.schedule"), icon: "schedule" },
    { href: "/tutor/notes", label: t("nav.lessonNotes"), icon: "notes" },
    { href: "/tutor/earnings", label: t("nav.earnings"), icon: "payments" },
    { href: "/tutor/settings", label: t("nav.settings"), icon: "settings" },
    { href: "/tutor/notifications", label: t("nav.notifications"), icon: "notifications" },
  ];

  return (
    <PortalShell
      portalLabel={t("portal.tutor")}
      homeHref="/tutor"
      navAriaLabel={t("portal.aria.tutor")}
      nav={NAV}
      identity={{ name: tutor.name, meta: tutor.role }}
      unread={tutor.unread}
      notificationsHref="/tutor/notifications"
      footer={{ href: "/", label: t("portal.backToSite") }}
    >
      {children}
    </PortalShell>
  );
}
