"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useLanguage } from "@/i18n/LanguageProvider";
import { getAdminDashboard, type AdminDashboard } from "@/lib/admin-data";
import AdminShell from "@/components/admin/AdminShell";
import TutorRoster from "@/components/admin/TutorRoster";
import StudentRoster from "@/components/admin/StudentRoster";
import { MeetingsPanel } from "@/components/admin/MeetingsPanel";
import { SubscriptionManagement } from "@/components/admin/SubscriptionManagement";
import { ActivityLog } from "@/components/admin/ActivityLog";
import ApplicationReview from "@/components/admin/ApplicationReview";
import ClassMonitor from "@/components/admin/ClassMonitor";
import AccountSettings from "@/components/admin/AccountSettings";
import ui from "@/components/portal/bands.module.css";

type Section = "dashboard" | "applications" | "tutors" | "students" | "classes" | "meetings" | "subscriptions" | "reports" | "settings";

const SECTIONS = new Set<Section>([
  "dashboard",
  "applications",
  "tutors",
  "students",
  "classes",
  "meetings",
  "subscriptions",
  "reports",
  "settings",
]);

/** A band whose whole content is a sentence: the honest shape of "not built yet". */
function HonestBand({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section className={ui.band} aria-label={label}>
      <div className={ui.bandStatement}>
        <p className={ui.bandLabel}>{label}</p>
        {children}
      </div>
    </section>
  );
}

function SectionContent({ section, data, onReload, t }: { section: Section; data: AdminDashboard; onReload: () => void; t: (key: string, vars?: Record<string, string | number>) => string }) {
  switch (section) {
    case "applications":
      return <ApplicationReview />;
    case "tutors":
      return <TutorRoster tutors={data.tutors} />;
    case "students":
      return <StudentRoster students={data.students} tutors={data.tutors} onRefresh={onReload} />;
    case "classes":
      return <ClassMonitor students={data.students} onReload={onReload} />;
    case "meetings":
      return <MeetingsPanel meetings={data.meetings} />;
    case "subscriptions":
      return <SubscriptionManagement plans={data.plans} leaders={data.leaders} statuses={data.statuses} />;
    case "reports":
      return <ActivityLog items={data.activity} />;
    case "settings":
      return <AccountSettings />;
    case "dashboard":
      return (
        <HonestBand label={t("admin.honest.overview.label")}>
          <p>{t("admin.honest.overview.body")}</p>
          <p>
            <Link className={ui.textLink} href="/admin">{t("admin.honest.overview.link")} <ArrowRight size={13} aria-hidden /></Link>
          </p>
        </HonestBand>
      );
    default:
      // Every section is wired now; this band only guards a payload from an
      // older build naming a section the client does not know.
      return (
        <HonestBand label={t("admin.honest.fallback.label")}>
          <p>{t("admin.honest.fallback.body")}</p>
        </HonestBand>
      );
  }
}

export default function AdminSectionPage() {
  const router = useRouter();
  const params = useParams<{ section: string }>();
  const { user, isAuthenticated, isLoading, isAdmin } = useAuth();
  const { t } = useLanguage();
  const [data, setData] = useState<AdminDashboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const section = SECTIONS.has(params.section as Section) ? (params.section as Section) : "dashboard";
  const copy = {
    kicker: t(`admin.section.${section}.kicker`),
    title: t(`admin.section.${section}.title`),
    lede: t(`admin.section.${section}.lede`),
  };

  // After an assignment the roster, the KPIs and the matrix all shift, so the
  // whole dashboard is refetched rather than patched row by row in the client.
  const reload = useCallback(() => {
    getAdminDashboard()
      .then(setData)
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated || !isAdmin) {
      router.push(isAuthenticated ? "/dashboard" : `/auth/login?callbackUrl=${encodeURIComponent("/admin")}`);
      return;
    }

    getAdminDashboard()
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : t("admin.state.errorSection")));
  }, [isAuthenticated, isAdmin, isLoading, router]);

  if (isLoading || !isAuthenticated || !isAdmin) {
    return (
      <AdminShell adminName={user?.full_name} unread={0}>
        <div className={ui.pageStack}>
          <p className={ui.lede}>{t("admin.state.checking")}</p>
        </div>
      </AdminShell>
    );
  }

  if (error) {
    return (
      <AdminShell adminName={user?.full_name} unread={0}>
        <div className={ui.pageStack}>
          <p role="alert" className={ui.statusBad}>{error}</p>
          <p>
            <button type="button" className={ui.btn} onClick={() => window.location.reload()}>
              {t("admin.state.tryAgain")}
            </button>
          </p>
        </div>
      </AdminShell>
    );
  }

  if (!data) {
    return (
      <AdminShell adminName={user?.full_name} unread={0}>
        <div className={ui.pageStack}>
          <p className={ui.lede}>{t("admin.state.loadingSection", { section: copy.kicker })}</p>
        </div>
      </AdminShell>
    );
  }

  return (
    <AdminShell adminName={user?.full_name} unread={data.unread}>
      <div className={ui.pageStack}>
        <header className={ui.pageHeading}>
          <div>
            <p className={ui.kicker}>{copy.kicker}</p>
            <h1>{copy.title}</h1>
            <p>{copy.lede}</p>
          </div>
        </header>
        <SectionContent section={section} data={data} onReload={reload} t={t} />
      </div>
    </AdminShell>
  );
}
