"use client";

import PortalShell, { type PortalNavItem } from "@/components/portal/PortalShell";
import { useLanguage } from "@/i18n/LanguageProvider";

export default function AdminShell({
  adminName,
  unread,
  children,
}: {
  /** Falls back to the account kind rather than inventing a person. */
  adminName?: string;
  unread: number;
  children: React.ReactNode;
}) {
  const { t } = useLanguage();

  // One navigation surface only: the sidebar. Sections that are not wired to
  // the backend yet still get a page, so the rail never lies about the shape
  // of the product.
  const NAV: PortalNavItem[] = [
    { href: "/admin", label: t("nav.overview"), icon: "dashboard" },
    { href: "/admin/applications", label: t("nav.applications"), icon: "applications" },
    { href: "/admin/tutors", label: t("nav.tutors"), icon: "tutors" },
    { href: "/admin/students", label: t("nav.students"), icon: "students" },
    { href: "/admin/classes", label: t("nav.classes"), icon: "classes" },
    { href: "/admin/meetings", label: t("nav.meetings"), icon: "meetings" },
    { href: "/admin/payments", label: t("nav.payments"), icon: "payments" },
    { href: "/admin/subscriptions", label: t("nav.subscriptions"), icon: "subscriptions" },
    { href: "/admin/reports", label: t("nav.reports"), icon: "reports" },
    { href: "/admin/settings", label: t("nav.settings"), icon: "settings" },
    { href: "/admin/notifications", label: t("nav.notifications"), icon: "notifications" },
  ];

  return (
    <PortalShell
      portalLabel={t("portal.admin")}
      homeHref="/admin"
      navAriaLabel={t("portal.aria.admin")}
      nav={NAV}
      identity={{ name: adminName || t("portal.administrator"), meta: t("portal.administration") }}
      unread={unread}
      notificationsHref="/admin/notifications"
      footer={{ href: "/", label: t("portal.backToSite") }}
    >
      {children}
    </PortalShell>
  );
}
