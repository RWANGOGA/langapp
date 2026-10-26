"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { useLanguage } from "@/i18n/LanguageProvider";
import AdminShell from "@/components/admin/AdminShell";
import PortalNotifications from "@/components/portal/PortalNotifications";
import ui from "@/components/portal/bands.module.css";

/** The admin inbox, behind the bell. Same guard as every other admin page. */
export default function AdminNotifications() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, isAdmin } = useAuth();
  const { t } = useLanguage();

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated || !isAdmin) {
      router.push(isAuthenticated ? "/dashboard" : `/auth/login?callbackUrl=${encodeURIComponent("/admin")}`);
    }
  }, [isAuthenticated, isAdmin, isLoading, router]);

  return (
    <AdminShell adminName={user?.full_name} unread={0}>
      {isLoading || !isAuthenticated || !isAdmin ? (
        <div className={ui.pageStack}>
          <p className={ui.lede}>{t("admin.state.checking")}</p>
        </div>
      ) : (
        <PortalNotifications />
      )}
    </AdminShell>
  );
}
