"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useLanguage } from "@/i18n/LanguageProvider";
import { getAdminDashboard, type AdminDashboard } from "@/lib/admin-data";
import { apiGetClient } from "@/lib/api-client";
import AdminShell from "@/components/admin/AdminShell";
import TutorRoster from "@/components/admin/TutorRoster";
import StudentRoster from "@/components/admin/StudentRoster";
import { MeetingsPanel } from "@/components/admin/MeetingsPanel";
import { SubscriptionManagement } from "@/components/admin/SubscriptionManagement";
import { ActivityLog } from "@/components/admin/ActivityLog";
import ApplicationReview from "@/components/admin/ApplicationReview";
import ClassMonitor from "@/components/admin/ClassMonitor";
import PaymentLedger from "@/components/admin/PaymentLedger";
import AccountSettings from "@/components/admin/AccountSettings";
import ui from "@/components/portal/bands.module.css";

type Section = "dashboard" | "applications" | "tutors" | "students" | "classes" | "meetings" | "payments" | "subscriptions" | "reports" | "settings";

const SECTIONS = new Set<Section>([
  "dashboard",
  "applications",
  "tutors",
  "students",
  "classes",
  "meetings",
  "payments",
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
    // "payments" is rendered above, outside this switch, because the ledger
    // stands on its own fetch and never waits for the dashboard payload.
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
  // These sections fetch their own data and read nothing from the dashboard
  // aggregate, which takes seconds from the production database. Only the bell
  // number is borrowed, and that is one small read of its own.
  const needsDashboard = !["payments", "applications", "settings"].includes(section);
  const [badge, setBadge] = useState(0);
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
    if (isLoading || !isAuthenticated || !isAdmin || needsDashboard) return;
    apiGetClient<{ unread: number }>("/notifications")
      .then((page) => setBadge(page?.unread ?? 0))
      .catch(() => {});
  }, [isAuthenticated, isAdmin, isLoading, needsDashboard]);

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated || !isAdmin) {
      router.push(isAuthenticated ? "/dashboard" : `/auth/login?callbackUrl=${encodeURIComponent("/admin")}`);
      return;
    }
    if (!needsDashboard) return;

    getAdminDashboard()
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : t("admin.state.errorSection")));
  }, [isAuthenticated, isAdmin, isLoading, needsDashboard, router]);

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

  if (needsDashboard && !data) {
    return (
      <AdminShell adminName={user?.full_name} unread={0}>
        <div className={ui.pageStack}>
          <p className={ui.lede}>{t("admin.state.loadingSection", { section: copy.kicker })}</p>
        </div>
      </AdminShell>
    );
  }

  return (
    <AdminShell adminName={user?.full_name} unread={needsDashboard ? (data?.unread ?? 0) : badge}>
      <div className={ui.pageStack}>
        <header className={ui.pageHeading}>
          <div>
            <p className={ui.kicker}>{copy.kicker}</p>
            <h1>{copy.title}</h1>
            <p>{copy.lede}</p>
          </div>
        </header>
        {needsDashboard ? (
          <SectionContent section={section} data={data as AdminDashboard} onReload={reload} t={t} />
        ) : (
          <PaymentLedger />
        )}
      </div>
    </AdminShell>
  );
}
