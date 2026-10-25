import PortalShell, { type PortalNavItem } from "@/components/portal/PortalShell";

// One navigation surface only: the sidebar. Sections that are not wired to
// the backend yet still get a page, so the rail never lies about the shape
// of the product.
const NAV: PortalNavItem[] = [
  { href: "/admin", label: "Overview", icon: "dashboard" },
  { href: "/admin/tutors", label: "Tutors", icon: "tutors" },
  { href: "/admin/students", label: "Students", icon: "students" },
  { href: "/admin/classes", label: "Classes", icon: "classes" },
  { href: "/admin/meetings", label: "Meetings", icon: "meetings" },
  { href: "/admin/subscriptions", label: "Subscriptions", icon: "subscriptions" },
  { href: "/admin/reports", label: "Reports", icon: "reports" },
  { href: "/admin/settings", label: "Settings", icon: "settings" },
];

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
  return (
    <PortalShell
      portalLabel="Admin"
      homeHref="/admin"
      navAriaLabel="Admin sections"
      nav={NAV}
      identity={{ name: adminName || "Administrator", meta: "Administration" }}
      unread={unread}
      footer={{ href: "/", label: "Back to site" }}
    >
      {children}
    </PortalShell>
  );
}
