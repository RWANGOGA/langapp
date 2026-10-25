"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { getAdminDashboard, type AdminDashboard } from "@/lib/admin-data";
import AdminShell from "@/components/admin/AdminShell";
import TutorRoster from "@/components/admin/TutorRoster";
import StudentRoster from "@/components/admin/StudentRoster";
import { MeetingsPanel } from "@/components/admin/MeetingsPanel";
import { SubscriptionManagement } from "@/components/admin/SubscriptionManagement";
import { ActivityLog } from "@/components/admin/ActivityLog";
import ApplicationReview from "@/components/admin/ApplicationReview";
import ClassMonitor from "@/components/admin/ClassMonitor";
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

// What each section promises, in the same voice as the overview. Sections that
// are not wired to the backend say so in the heading rather than in a footnote.
const SECTION_COPY: Record<Section, { kicker: string; title: string; lede: string }> = {
  dashboard: {
    kicker: "Overview",
    title: "The overview lives at the front door",
    lede: "Every figure the school is running is on /admin, where the rosters, the matrix and the payment ledger sit together.",
  },
  applications: {
    kicker: "Applications",
    title: "Decide who teaches here",
    lede: "Every tutor application, from submitted to a final decision. Open a file to read its evidence, then move it forward, approve it, or reject it with a note. Nothing here changes an applicant's view of their own file.",
  },
  tutors: {
    kicker: "Tutors",
    title: "Every tutor on the books",
    lede: "Credentials on file, how many sessions each tutor is carrying, and the country their profile records.",
  },
  students: {
    kicker: "Learners",
    title: "Every learner, and who teaches them",
    lede: "Assign a tutor, move a learner between approved tutors, or return them to the awaiting pool. Every change tells the learner and both tutors.",
  },
  classes: {
    kicker: "Classes",
    title: "Every lesson, upcoming and archived",
    lede: "The live lesson book: filter by what happened, search by learner, tutor or title, and book the next lesson for any learner who already has a tutor.",
  },
  meetings: {
    kicker: "Meetings",
    title: "Where sessions run",
    lede: "The video providers your tutors are actually using in the next twenty-four hours.",
  },
  subscriptions: {
    kicker: "Subscriptions",
    title: "What learners have paid for",
    lede: "The share of orders by package, the state those orders reached, and the tutors carrying the most sessions.",
  },
  reports: {
    kicker: "Reports",
    title: "The latest activity",
    lede: "Completed lessons and confirmed payments, stamped with when they actually happened.",
  },
  settings: {
    kicker: "Settings",
    title: "Admin settings are not connected yet",
    lede: "Administration is read-only for now. Nothing on this page would change anything, so it holds no switches that do nothing.",
  },
};

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

function SectionContent({ section, data, onReload }: { section: Section; data: AdminDashboard; onReload: () => void }) {
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
    case "dashboard":
      return (
        <HonestBand label="Overview">
          <p>Choose a section from the sidebar, or open the overview that holds all of them together.</p>
          <p>
            <Link className={ui.textLink} href="/admin">Open the overview <ArrowRight size={13} aria-hidden /></Link>
          </p>
        </HonestBand>
      );
    default:
      // settings: the heading already says it is not connected.
      return (
        <HonestBand label="Nothing to show yet">
          <p>The sidebar entry stays so the product shape is visible, but there is no data behind it.</p>
        </HonestBand>
      );
  }
}

export default function AdminSectionPage() {
  const router = useRouter();
  const params = useParams<{ section: string }>();
  const { user, isAuthenticated, isLoading, isAdmin } = useAuth();
  const [data, setData] = useState<AdminDashboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const section = SECTIONS.has(params.section as Section) ? (params.section as Section) : "dashboard";
  const copy = SECTION_COPY[section];

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
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load admin data."));
  }, [isAuthenticated, isAdmin, isLoading, router]);

  if (isLoading || !isAuthenticated || !isAdmin) {
    return (
      <AdminShell adminName={user?.full_name} unread={0}>
        <div className={ui.pageStack}>
          <p className={ui.lede}>Checking your access…</p>
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
              Try again
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
          <p className={ui.lede}>Loading {copy.kicker.toLowerCase()}…</p>
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
        <SectionContent section={section} data={data} onReload={reload} />
      </div>
    </AdminShell>
  );
}
