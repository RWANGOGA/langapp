import PortalShell, { type PortalNavItem } from "@/components/portal/PortalShell";
import type { TutorDashboard } from "@/lib/tutor-data";

// One navigation surface only: the sidebar.
const NAV: PortalNavItem[] = [
  { href: "/tutor", label: "Dashboard", icon: "dashboard" },
  { href: "/tutor/learners", label: "My learners", icon: "learners" },
  { href: "/tutor/schedule", label: "Schedule", icon: "schedule" },
  { href: "/tutor/notes", label: "Lesson notes", icon: "notes" },
  { href: "/tutor/settings", label: "Settings", icon: "settings" },
];

export default function DashboardShell({ tutor, children }: { tutor: TutorDashboard["tutor"]; children: React.ReactNode }) {
  return (
    <PortalShell
      portalLabel="Tutor portal"
      homeHref="/tutor"
      navAriaLabel="Tutor"
      nav={NAV}
      identity={{ name: tutor.name, meta: tutor.role }}
      unread={tutor.unread}
      footer={{ href: "/", label: "Back to site" }}
    >
      {children}
    </PortalShell>
  );
}
