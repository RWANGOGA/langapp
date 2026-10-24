import PortalShell, { type PortalNavItem } from "@/components/portal/PortalShell";
import type { LearnerDashboard } from "@/lib/dashboard-data";

// One navigation surface only: the sidebar. The header stays for identity,
// not for a second copy of the same links.
const NAV: PortalNavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: "dashboard" },
  { href: "/dashboard/tutors", label: "My Tutor", icon: "tutors" },
  { href: "/dashboard/progress", label: "Progress", icon: "progress" },
  { href: "/dashboard/notifications", label: "Notifications", icon: "notifications" },
];

export default function DashboardShell({ learner, children }: { learner: LearnerDashboard["learner"]; children: React.ReactNode }) {
  return (
    <PortalShell
      portalLabel="Learner portal"
      homeHref="/dashboard"
      navAriaLabel="Learner"
      nav={NAV}
      identity={{
        name: learner.name,
        meta: <>Level <b>{learner.level === "Not set" ? "not set" : learner.level}</b></>,
        avatar: learner.avatar,
      }}
      unread={learner.unread}
      notificationsHref="/dashboard/notifications"
      footer={{ href: "/", label: "Back to site" }}
    >
      {children}
    </PortalShell>
  );
}
