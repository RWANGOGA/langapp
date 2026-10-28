import {
  Banknote, Bell, BookOpen, CalendarDays, CreditCard, FileBarChart, Inbox,
  LayoutDashboard, NotebookPen, TrendingUp, UserPlus, Users, Video, Settings,
} from "lucide-react";

/**
 * Navigation icons shared by the three portal shells, referenced by name so a
 * shell can render from a server component without crossing the client
 * boundary with function values.
 */
export const ICONS = {
  dashboard: LayoutDashboard,
  applications: UserPlus,
  messages: Inbox,
  learners: Users,
  students: Users,
  tutors: Users,
  progress: TrendingUp,
  notifications: Bell,
  schedule: CalendarDays,
  classes: BookOpen,
  meetings: Video,
  payments: Banknote,
  notes: NotebookPen,
  subscriptions: CreditCard,
  reports: FileBarChart,
  settings: Settings,
};

export type PortalIcon = keyof typeof ICONS;
export type PortalNavItem = { href: string; label: string; icon: PortalIcon };

export type PortalIdentity = {
  name: string;
  /** Second line under the name: level, role, account kind. */
  meta?: React.ReactNode;
  /** Profile photo. Omit to fall back to initials. */
  avatar?: string;
  initials?: string;
};

export const initialsOf = (name: string) =>
  name.split(" ").filter(Boolean).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
